#!/usr/bin/env python3
"""Build an editable, offline HTML shadow play and a frame-accurate narrated MP4."""
import argparse
import base64
import json
import math
import mimetypes
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from urllib.parse import unquote, urlsplit

import numpy as np
from playwright.sync_api import sync_playwright

RATE = 48000
ROOT = Path(__file__).resolve().parent.parent
ROLES = ('monkey', 'elder', 'pilgrim', 'bear')
SETS = ('plain', 'pass', 'hall', 'temple')
MOVES = ('walk', 'speak', 'listen', 'lift', 'offer', 'bow')
SOUNDS = ('wood', 'gong', 'pluck')


def run(args):
    return subprocess.run(args, check=True, capture_output=True)


def decode(path):
    pcm = run(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ar', str(RATE),
               '-ac', '1', '-f', 'f32le', 'pipe:1']).stdout
    a = np.frombuffer(pcm, dtype='<f4')
    if not len(a):
        raise ValueError(f'No audio in {path}')
    return a


def chunks(line):
    # Preserve the source text. Prefer punctuation and bound long unpunctuated captions.
    pieces = re.findall(r'[^。！？!?；;，、,：:\n]+[。！？!?；;，、,：:]*|[。！？!?；;，、,：:]+', line)
    result = []
    for phrase in pieces:
        phrase = phrase.strip()
        while phrase:
            limit = 58 if phrase.isascii() else 28
            cut = len(phrase)
            if cut > limit:
                space = phrase.rfind(' ', 0, limit+1)
                cut = space if space > limit//2 else limit
            result.append(phrase[:cut].strip())
            phrase = phrase[cut:].strip()
    return result


def check(story, base):
    if not isinstance(story.get('title'), str) or not story['title'].strip():
        raise ValueError('title must contain text')
    if not isinstance(story.get('scenes'), list) or not story['scenes']:
        raise ValueError('scenes must be a nonempty list')
    extra = story.get('images', {})
    reserved = {*ROLES, *SETS, 'lantern', 'fan', 'scenery','__proto__','constructor','prototype'}
    if any(key not in extra for key in story.get('embeddedImages', [])):
        raise ValueError('Each embeddedImages entry must reference an image in images')
    for name, file in extra.items():
        if not re.fullmatch(r'[a-z][a-z0-9_-]*', name) or name in reserved:
            raise ValueError(f'Choose a distinct image id: {name}')
        if not (base/file).is_file():
            raise ValueError(f'Missing image: {file}')
    roles = {*ROLES}
    for name, rig in story.get('rigs', {}).items():
        if name not in extra:
            raise ValueError(f'Provide an image atlas for {name}')
        for k,n in [('neck',1),('collar',1),('shoulders',2),('hips',2),('upper',2),('fore',1),('thigh',2),('shin',1)]:
            pairs = [rig[k]] if n==1 else rig[k]
            if len(pairs)!=n or any(len(p)!=2 or any(not isinstance(v,(float,int)) or not 0<=v<=512 for v in p) for p in pairs):
                raise ValueError(f'Invalid {name} pivot: {k}')
        roles.add(name)
    for i,s in enumerate(story['scenes'],1):
        if 'duration' in s:
            duration=s['duration']
            if not isinstance(duration,(float,int)) or not math.isfinite(duration) or duration<0.1:
                raise ValueError(f'Scene {i} needs a positive duration of at least 0.1 seconds')
            if s.get('line') or s.get('audio') or s.get('speaker'):
                raise ValueError(f'Scene {i}: duration is for unvoiced stage action')
        elif not isinstance(s.get('line'),str) or not s['line'].strip():
            raise ValueError(f'Scene {i} needs spoken text or an action duration')
        if s.get('set','plain') not in {*SETS,*extra} or s.get('light','amber') not in ('amber','dusk','jade'):
            raise ValueError(f'Scene {i} has unknown scenery or lighting')
        if not isinstance(s.get('actors'),list):
            raise ValueError(f'Scene {i} needs an actors list')
        for a in s['actors']:
            if a.get('role') not in roles or a.get('move','speak') not in MOVES:
                raise ValueError(f'Scene {i} has unknown actor or movement')
            if a.get('face','right') not in ('left','right') or a.get('prop') not in {None,'lantern','fan',*extra}:
                raise ValueError(f'Scene {i} has invalid facing or prop')
            if 'unfold' in a and (not isinstance(a['unfold'],bool) or a.get('prop')!='fan'):
                raise ValueError(f'Scene {i}: unfold requires a fan')
            for k,lo,hi,default in [('x',-.5,1.5,None),('to',-.5,1.5,a.get('x')),('scale',.15,2,1),('ground',0,720,575)]:
                v = a.get(k,default)
                if not isinstance(v,(float,int)) or not lo<=v<=hi:
                    raise ValueError(f'Scene {i} invalid actor coordinate {k}: {v}')
        if s.get('speaker') and s['speaker'] not in [a['role'] for a in s['actors']]:
            raise ValueError(f'Scene {i} needs the speaking character on stage')
        if 'camera' in s:
            c=s['camera']
            if not (0<=c['x']<=1 and 0<=c['y']<=1 and 1<=c['zoom']<=2 and 1<=c.get('endZoom',c['zoom'])<=2):
                raise ValueError(f'Scene {i} invalid camera')
        if 'pass' in s:
            item=s['pass']; cast=[a['role'] for a in s['actors']]
            if (item['from']==item['to'] or any(cast.count(item[k])!=1 for k in ('from','to'))
                or item['prop'] not in {'fan','lantern',*extra} or not (0<=item['x']<=1 and 0<=item['y']<=720)):
                raise ValueError(f'Scene {i} invalid prop handoff')
        for sound in s.get('sounds',[]):
            if sound['kind'] not in SOUNDS or not 0 <= sound['at'] < 1:
                raise ValueError(f'Scene {i} invalid sound cue')
        if 'audio' in s and not (base/s['audio']).is_file():
            raise ValueError(f'Missing recording: {s["audio"]}')


def percussion(kind, n):
    t = np.arange(n)/RATE
    if kind=='wood':
        return .15*np.exp(-32*t)*(np.sin(2*np.pi*820*t)+.42*np.sin(2*np.pi*1325*t))
    if kind=='gong':
        return .06*(1-np.exp(-85*t))*np.exp(-3.4*t)*sum(
            gain*np.sin(2*np.pi*freq*t) for freq,gain in [(176,1),(239,.44),(363,.58),(518,.19),(735,.10)])
    return .085*(1-np.exp(-160*t))*np.exp(-3.9*t)*sum(
        np.sin(2*np.pi*293.66*(i+1)*t)/(i+1)**1.4 for i in range(6))


def align(line, length, fps, start):
    phrases=chunks(line)
    weights=[max(1,len(c.strip())) for c in phrases]
    positions=np.cumsum([0,*weights])/sum(weights)
    return [{'text':p,'start':start+round(positions[i]*length*fps),
             'end':start+round(positions[i+1]*length*fps)} for i,p in enumerate(phrases)]


def speech_for(scene, base, voice, rate, tmp):
    if scene.get('audio'):
        return decode(base/scene['audio'])
    if not shutil.which('say'):
        raise ValueError('Supply scene.audio or use macOS with the requested say voice installed')
    (tmp/'line.txt').write_text(scene['line'])
    run(['say','-v',scene.get('voice',voice),'-r',str(rate),'-f',str(tmp/'line.txt'),'-o',str(tmp/'line.aiff')])
    a=decode(tmp/'line.aiff')
    # Remove silence inserted by the synthesizer. Keep original recordings intact.
    audible=np.flatnonzero(np.abs(a)>.004)
    if not len(audible):
        raise ValueError('Speech synthesis produced silence')
    return a[max(0,audible[0]-960):min(len(a),audible[-1]+2400)]


def score(story, base, build, fps):
    sample_step=RATE//fps
    scenes=[]; frame=0
    with tempfile.TemporaryDirectory(dir=build) as scratch, wave.open(str(build/'sound.wav'),'wb') as wav:
        wav.setparams((1,2,RATE,0,'NONE','not compressed'))
        for s in story['scenes']:
            if 'duration' in s:
                length=round(s['duration']*fps)
                track=np.zeros(length*sample_step,dtype=np.float32)
                cues=[]
            else:
                a=speech_for(s,base,story.get('voice','Tingting'),story.get('rate',174),Path(scratch))
                if not np.any(np.abs(a)>.0005):
                    raise ValueError('Scene audio has no audible signal')
                lead=round(fps*(.40 if frame==0 else .18))
                length=lead+math.ceil(len(a)/sample_step)+round(.48*fps)
                track=np.zeros(length*sample_step,dtype=np.float32)
                track[lead*sample_step:lead*sample_step+len(a)]=a*(.76/max(.40,float(np.abs(a).max())))
                cues=align(s['line'],len(a)/RATE,fps,frame+lead)
            rms=np.sqrt(np.mean(track.reshape(-1,sample_step)**2,axis=1))
            env=np.minimum(1,rms/max(.035,float(np.percentile(rms,92))))
            levels=np.convolve(np.pad(env,(1,1)),[.22,.56,.22],mode='valid').round(3).tolist()
            for cue in s.get('sounds',[]):
                offset=int(len(track)*cue['at']); n=min(len(track)-offset,int(1.35*RATE))
                track[offset:offset+n]+=percussion(cue['kind'],n)
            wav.writeframes((np.clip(track,-.98,.98)*32767).astype('<i2').tobytes())
            scenes.append({**s,'start':frame,'end':frame+length,'cues':cues,'levels':levels})
            frame+=length
    return scenes,frame


def stamp(frame,fps):
    ms=round(frame*1000/fps)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'


def encode(build, fps, frames, chrome):
    with sync_playwright() as pw:
        opts={'executable_path':chrome} if chrome else {}
        browser=pw.chromium.launch(**opts)
        try:
            page=browser.new_page()
            # Give local assets one browser origin, without starting a network server.
            def local_asset(route):
                target=(build/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
                if target.is_relative_to(build) and target.is_file():
                    route.fulfill(path=target)
                else:
                    route.fulfill(status=404,body='Missing local asset')
            page.route('http://stage.test/**',local_asset)
            page.goto('http://stage.test/index.html')
            page.evaluate('window.ready')
            # Catch unreachable handoffs before encoding a long show.
            misses=page.evaluate('''() => DATA.scenes.flatMap((s,i)=>{
              if(!s.pass)return [];
              const t=Math.ceil((s.start+s.end)/2)/DATA.fps;draw(t);
              const hand=id=>grips[s.actors.findIndex(a=>a.role===id)];
              const a=hand(s.pass.from), b=hand(s.pass.to), gap=Math.hypot(a[0]-b[0],a[1]-b[1]);
              return gap>8?[{scene:i+1,gap:Math.round(gap)}]:[];
            })''')
            if misses:
                raise ValueError(f'Handoff out of reach in stage pixels: {misses}. Move the actors closer or adjust pass.x/y.')
            cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate',str(fps),
                 '-c:v','mjpeg','-i','pipe:0','-i',str(build/'sound.wav'),'-c:v','libx264','-preset','fast',
                 '-crf','17','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',str(build/'film.mp4')]
            with subprocess.Popen(cmd,stdin=subprocess.PIPE) as encoder:
                try:
                    for i in range(frames):
                        data=page.evaluate("""t=>{draw(t);return document.querySelector('canvas').toDataURL('image/jpeg',.96).split(',')[1]}""",i/fps)
                        encoder.stdin.write(base64.b64decode(data))
                finally:
                    encoder.stdin.close()
                if encoder.wait():
                    raise RuntimeError('ffmpeg could not encode film.mp4')
        finally:
            browser.close()


def make(args):
    base=args.story.resolve().parent
    story=json.loads(args.story.read_text())
    check(story,base)
    out=args.out.resolve()
    if out.exists() and any(out.iterdir()):
        raise ValueError(f'Use a new or empty output directory: {out}')
    out.parent.mkdir(parents=True,exist_ok=True)
    master=ROOT/'assets'
    width,height=map(int,args.size.split('x'))
    with tempfile.TemporaryDirectory(dir=out.parent,prefix='.shadow-') as temp:
        build=Path(temp)/'project'; build.mkdir()
        pics=build/'assets';pics.mkdir()
        files={'scenery':'scenery.webp'}
        roles={a['role'] for s in story['scenes'] for a in s['actors']}
        files.update({k:k+'.webp' for k in ROLES if k in roles})
        for file in files.values():shutil.copy2(master/file,pics/file)
        for k,file in story.get('images',{}).items():
            target=k+Path(file).suffix.lower()
            shutil.copy2(base/file,pics/target);files[k]=target
        scenes,frames=score(story,base,build,args.fps)
        project=json.loads(json.dumps(story))
        if project.get('images'):project['images']={k:'assets/'+files[k] for k in project['images']}
        for i,s in enumerate(project['scenes']):
            if 'audio' in s:
                dest='voice-'+str(i+1)+Path(s['audio']).suffix
                shutil.copy2(base/s['audio'],pics/dest);s['audio']='assets/'+dest
        (build/'story.json').write_text(json.dumps(project,ensure_ascii=False,indent=2)+'\n')
        rigs={**json.loads((master/'rigs.json').read_text()),**story.get('rigs',{})}
        data={'title':story['title'],'builtin':list(ROLES),'fps':args.fps,'frames':frames,'scenes':scenes,'images':{k:'assets/'+v for k,v in files.items()}}
        # WebGL textures in local file previews require a same-origin pixel source.
        for key in story.get('embeddedImages',[]):
            path=pics/files[key]
            mime=mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
            data['images'][key]=f'data:{mime};base64,'+base64.b64encode(path.read_bytes()).decode('ascii')
        (build/'timeline.js').write_text('const RIGS='+json.dumps(rigs)+';\nconst DATA='+json.dumps(data,ensure_ascii=False)+';\n')
        (build/'index.html').write_text((master/'player.html').read_text().replace('__WIDTH__',str(width)).replace('__HEIGHT__',str(height)))
        shutil.copy2(args.stage_js or master/'stage.js',build/'stage.js')
        cues=[c for scene in scenes for c in scene['cues'] if c['end']>c['start']]
        (build/'captions.srt').write_text('\n'.join(f"{i}\n{stamp(c['start'],args.fps)} --> {stamp(c['end'],args.fps)}\n{c['text']}\n" for i,c in enumerate(cues,1)))
        chrome=args.chrome or os.getenv('CHROME_PATH') or shutil.which('google-chrome')
        mac=Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        if not chrome and mac.is_file():chrome=str(mac)
        encode(build,args.fps,frames,chrome)
        if out.exists():out.rmdir()
        build.rename(out)
    print(f'{out}/film.mp4  {width}x{height}  {frames} frames @ {args.fps} fps  {frames/args.fps:.2f}s')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('story',type=Path);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--size',choices=['640x360','1280x720','1920x1080'],default='1280x720')
    p.add_argument('--fps',type=int,choices=[12,24,25,30],default=24)
    p.add_argument('--chrome');p.add_argument('--stage-js',type=Path,help='Use a project-specific stage.js')
    try:make(p.parse_args())
    except subprocess.CalledProcessError as e:
        sys.exit((e.stderr or b'').decode(errors='replace') or str(e))
    except (ValueError,KeyError,OSError) as e:sys.exit(str(e))
