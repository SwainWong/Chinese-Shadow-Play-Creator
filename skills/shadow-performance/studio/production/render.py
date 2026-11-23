"""Export the selected four-second shots, then assemble a chaptered film from the current shots."""
import argparse
import base64
import subprocess
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT/'deliverables'
CLIPS = OUTPUT/'clips'
FPS = 24
FRAMES = 96

def run(*args):
    subprocess.run(['ffmpeg','-v','error','-y',*map(str,args)],check=True)

def render(pg, number):
    with tempfile.TemporaryDirectory(dir=CLIPS) as temp:
        video = Path(temp)/'shot.mp4'
        command = ['ffmpeg','-loglevel','error','-y','-f','image2pipe','-framerate','24','-c:v','mjpeg','-i','pipe:0',
                   '-i',str(ROOT/'assets/audio'/f'{number:02}.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264',
                   '-pix_fmt','yuv420p','-preset','veryfast','-crf','16','-c:a','aac','-b:a','192k','-movflags','+faststart',str(video)]
        with subprocess.Popen(command,stdin=subprocess.PIPE) as proc:
            for start in range(0,FRAMES,8):
                frames=pg.evaluate("""([i,n])=>Array.from({length:8},(_,k)=>{
                  drawFrame(i,n+k);return canvas.toDataURL('image/jpeg',.96).split(',')[1];})""",[number-1,start])
                for frame in frames:
                    proc.stdin.write(base64.b64decode(frame))
            proc.stdin.close()
            if proc.wait():
                raise RuntimeError(f'Could not encode shot {number}')
        video.replace(CLIPS/f'{number:02}.mp4')
        print('已出第',number,'式',flush=True)

def assemble(names):
    missing=[n for n in range(1,len(names)+1) if not (CLIPS/f'{n:02}.mp4').is_file()]
    if missing:
        print('未合片，待渲染',missing);return
    with tempfile.TemporaryDirectory(dir=OUTPUT) as temp:
        temp=Path(temp)
        chapters=[';FFMETADATA1','title=大圣试棒']
        for i,name in enumerate(names):
            chapters.extend(['[CHAPTER]','TIMEBASE=1/1000',f'START={4000*i}',f'END={4000*(i+1)}',f'title={name}'])
            run('-i',CLIPS/f'{i+1:02}.mp4','-map','0:v:0','-c','copy',temp/f'{i+1:02}.mp4')
        (temp/'chapters.txt').write_text('\n'.join(chapters)+'\n')
        (temp/'shots.txt').write_text(''.join(f"file '{i+1:02}.mp4'\n" for i in range(len(names))))
        # Relative symlinks keep concat manifest entries portable and independent of path punctuation.
        for i in range(len(names)):
            (temp/f'{i+1:02}.wav').symlink_to(ROOT/'assets/audio'/f'{i+1:02}.wav')
        (temp/'sound.txt').write_text(''.join(f"file '{i+1:02}.wav'\n" for i in range(len(names))))
        run('-f','concat','-safe','0','-i',temp/'shots.txt','-f','concat','-safe','0','-i',temp/'sound.txt',
            '-i',temp/'chapters.txt','-map','0:v:0','-map','1:a:0','-map_metadata','2','-map_chapters','2',
            '-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',temp/'film.mp4')
        (temp/'film.mp4').replace(OUTPUT/'dasheng-shibang.mp4')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('shots',nargs='*',type=int,help='1–15；不指定时渲染全片')
    parser.add_argument('--assemble',action='store_true',help='只拼接已经导出的十五式')
    args=parser.parse_args()
    CLIPS.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as api:
        b=api.chromium.launch(channel='chrome',args=['--allow-file-access-from-files','--disable-accelerated-2d-canvas'])
        pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
        pg.goto((ROOT/'index.html').as_uri());pg.evaluate('()=>playerReady')
        names=pg.evaluate('()=>moves.map(m=>m.name)')
        if not args.assemble:
            numbers=list(dict.fromkeys(args.shots or range(1,len(names)+1)))
            if any(i<1 or i>len(names) for i in numbers):parser.error('式号超出范围。')
            for number in numbers:render(pg,number)
        if errors:raise RuntimeError(errors)
        assemble(names)
