const el=id=>document.getElementById(id),screen=document.querySelector('canvas'),ctx=screen.getContext('2d');
const track=document.querySelector('audio'), visible={...allLayers};
let frame=0,shot=0,raf=0;
function paint(f){frame=Math.max(0,Math.min(119,f|0));filmFrame(ctx,shot,frame,visible);el('time').value=frame;el('clock').value=frame+' / 119 帧';}
function pause(){track.pause();cancelAnimationFrame(raf);el('play').textContent='播放';}
function step(f){pause();paint(f);track.currentTime=frame/fps;}
async function play(){
  if(frame===119)step(0);
  await track.play();el('play').textContent='暂停';
  function tick(){paint(Math.floor(track.currentTime*fps));if(!track.paused)raf=requestAnimationFrame(tick);}
  tick();
}
function select(i){pause();shot=i;el('shot').value=i;track.src='art/'+(i?'temple':'house')+'.wav';paint(0);}
window.studioReady=ready.then(()=>{
  for(const [key,name] of Object.entries(layerList)){
    const wrap=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.checked=true;
    box.onchange=()=>{visible[key]=box.checked;paint(frame);};wrap.append(box,name);el('layers').append(wrap);
  }
  select(0);el('shot').onchange=e=>select(Number(e.target.value));
  el('time').oninput=e=>step(+e.target.value);el('play').onclick=()=>track.paused?play():pause();
  el('prev').onclick=()=>step(frame-1);el('next').onclick=()=>step(frame+1);
  track.onended=()=>{pause();paint(119);};
});
