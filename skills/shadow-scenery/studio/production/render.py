"""Render one five-second scene or both, then assemble the current scenes."""
import argparse,base64,subprocess,tempfile,wave
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
names=['house','temple']
def ff(args):
    subprocess.run(['ffmpeg','-v','error','-y',*map(str,args)],check=True)
def render(pg,n):
    name=names[n];dest=root/'clips'/(name+'.mp4')
    with tempfile.TemporaryDirectory(dir=dest.parent) as d:
        out=Path(d)/'film.mp4'
        args=['ffmpeg','-v','error','-y','-f','image2pipe','-c:v','mjpeg','-framerate','24','-i','pipe:0',
              '-i',str(root/'art'/(name+'.wav')),'-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',str(out)]
        with subprocess.Popen(args,stdin=subprocess.PIPE) as proc:
            for start in range(0,120,8):
                frames=pg.evaluate('([n,start])=>Array.from({length:8},(_,i)=>{filmFrame(ctx,n,start+i); return screen.toDataURL("image/jpeg",.97).split(",")[1]})',[n,start])
                for f in frames:proc.stdin.write(base64.b64decode(f))
            proc.stdin.close()
            if proc.wait():raise RuntimeError('Failed to export '+name)
        out.replace(dest)
def assemble():
    if not all((root/'clips'/f'{n}.mp4').exists() for n in names):return
    with tempfile.TemporaryDirectory(dir=root) as d:
        tmp=Path(d)
        for n in names:ff(['-i',root/'clips'/f'{n}.mp4','-map','0:v:0','-c:v','copy',tmp/f'{n}.mp4'])
        (tmp/'list.txt').write_text("file 'house.mp4'\nfile 'temple.mp4'\n")
        with wave.open(str(tmp/'all.wav'),'wb') as w:
            for i,n in enumerate(names):
                with wave.open(str(root/'art'/f'{n}.wav'),'rb') as src:
                    if not i:w.setparams(src.getparams())
                    w.writeframes(src.readframes(src.getnframes()))
        ff(['-f','concat','-safe','0','-i',tmp/'list.txt','-i',tmp/'all.wav','-c:v','copy','-c:a','aac','-b:a','160k','-movflags','+faststart',tmp/'movie.mp4'])
        (tmp/'movie.mp4').replace(root/'scenery.mp4')
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('name',choices=names+['all'],nargs='?',default='all');args=parser.parse_args()
    with sync_playwright() as pw:
        b=pw.chromium.launch(channel='chrome',args=['--allow-file-access-from-files','--disable-accelerated-2d-canvas'])
        pg=b.new_page();pg.goto((root/'index.html').as_uri());pg.evaluate('()=>studioReady')
        for n,name in enumerate(names):
            if args.name in ('all',name):render(pg,n)
    assemble()
