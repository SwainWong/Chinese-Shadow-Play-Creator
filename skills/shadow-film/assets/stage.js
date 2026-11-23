// Stage coordinates span 1280 × 720. Each puppet is drawn about the sole of its near foot.
const canvas = document.querySelector('canvas');
let ctx = canvas.getContext('2d', {alpha:false});
const images = {};
const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b,x));
const ease = x => { x=clamp(x); return x*x*(3-2*x); };
const mix = (a,b,k) => a+(b-a)*k;
const rad = d => d*Math.PI/180;
const TAU = 2*Math.PI;
const inks = {amber:['#815026','#f3c479','#ffedb5'], dusk:['#58332c','#deb27c','#ffe6a8'], jade:['#344843','#a6a782','#eee3ad']};

function withState(f){ctx.save(); try{f();}finally{ctx.restore();}}
function at(x,y,r,f){withState(()=>{ctx.translate(x,y);ctx.rotate(rad(r));f();});}
function path(d,fill,stroke,width=1){
  const p=new Path2D(d);
  if(fill){ctx.fillStyle=fill;ctx.fill(p);}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke(p);}
}
function oval(x,y,rx,ry,color){
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=color;ctx.fill();
}
function lamp(x,y,k){
  withState(()=>{ctx.translate(x,y);ctx.scale(k,k);
    path('M0 0 Q6 18 0 31 M-3 112 Q-7 133 -1 151 M1 112 Q4 137 2 146',null,'#58351d',2.4);
    path('M-23 31 Q-54 54 -39 91 Q-34 104 -20 109 L20 109 Q48 95 43 65 Q42 44 23 31Z','#be4d25','#5a301e',2.8);
    oval(1,69,27,37,'#e49136');oval(1,69,13,36,'#f9be55');
    for(const i of [-1,1])path('M'+i*15+' 33 Q'+i*36+' 72 '+i*15+' 107',null,'#7b4121',2);
    for(const y of [40,97]){
      path('M-26 '+y+' Q0 '+(y+7)+' 26 '+y,null,'#884622',1.6);
      for(let x=-18;x<=18;x+=6)oval(x,y+2,1.15,1.55,'#ffe19b');
    }
    at(1,70,0,()=>{for(let i=0;i<6;i++)at(0,0,i*60,()=>{
      path('M0 -2 Q-8 -11 -1 -16 Q6 -11 0 -2Z','#d09042','#8f542e',.9);
    });oval(0,0,3.5,3.5,'#ffdc83');});
    for(const x of [-14,0,14]){
      path('M'+x+' 109 q2 9 0 14',null,'#86452a',1.8);
      oval(x,124,2.4,2.4,'#ac632b');
      path('M'+x+' 126 l-2 10 h4Z','#a34628');
    }
    path('M-25 31 H25 V37 H-25Z M-21 105 H21 V111 H-21Z','#704121','#4c301e',2);
    path('M-22 33 H22 M-18 107 H18',null,'#dca558',1.6);
  });
}
function fan(open){
  // The ribs rotate about a single rivet and the leaf unfolds between them.
  const span=mix(.09,1.42,open),r=63,n=12;
  function tip(i,length=r){const a=-span/2+i*span/n;return [length*Math.sin(a),-length*Math.cos(a)];}
  for(let i=0;i<n;i++){
    const a=tip(i),b=tip(i+1),c=tip(i+1,22),d=tip(i,22);
    path('M'+a+'L'+b+'L'+c+'L'+d+'Z',i%2?'#e5ab63':'#c8874d','#9a6037',.65);
    path('M0 0 L'+a,null,'#764729',1.15);
    if(open>.4)at(...tip(i+.5,49),0,()=>oval(0,0,1.65,2.5,'#85452a'));
  }
  path('M'+tip(0)+' L0 0 L'+tip(n),null,'#65402b',2.4);oval(0,0,2.5,2.5,'#bf8b46');
}
function held(which,fanOpen){
  if(which==='lantern')lamp(0,0,.53);
  else if(which==='fan')fan(fanOpen);
  else if(images[which])ctx.drawImage(images[which],-22,-40,46,50);
}
function plate(cell,x,y,w,h,alpha=1){
  withState(()=>{ctx.globalAlpha=alpha;ctx.drawImage(images.scenery,(cell%3)*512,Math.floor(cell/3)*512,512,512,x,y,w,h);});
}
function ridge(y,amp,phase,color){
  ctx.beginPath();ctx.moveTo(0,720);
  for(let x=0;x<=1280;x+=5){const a=x*.009+phase;ctx.lineTo(x,y-amp*(.57*Math.sin(a)+.26*Math.cos(2.22*a)+.17*Math.sin(3.17*a)));}
  ctx.lineTo(1280,720);ctx.fillStyle=color;ctx.fill();
}
function stage(scene,t){
  const pal=inks[scene.light||'amber'], g=ctx.createRadialGradient(695,326,44,670,329,825);
  g.addColorStop(0,pal[2]);g.addColorStop(.64,pal[1]);g.addColorStop(1,pal[0]);ctx.fillStyle=g;ctx.fillRect(0,0,1280,720);
  if(scene.set!=='hall'){withState(()=>{ctx.globalAlpha=.52;oval(890,181,64,64,'#fff3c6');});}
  ridge(456,34,2,'rgba(113,83,56,.11)');ridge(497,42,4,'rgba(104,81,49,.12)');
  if(scene.set==='temple'){plate(0,-53,166,457,427,.72);plate(1,974,257,353,334,.52);}
  if(scene.set==='pass'){plate(1,-78,155,454,446,.84);plate(1,982,269,338,328,.49);}
  if(scene.set==='hall'){for(const x of [-34,1074]){withState(()=>{ctx.translate(x,0);path('M0 107 H238 V133 H0Z M38 131 H57 V569 H38Z M174 131 H193 V569 H174Z','#885e3e');for(let i=0;i<6;i++){const u=56+i*21;path('M'+u+' 141v105m0 -72 l19 16 -19 16',null,'rgba(108,65,39,.62)',2);}});}lamp(1078,68,.75);}
  if(images[scene.set])ctx.drawImage(images[scene.set],0,0,1280,720);
  if(scene.set!=='hall'){plate(5,-62+5*Math.sin(t*.17),91,341,112,.44);plate(5,1057,102,249,104,.36);}
  ridge(573,7,1,'rgba(100,65,35,.16)');
  const f=.015+.01*Math.sin(t*2.7)+.005*Math.sin(t*4.1);ctx.fillStyle='rgba(255,211,124,'+f+')';ctx.fillRect(0,0,1280,720);
}
// Grain is seeded and stays on the cloth while the leather moves behind it.
function fabric(){
  const c=document.createElement('canvas');c.width=c.height=256;
  const p=c.getContext('2d'),d=p.createImageData(256,256);let seed=271828;
  for(let i=0;i<65536;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/4294967296;let j=i*4;d.data[j]=65;d.data[j+1]=41;d.data[j+2]=20;d.data[j+3]=Math.round(n*20)+(i%4===0?4:0)+(Math.floor(i/256)%3===0?5:0);}
  p.putImageData(d,0,0);
  for(let i=0;i<135;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const x=seed%256,y=(seed>>>12)%256;
    p.fillStyle=i%3?'rgba(255,242,191,.045)':'rgba(99,72,43,.055)';
    p.fillRect(x,y,i%3?1:9, i%3?7:1);
  }
  return ctx.createPattern(c,'repeat');
}
const weave=fabric();
function border(){
  ctx.fillStyle='#4b2b20';ctx.fillRect(0,0,1280,24);ctx.fillRect(0,696,1280,24);
  ctx.fillStyle='#97613b';ctx.fillRect(0,23,1280,3);ctx.fillRect(0,692,1280,4);
  for(let x=-8;x<1280;x+=44){
    path('M'+x+' 6 h28 v11 h-20 v-6 h13 M'+(x+32)+' 6 h8 v12',null,'#af8053',1.35);
    path('M'+x+' 703 h28 v11 h-20 v-6 h13',null,'#9c704a',1.35);
  }
  for(const x of [19,1261])for(const y of [43,675]){
    withState(()=>{ctx.translate(x,y);ctx.scale(x>640?-1:1,y>360?-1:1);
    path('M0 44 V0 H57 M8 31 V8 H40 M0 17 H17 V0',null,'rgba(100,58,32,.75)',2);});
  }
}
function puppet(actor, scene, local, duration, envelope){
  const r=RIGS[actor.role], atlas=images[actor.role], sign=actor.face==='left'?-1:1;
  const phase=local/duration, motion=actor.move||'speak', walking=motion==='walk';
  const active=scene.speaker===actor.role, speech=active?envelope:0;
  const gait=walking?Math.sin(local*6.8)*Math.min(1,phase*12,(1-phase)*9):0;
  const beat=ease(phase/.28)*(1-ease((phase-.68)/.30));
  const x=1280*mix(actor.x,actor.to??actor.x,ease(phase));
  const ground=actor.ground??575, s=actor.scale??.93;
  const bow=motion==='bow'?beat:0;
  const bodyTilt=(walking?gait*1.9:0)+speech*.8;
  const torso=[240,130], collar=r.collar.map((n,i)=>n*.5+torso[i]);
  function tile(c,row,k,p){
    ctx.drawImage(atlas,c*512,row*512,512,512,-p[0]*k,-p[1]*k,512*k,512*k);
  }
  function joint(p){return p.map((v,i)=>v*.5+torso[i]);}
  function loc(){const q=ctx.getTransform().transformPoint(new DOMPoint());return [q.x*1280/canvas.width,q.y*720/canvas.height];}
  let grip, neck;
  const sole=r.hips[1][1]*.5+130+(r.thigh[1][1]-r.thigh[0][1])*.20+(463-r.shin[1])*.17;
  withState(()=>{
    ctx.translate(x,ground-Math.abs(gait)*4);ctx.scale(sign*s,s);ctx.rotate(rad(bodyTilt));ctx.translate(-365,-sole);
    function leg(side){
      const p=joint(r.hips[side]);const a=gait*(side?1:-1);
      at(...p,a*17+(side?-4:6),()=>{tile(1,1,.20,r.thigh[0]);
        at((r.thigh[1][0]-r.thigh[0][0])*.20,(r.thigh[1][1]-r.thigh[0][1])*.20,Math.max(0,a)*25,()=>tile(2,1,.17,r.shin));});
    }
    function arm(front){
      const p=joint(r.shoulders[front?1:0]);
      const lift=motion==='lift'?40:motion==='offer'?50:motion==='listen'?1:12;
      let upper=front?-23-lift*beat-speech*5-gait*8:19+gait*14+bow*.3;
      let lower=front?-21-(motion==='lift'?44:13)*beat:13;
      const ex=(r.upper[1][0]-r.upper[0][0])*.22, ey=(r.upper[1][1]-r.upper[0][1])*.22;
      const pass=scene.pass;
      if(front && pass && (actor.role===pass.from || actor.role===pass.to)){
        // Two-link inverse kinematics. Transform a shared screen target into shoulder space.
        const m=ctx.getTransform().inverse();
        const goal=new DOMPoint(pass.x*canvas.width,pass.y*canvas.height/720).matrixTransform(m);
        const dx=goal.x-p[0],dy=goal.y-p[1],l1=Math.hypot(ex,ey),l2=Math.hypot(5,86);
        const reach=clamp(Math.hypot(dx,dy),Math.abs(l1-l2)+.001,l1+l2-.001);
        const bend=Math.acos(clamp((reach*reach-l1*l1-l2*l2)/(2*l1*l2),-1,1));
        const a1=Math.atan2(dy,dx)+Math.atan2(l2*Math.sin(bend),l1+l2*Math.cos(bend));
        const weight=ease((phase-.05)/.25)*(1-ease((phase-.68)/.25));
        upper=mix(upper,(a1-Math.atan2(ey,ex))*180/Math.PI,weight);
        lower=mix(lower,(-bend+Math.atan2(ey,ex)-Math.atan2(86,5))*180/Math.PI,weight);
      }
      at(...p,upper,()=>{tile(2,0,.22,r.upper[0]);
        at(ex,ey,lower,()=>{
          tile(0,1,.25,r.fore);
          if(front)at(5,86,0,()=>{grip=loc();
            let prop=actor.prop;
            if(pass && actor.role===pass.from)prop=phase<.5?pass.prop:null;
            if(pass && actor.role===pass.to)prop=phase>=.5?pass.prop:null;
            if(prop){
            ctx.rotate(rad(-upper-lower-bodyTilt-bow*16+4*Math.sin(local*4)*beat));held(prop,actor.unfold?ease((phase-.12)/.45):1);
          }});
        });});
    }
    leg(0);leg(1);
    // Hinge at the belt so a bow preserves both planted feet.
    ctx.translate(365,337);ctx.rotate(rad(bow*16));ctx.translate(-365,-337);
    arm(false);
    at(...collar,2+speech*5+bow*10+(motion==='listen'?3*Math.sin(local*2.6):0),()=>{
      neck=loc();tile(0,0,actor.role==='bear'?.43:.42,[r.neck[0],r.neck[1]+(DATA.builtin.includes(actor.role)?25:0)]);});
    at(...torso,0,()=>tile(1,0,.5,[0,0]));arm(true);
  });
  return [neck,grip];
}
function drawActors(scene,t,d,e){
  const screen=ctx;
  if(actorLayer.width!==canvas.width || actorLayer.height!==canvas.height){
    actorLayer.width=canvas.width;actorLayer.height=canvas.height;
  }
  ctx=actorLayer.getContext('2d');ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/1280,0,0,canvas.height/720,0,0);
  const pins=[];
  try { for(const actor of scene.actors)pins.push(puppet(actor,scene,t,d,e)); }
  finally {ctx=screen;}
  window.grips=pins.map(p=>p[1]);
  pins.forEach(([neck,grip],i)=>{
    const sign=scene.actors[i].face==='left'?1:-1;
    for(const [pt,dx] of [[neck,80],[grip,190]]){
      ctx.beginPath();ctx.moveTo(...pt);ctx.lineTo(pt[0]+dx*sign,694);ctx.strokeStyle='rgba(74,48,29,.46)';ctx.lineWidth=2.7;ctx.stroke();
    }
  });
  scene.actors.forEach((a,i)=>{
    const pass=scene.pass;
    const carries=pass && [pass.from,pass.to].includes(a.role)
      ? pass.prop==='lantern' && a.role===(t/d<.5?pass.from:pass.to) : a.prop==='lantern';
    if(!carries)return;
    const [x,y]=pins[i][1],cy=y+36*(a.scale??.93);
    const g=ctx.createRadialGradient(x,cy,2,x,cy,108);
    g.addColorStop(0,'rgba(255,202,83,.49)');g.addColorStop(.4,'rgba(255,199,91,.21)');g.addColorStop(1,'rgba(255,199,91,0)');
    ctx.fillStyle=g;ctx.fillRect(x-110,cy-110,220,220);
  });
  withState(()=>{ctx.shadowColor='rgba(85,43,21,.40)';ctx.shadowBlur=3*canvas.width/1280;
    ctx.shadowOffsetX=3*canvas.width/1280;ctx.shadowOffsetY=2*canvas.width/1280;
    ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.95;ctx.drawImage(actorLayer,0,0,1280,720);
  });
}
const actorLayer=document.createElement('canvas');
function caption(text){
  if(!text)return;
  ctx.fillStyle='#452e24';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='500 29px "Songti SC","Noto Serif CJK SC",serif';
  const chars=Array.from(text),lines=[];let line='';
  for(const ch of chars){if(line && ctx.measureText(line+ch).width>1080){lines.push(line);line='';}line+=ch;}lines.push(line);
  const lineH=34,start=632-(lines.length-1)*lineH/2;
  const wash=ctx.createLinearGradient(0,594,0,684);
  wash.addColorStop(0,'rgba(243,215,167,0)');wash.addColorStop(.45,'rgba(243,215,167,.65)');wash.addColorStop(1,'rgba(243,215,167,0)');
  ctx.fillStyle=wash;ctx.fillRect(0,594,1280,90);
  ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.strokeStyle='rgba(251,226,180,.78)';
  lines.forEach((l,i)=>ctx.strokeText(l,640,start+i*lineH));
  ctx.fillStyle='#41291d';lines.forEach((l,i)=>ctx.fillText(l,640,start+i*lineH));ctx.shadowBlur=0;
}
function draw(time){
  const frame=Math.min(DATA.frames-1,Math.max(0,Math.floor(time*DATA.fps+.000001)));
  const shot=DATA.scenes.find(s=>frame<s.end)||DATA.scenes.at(-1);
  const local=(frame-shot.start)/DATA.fps,d=(shot.end-shot.start)/DATA.fps;
  ctx.setTransform(canvas.width/1280,0,0,canvas.height/720,0,0);
  stage(shot,local);drawActors(shot,local,d,shot.levels[frame-shot.start]||0);
  if(shot.camera){
    const c=shot.camera,z=mix(c.zoom,c.endZoom??c.zoom,ease(local/d)),w=canvas.width/z,h=canvas.height/z;
    const x=clamp(c.x*canvas.width-w/2,0,canvas.width-w),y=clamp(c.y*canvas.height-h/2,0,canvas.height-h);
    ctx.drawImage(canvas,x,y,w,h,0,0,1280,720);
  }
  ctx.fillStyle=weave;ctx.fillRect(0,0,1280,720);border();
  const cue=shot.cues.find(c=>frame>=c.start&&frame<c.end);caption(cue?.text||'');
}
window.ready=Promise.all(Object.entries(DATA.images).map(([id,url])=>new Promise((ok,fail)=>{
  const im=new Image(); im.onload=()=>{images[id]=im;ok();};im.onerror=()=>fail(Error('Failed to load '+url));im.src=url;
}))).then(()=>{draw(0);return true;});
window.draw=draw;
