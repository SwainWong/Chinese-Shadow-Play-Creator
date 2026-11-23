"""Check the two screen compositions, the installed-player controls and the encoded film."""
from pathlib import Path
from io import BytesIO
import base64,hashlib,json,subprocess,wave
from urllib.parse import urlsplit,unquote
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
def cmd(*args):return subprocess.check_output(list(map(str,args)))
def screen_review(page):
    return page.evaluate("""() => {
      const surface=()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;return c.getContext('2d',{willReadFrequently:true});};
      const obs=surface(),man=surface(),staticCtx=surface();
      const onlyStatic=Object.fromEntries(Object.keys(allLayers).map(k=>[k,['far','near','hall','building','floor'].includes(k)]));
      const out=[];
      for(const [id,s] of studies.entries()){
        let maxOverlap=0,rootDifference=0,maxPetalChange=0,minHeight=1000,maxHeight=0;
        const box=[s.actorX-190,350,380,256];
        let root0,petal0,still0;
        for(let f=0;f<120;f++){
          const t=f/24;obs.clearRect(0,0,1280,720);man.clearRect(0,0,1280,720);
          if(s.hall)drawPlate(obs,'hall',s.hall);
          drawPlate(obs,s.building.id,s.building);peony(obs,s.flower,t,s.gust);grass(obs,s.grass,5.8*gust(t,s.gust+.17));
          if(id===1)bell(obs,s.building,t,s.gust);
          man.save();man.translate(s.actorX,603);man.scale(s.actorScale,s.actorScale);
          man.translate(-moves[s.move].x,-560);drawMove(man,s.move,Math.min(3.958,t*.82));man.restore();
          const m=man.getImageData(...box).data,o=obs.getImageData(...box).data;
          let overlap=0,first=999,last=-1;
          for(let i=3;i<m.length;i+=4)if(m[i]>100){if(o[i]>100)overlap++;const y=Math.floor(((i-3)/4)/box[2]);first=Math.min(first,y);last=Math.max(last,y);}
          minHeight=Math.min(minHeight,last-first+1);maxHeight=Math.max(maxHeight,last-first+1);
          maxOverlap=Math.max(maxOverlap,overlap);
          const x=Math.round(s.flower.x-s.flower.width*.5),width=Math.ceil(s.flower.width),base=obs.getImageData(x,591,width,13).data;
          const blossom=obs.getImageData(x,Math.round(s.flower.y-s.flower.width*.86),width,65).data;
          if(!f){root0=base;petal0=blossom;}
          let dc=0,dp=0;
          for(let j=0;j<base.length;j++)if(base[j]!==root0[j])dc++;
          for(let j=0;j<blossom.length;j++)if(blossom[j]!==petal0[j])dp++;
          rootDifference=Math.max(rootDifference,dc);maxPetalChange=Math.max(maxPetalChange,dp);
          if([0,47,119].includes(f)){
            filmFrame(staticCtx,id,f,onlyStatic);const snapshot=staticCtx.canvas.toDataURL();
            if(!f)still0=snapshot;else if(snapshot!==still0)throw Error(s.name+' building/hills moved');
          }
        }
        out.push({name:s.name,maxActorSceneryOverlapPixels:maxOverlap,maxRootChannelChanges:rootDifference,maxFlowerChannelChanges:maxPetalChange,
          actorAndStaffVisibleHeightRange:[minHeight,maxHeight]});
      }
      return out;
    }""")
def stage_frame(src,n):
    raw=cmd('ffmpeg','-v','error','-i',src,'-vf',f'select=eq(n\\,{n})','-frames:v','1','-f','image2pipe','-c:v','png','pipe:1')
    return np.array(Image.open(BytesIO(raw)).convert('RGB'),dtype=float)
with sync_playwright() as pw:
    b=pw.chromium.launch(channel='chrome',args=['--allow-file-access-from-files','--disable-accelerated-2d-canvas'])
    pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    pg.route('http://theatre.test/**',lambda r:r.fulfill(path=root/unquote(urlsplit(r.request.url).path.lstrip('/'))))
    pg.goto('http://theatre.test/index.html');pg.evaluate('()=>studioReady')
    scenes=screen_review(pg)
    for i,row in enumerate(scenes):
        print(row,flush=True)
        assert row['maxActorSceneryOverlapPixels']==0 and row['maxRootChannelChanges']==0 and row['maxFlowerChannelChanges']>50
        for f in [0,39,83,119]:
            url=pg.evaluate('([i,f])=>{filmFrame(ctx,i,f);return screen.toDataURL().split(",")[1]}',[i,f])
            a=np.array(Image.open(BytesIO(base64.b64decode(url))).convert('RGB'),dtype=float)
            encoded=stage_frame(root/'scenery.mp4',i*120+f)
            rms=round(np.sqrt(np.mean((a-encoded)**2)),3);row.setdefault('canvasToMasterRgbRms',[]).append(rms);assert rms<9
    for box in pg.locator('fieldset input').all():
        box.uncheck();box.check()
    pg.select_option('#shot','1');pg.click('#next');pg.click('#play');pg.wait_for_timeout(320);pg.click('#play')
    assert pg.evaluate('track.currentTime')>.10 and not errors
for name,x,y in [('house',308,244),('temple',352,315)]:
    im=Image.open(root/'art'/f'{name}.webp');assert im.mode=='RGBA' and im.getpixel((x,y))[3]==0
media={}
for name,count in [('clips/house.mp4',120),('clips/temple.mp4',120),('scenery.mp4',240)]:
    movie=root/name
    streams=json.loads(cmd('ffprobe','-v','error','-of','json','-show_streams',movie))['streams']
    v,a=streams[:2];assert (v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))==(1280,720,'24/1',count)
    assert a['codec_name']=='aac' and int(a['sample_rate'])==48000 and abs(float(a['duration'])-count/24)<.025
    cmd('ffmpeg','-v','error','-i',movie,'-f','null','-')
    media[name]={'frames':count,'sha256':hashlib.sha256(movie.read_bytes()).hexdigest()}
(root/'review/check.json').write_text(json.dumps({'scenes':scenes,'media':media},ensure_ascii=False,indent=2)+'\n')
cmd('ffmpeg','-v','error','-y','-i',root/'scenery.mp4','-vf',"select='eq(n,54)+eq(n,174)',scale=960:540,tile=1x2",'-frames:v','1',root/'review/scenes.jpg')
