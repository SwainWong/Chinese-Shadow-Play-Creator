#!/usr/bin/env python3
"""Build a film from independent, editable shadow-puppetry shots."""
import argparse
import base64
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import wave

import render


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


class EditorData(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.current = None
        self.chunks = {}

    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            key = dict(attrs).get('id')
            if key in ('project-data', 'media-data'):
                self.current = key
                self.chunks[key] = []

    def handle_data(self, data):
        if self.current:
            self.chunks[self.current].append(data)

    def handle_endtag(self, tag):
        if tag == 'script':
            self.current = None

    def read(self, key):
        if key not in self.chunks:
            raise ValueError('Expected a self-contained shadow-puppetry editor project')
        return json.loads(''.join(self.chunks[key]))


def inputs(source, stage):
    if source.suffix.lower() == '.html':
        if stage:
            raise ValueError('HTML editor projects already contain their stage')
        return {'editor': digest(source)}
    if source.suffix.lower() != '.json':
        raise ValueError('Shot source must be a story JSON or a portable editor HTML')
    story = json.loads(source.read_text())
    render.check(story, source.parent)
    master = render.ROOT / 'assets'
    files = {'story': source, 'stage': stage or master/'stage.js', 'rigs': master/'rigs.json',
             'player': master/'player.html', 'scenery': master/'scenery.webp'}
    for s in story['scenes']:
        for a in s['actors']:
            if a['role'] in render.ROLES:
                files['role/'+a['role']] = master/(a['role']+'.webp')
        if 'audio' in s:
            files['audio/'+s['audio']] = source.parent/s['audio']
    for key, file in story.get('images', {}).items():
        files['image/'+key] = source.parent/file
    return {k: digest(p) for k,p in files.items()}


def render_editor(source, project, fps, size, chrome):
    html = source.read_text()
    parser = EditorData()
    parser.feed(html)
    document = parser.read('project-data')
    media = parser.read('media-data')
    duration = document['scene']['duration']
    prefix = 'data:audio/wav;base64,'
    if document.get('version') != 1 or not media['wav'].startswith(prefix):
        raise ValueError('Unsupported shadow editor version or soundtrack')
    width, height = size.split('x')
    html, count = re.subn(r'<canvas\b[^>]*>', f'<canvas width="{width}" height="{height}">',
                          html, count=1, flags=re.I)
    if not count:
        raise ValueError('Editor project must contain a stage canvas')
    project.mkdir()
    (project/'index.html').write_text(html)
    (project/'sound.wav').write_bytes(base64.b64decode(media['wav'][len(prefix):], validate=True))
    render.encode(project, fps, round(duration*fps), chrome)


def verify(folder):
    meta = json.loads((folder/'meta.json').read_text())
    for file in ('video.mp4','sound.wav'):
        if digest(folder/file) != meta['sha256'][file]:
            raise ValueError(f'Cache integrity check failed: {folder/file}')
    return meta


def build_shot(source, stage, cache, fps, size, chrome):
    with tempfile.TemporaryDirectory(dir=cache.parent, prefix='.shot-') as temp:
        work = Path(temp)
        project = work/'render'
        if source.suffix.lower() == '.html':
            render_editor(source, project, fps, size, chrome)
        else:
            render.make(argparse.Namespace(story=source, out=project, size=size, fps=fps,
                                           chrome=chrome, stage_js=stage))
        result = work/'result'
        result.mkdir()
        # The cached MP4 has only a video track. AAC encoder priming from many short
        # independent encodes would otherwise add silence or shift cut boundaries.
        render.run(['ffmpeg','-v','error','-i',str(project/'film.mp4'),'-map','0:v:0',
                    '-c:v','copy',str(result/'video.mp4')])
        shutil.move(str(project/'sound.wav'), result/'sound.wav')
        stream = json.loads(render.run(['ffprobe','-v','error','-select_streams','v:0',
                            '-show_entries','stream=nb_frames','-of','json',str(result/'video.mp4')]).stdout)
        frames = int(stream['streams'][0]['nb_frames'])
        with wave.open(str(result/'sound.wav'),'rb') as audio:
            if (audio.getnchannels(),audio.getsampwidth(),audio.getframerate()) != (1,2,render.RATE):
                raise ValueError('Expected mono 48 kHz 16-bit project soundtrack')
            if audio.getnframes()*fps != frames*render.RATE:
                raise ValueError(f'Shot video/audio duration mismatch: {source}')
        meta = {'frames':frames, 'sha256':{f:digest(result/f) for f in ('video.mp4','sound.wav')}}
        (result/'meta.json').write_text(json.dumps(meta))
        try:
            result.rename(cache)
        except OSError:
            if not cache.is_dir():
                raise
            return verify(cache)
        return meta


def join(shots, cache, build, fps):
    # Relative symlinks are unnecessary here. Numeric aliases allow arbitrary original
    # filenames (including spaces and quotes) without ever interpolating a concat path.
    with tempfile.TemporaryDirectory(dir=build) as temp:
        work = Path(temp)
        listing = []
        with wave.open(str(work/'sound.wav'),'wb') as target:
            target.setparams((1,2,render.RATE,0,'NONE','not compressed'))
            for idx, shot in enumerate(shots):
                entry = cache/shot['cache_key']
                filename = f'shot-{idx:05}.mp4'
                (work/filename).symlink_to(entry/'video.mp4')
                listing.extend([f"file '{filename}'",f"duration {shot['frames']/fps:.12f}"])
                with wave.open(str(entry/'sound.wav'),'rb') as track:
                    for data in iter(lambda:track.readframes(65536),b''):
                        target.writeframesraw(data)
        (work/'concat.txt').write_text('\n'.join(listing)+'\n')
        render.run(['ffmpeg','-v','error','-f','concat','-safe','1','-i',str(work/'concat.txt'),
                    '-i',str(work/'sound.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy',
                    '-c:a','aac','-b:a','160k','-movflags','+faststart',str(build/'film.mp4')])


def assemble(args):
    manifest = args.film.resolve()
    spec = json.loads(manifest.read_text())
    ids = [row['id'] for row in spec['shots']]
    if not ids or not all(isinstance(i,str) and i.strip() for i in ids) or len(set(ids)) != len(ids):
        raise ValueError('Each shot needs a unique nonempty string id')
    size = spec.get('size','1920x1080')
    fps = spec.get('fps',24)
    if size not in ('640x360','1280x720','1920x1080') or fps not in (12,24,25,30):
        raise ValueError('Unsupported film size or frame rate')
    out = args.out.resolve()
    if out.exists():
        raise ValueError(f'Use a new output directory: {out}')
    cache = (args.cache or manifest.parent/'.shadow-cache').resolve()
    cache.mkdir(parents=True,exist_ok=True)
    out.parent.mkdir(parents=True,exist_ok=True)
    chrome = args.chrome or os.getenv('CHROME_PATH') or shutil.which('google-chrome')
    mac = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    if not chrome and mac.is_file():
        chrome = str(mac)
    if not chrome:
        with render.sync_playwright() as pw:
            chrome = pw.chromium.executable_path
    config = {'size':size,'fps':fps,'render':digest(Path(render.__file__)),
              'assemble':digest(Path(__file__)),'browser':render.run([chrome,'--version']).stdout.decode().strip(),
              'ffmpeg':render.run(['ffmpeg','-version']).stdout.decode().splitlines()[0]}
    shots = []
    start = 0
    for row in spec['shots']:
        source = manifest.parent/row['source']
        stage = manifest.parent/row['stage'] if row.get('stage') else None
        payload = [config,inputs(source,stage)]
        key = hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()
        entry = cache/key
        hit = entry.is_dir()
        meta = verify(entry) if hit else build_shot(source,stage,entry,fps,size,chrome)
        state = 'reused' if hit else 'rendered'
        print(f"{row['id']}: {state}",flush=True)
        shots.append(dict(id=row['id'],source=row['source'],status=state,cache_key=key,
                          start_frame=start,**meta))
        start += meta['frames']
    with tempfile.TemporaryDirectory(dir=out.parent,prefix='.film-') as temp:
        build=Path(temp)/'output'
        build.mkdir()
        join(shots,cache,build,fps)
        report=dict(title=spec.get('title',''),fps=fps,size=size,frames=start,shots=shots)
        (build/'build.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        build.rename(out)
    print(out/'film.mp4')


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('film',type=Path)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--cache',type=Path)
    p.add_argument('--chrome')
    try:
        assemble(p.parse_args())
    except subprocess.CalledProcessError as e:
        sys.exit((e.stderr or b'').decode(errors='replace') or str(e))
    except (ValueError,KeyError,OSError) as e:
        sys.exit(str(e))
