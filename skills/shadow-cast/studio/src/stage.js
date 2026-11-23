const castOrder=['wukong','tang','jinchi','guangmou','monk','bear','warbear','guanyin'];
const traits={
 wukong:'探步、提膝，空手领路，另一手带棍。',tang:'五佛冠与锦襕袈裟，持锡杖缓步。',jinchi:'身向前探，以短步挪动重衣。',guangmou:'压低下颌，前倾赶步。',monk:'短褂布鞋，左右换重，摆臂赶路。',bear:'足掌依次落地，肩峰和后胯交替起落。',warbear:'披甲起身，以两后足负重，双爪持枪行进。',guanyin:'收小步幅，前手持净瓶，衣摆随步轻移。'
};
const canvas=document.querySelector('canvas'),pen=canvas.getContext('2d'),paper=new Image();
paper.src='stage/registered.webp';
const $=s=>document.querySelector(s);
let active=castOrder.includes(location.hash.slice(1))?location.hash.slice(1):'wukong',frame=0,playing=false,ticket=0;
const fps=24,frames=192;
function drawActor(id,f,options={}){
 const ctx=options.context||pen;ctx.save();ctx.resetTransform();
 if(options.blank){ctx.clearRect(0,0,1280,720);}
 else{
  ctx.drawImage(paper,0,0,1280,720);
  // The front board masks the last one or two pixels of a loaded sole.
  ctx.beginPath();ctx.rect(0,0,1280,591);ctx.clip();
 }
 window.cast[id].draw(ctx,f/fps,{pins:options.pins||false,only:options.only||null});ctx.restore();
 if(!options.blank&&options.title!==false){
  ctx.save();ctx.fillStyle='#583323';ctx.font='600 40px "Songti SC", serif';ctx.fillText(window.cast[id].name,64,81);
  ctx.fillStyle='#6c4b36';ctx.font='20px "Songti SC",serif';ctx.fillText(traits[id],65,116);ctx.restore();
 }
}
function display(f){frame=Math.max(0,Math.min(frames-1,Math.floor(f)));$('#time').value=frame;
 $('output').textContent=(frame/24).toFixed(2)+' 秒 · '+(frame+1)+'/192';drawActor(active,frame,{pins:$('#pins').checked,only:$('#part').value});}
function stop(){playing=false;ticket++;$('#play').textContent='播放';}
function selectActor(id){
 stop();active=id;location.hash=id;
 for(const el of document.querySelectorAll('nav button'))el.setAttribute('aria-pressed',String(el.dataset.id===id));
 $('#part').replaceChildren(new Option('整偶',''));
 window.cast[id].parts.forEach(p=>$('#part').append(new Option(p.label,p.id)));
 $('#description').textContent=traits[id];display(0);
}
function play(){
 if(playing){stop();return;}
 if(frame>=frames-1)display(0);
 playing=true;$('#play').textContent='暂停';const token=++ticket;let last=performance.now(),playhead=frame;
 function tick(now){if(token!==ticket)return;playhead+=(now-last)*fps*Number($('#speed').value)/1000;last=now;
  if(playhead>=frames){if(!$('#loop').checked){display(frames-1);stop();return;}playhead%=frames;}
  display(playhead);requestAnimationFrame(tick);
 }requestAnimationFrame(tick);
}
window.ready=Promise.all([paper.decode(),...castOrder.map(id=>window.cast[id].ready)]).then(()=>{
 for(const id of castOrder){const b=document.createElement('button');b.dataset.id=id;b.textContent=window.cast[id].name;b.onclick=()=>selectActor(id);$('nav').append(b);}
 selectActor(active);
 $('#play').onclick=play;$('#prev').onclick=()=>{stop();display(frame-1);};$('#next').onclick=()=>{stop();display(frame+1);};
 $('#time').oninput=e=>{stop();display(+e.target.value);};$('#pins').onchange=$('#part').onchange=()=>display(frame);
});
