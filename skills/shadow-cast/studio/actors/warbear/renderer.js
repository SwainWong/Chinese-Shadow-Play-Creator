(() => {
  const id='warbear',boxes={"head":[290.5,0.0,207.08,136.5],"body":[116.08,23.33,546.58,429.33],"near-upper":[494.67,127.75,113.75,109.08],"near-fore":[469.0,138.83,100.33,109.67],"far-upper":[250.83,151.67,95.67,82.25],"far-fore":[214.08,138.25,78.75,91.58],"far-claw":[205.92,124.83,75.25,69.42],"near-claw":[427.0,178.5,77.58,60.67],"spear":[0.0,88.08,700.0,194.83],"near-thigh":[199.5,322.0,120.17,89.83],"near-shin":[199.5,358.75,114.92,91.0],"near-paw":[150.5,414.17,127.75,64.17],"far-thigh":[506.92,309.75,121.92,102.67],"far-shin":[518.0,364.58,112.58,85.17],"far-paw":[560.58,414.75,131.83,64.75]};
  const names={body:'披甲肩背与鱼鳞护裙',head:'黑风怪熊首',spear:'一丈枪 · 枪錞与穗','near-upper':'近肩毛臂','near-fore':'近腕','near-claw':'近爪握片','far-upper':'远肩毛臂','far-fore':'远腕','far-claw':'远爪握片','near-thigh':'近胯','near-shin':'近胫','near-paw':'近后掌','far-thigh':'远胯','far-shin':'远胫','far-paw':'远后掌'};
  const parts=Object.entries(names).map(([id,label])=>({id,label})),images={};
  const ready=Promise.all(parts.map(async part=>{
    const image=new Image();image.src='actors/'+id+'/art/'+part.id+'.webp';await image.decode();images[part.id]=image;
  }));
  const tau=Math.PI*2,clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  function at(m,p){const q=m.transformPoint({x:p[0],y:p[1]});return [q.x,q.y];}
  function turn(m,p,r){return m.translate(...p).rotate(r*180/Math.PI).translate(-p[0],-p[1]);}
  function delta(a,b){return [b[0]-a[0],b[1]-a[1]];}
  function bend(base,a,b,c,goal){
    const u=delta(a,b),v=delta(b,c),g=delta(a,at(base.inverse(),goal));
    const l1=Math.hypot(...u),l2=Math.hypot(...v),d=clamp(Math.hypot(...g),Math.abs(l1-l2)+.002,l1+l2-.002);
    const flex=Math.sign(u[0]*v[1]-u[1]*v[0])*Math.acos(clamp((d*d-l1*l1-l2*l2)/(2*l1*l2),-1,1));
    const aa=Math.atan2(g[1],g[0])-Math.atan2(l2*Math.sin(flex),l1+l2*Math.cos(flex))-Math.atan2(u[1],u[0]);
    const bb=flex-Math.atan2(v[1],v[0])+Math.atan2(u[1],u[0]);
    const top=turn(base,a,aa);
    return [top,turn(top,b,bb)];
  }
  const legs={
    near:{hip:[280,338],knee:[242,389],ankle:[255,433],phase:.10},
    far:{hip:[554,337],knee:[600,383],ankle:[590,430],phase:.60}
  };
  const arms={
    near:{shoulder:[563,153],elbow:[552,215],wrist:[496,210],grip:[463,210]},
    far:{shoulder:[318,153],elbow:[280,208],wrist:[256,174],grip:[243,153]}
  };
  function pose(t){
    t=clamp(t,0,8);
    const scale=.77,travel=t*83,stride=115,cycle=travel/stride,q=cycle*tau;
    const stage=new DOMMatrix().translate(347+travel*scale,590).scale(-scale,scale).translate(-430,-477);
    const body=turn(stage.translate(0,10+3.2*Math.cos(q*2)),[425,313],.019*Math.sin(q));
    const collar=[426,100],matrices={body,head:turn(body,collar,.035*Math.sin(q+.44)-.014*Math.sin(2*q))};
    const pivots={head:at(body,collar)};
    for(const [side,leg] of Object.entries(legs)){
      const ph=(cycle+leg.phase)%1,stance=.62,up=clamp((ph-stance)/(1-stance),0,1),swing=up*up*(3-2*up);
      const gx=leg.ankle[0]+stride*(ph-stance/2-swing);
      const box=boxes[side+'-paw'],sole=box[1]+box[3]-1;
      const gy=leg.ankle[1]+477-sole-(side==='far'?2:0)-16*Math.sin(Math.PI*up)**2;
      const [top,shin]=bend(body,leg.hip,leg.knee,leg.ankle,at(stage,[gx,gy]));
      const ground=at(shin,leg.ankle);
      const paw=new DOMMatrix().translate(...ground).scale(-scale,scale).rotate(-7*Math.sin(tau*up)).translate(-leg.ankle[0],-leg.ankle[1]);
      for(const [n,m,p] of [['thigh',top,leg.hip],['shin',shin,leg.knee],['paw',paw,leg.ankle]]){
        matrices[side+'-'+n]=m;pivots[side+'-'+n]=at(m,p);
      }
    }
    // The two closed claws ride the same physical pole, with independently posed elbows.
    // Each wrist lands under the heel of its claw; the finger plates occlude the shaft.
    const pole=turn(body.translate(-1.8*Math.sin(q-.5),1.8*Math.cos(q)),[395,192],.024*Math.sin(q+.24));
    matrices.spear=pole;
    for(const [side,arm] of Object.entries(arms)){
      const [upper,fore]=bend(body,arm.shoulder,arm.elbow,arm.wrist,at(pole,arm.wrist));
      for(const [n,m,p] of [['upper',upper,arm.shoulder],['fore',fore,arm.elbow],['claw',pole,arm.grip]]){
        matrices[side+'-'+n]=m;pivots[side+'-'+n]=at(m,p);
      }
    }
    return {matrices,pivots};
  }
  const order=['far-paw','far-shin','far-thigh','near-paw','near-shin','near-thigh','far-upper','far-fore','body','head','near-upper','near-fore','spear','far-claw','near-claw'];
  function draw(ctx,t,{pins=false,only}={}){
    const {matrices,pivots}=pose(t);
    for(const name of order){
      if(only&&only!=='all'&&only!==name)continue;
      const m=matrices[name];ctx.save();ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);ctx.drawImage(images[name],...boxes[name]);ctx.restore();
    }
    if(pins)for(const [name,p] of Object.entries(pivots)){
      if(only&&only!=='all'&&only!==name)continue;
      ctx.save();ctx.fillStyle='#f9e5a5';ctx.strokeStyle='#4e362b';ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(...p,3.5,0,tau);ctx.fill();ctx.stroke();ctx.restore();
    }
  }
  (window.cast??={})[id]={name:'黑熊精 · 披甲执枪',parts,ready,draw,pose};
})();
