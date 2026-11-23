const audio=document.querySelector('audio'),nav=document.querySelector('nav');
const item=id=>document.getElementById(id);
const code=i=>String(i+1).padStart(2,'0');
let current=0,frame=0,raf=0;
function display(f){
  frame=Math.min(95,Math.max(0,Math.floor(f)));drawFrame(current,frame,item('pins').checked);
  item('time').value=frame;item('clock').value=(frame/24).toFixed(2)+' / 4.00 s';
}
function pause(){audio.pause();cancelAnimationFrame(raf);item('play').textContent='播放';}
function seek(f){pause();display(f);audio.currentTime=frame/24;}
function select(index){
  pause();current=index;audio.src='assets/audio/'+code(index)+'.wav';audio.playbackRate=+item('rate').value;
  [...nav.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));display(0);
}
async function play(){
  if(frame===95)seek(0);
  await audio.play();item('play').textContent='暂停';
  const tick=()=>{display(audio.currentTime*24);if(!audio.paused)raf=requestAnimationFrame(tick);};tick();
}
window.playerReady=ready.then(()=>{
  moves.forEach((m,i)=>{let b=document.createElement('button');let n=document.createElement('small');n.textContent=code(i);b.append(n,m.name);b.onclick=()=>select(i);nav.append(b);});
  let requested=Number(new URLSearchParams(location.search).get('move'))||1;
  select(Math.min(moves.length,Math.max(1,Math.trunc(requested)))-1);
  item('play').onclick=()=>audio.paused?play():pause();item('time').oninput=e=>seek(+e.target.value);
  item('prev').onclick=()=>seek(frame-1);item('next').onclick=()=>seek(frame+1);
  item('rate').onchange=e=>audio.playbackRate=+e.target.value;item('pins').onchange=()=>display(frame);
  audio.onended=()=>{if(item('loop').checked){seek(0);play();}else if(current<moves.length-1){select(current+1);play();}else {pause();display(95);}};
});
