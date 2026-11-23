(() => {
  const id = 'bear';
  const model = {"boxes":{"body":[56.0,36.0,1384.0,559.0],"head":[1318.0,57.0,446.0,443.0],"rear-near-upper":[114.0,274.0,306.0,358.0],"rear-near-shin":[45.0,431.0,258.0,420.0],"rear-near-paw":[45.0,727.0,307.0,133.0],"rear-far-upper":[455.0,338.0,198.0,306.0],"rear-far-shin":[443.0,467.0,195.0,336.0],"rear-far-paw":[465.0,668.0,312.0,152.0],"fore-near-upper":[793.0,198.0,302.0,369.0],"fore-near-shin":[863.0,340.0,232.0,480.0],"fore-near-paw":[896.0,651.0,335.0,216.0],"fore-far-upper":[1142.0,305.0,278.0,364.0],"fore-far-shin":[1142.0,466.0,358.0,355.0],"fore-far-paw":[1364.0,669.0,349.0,171.0]},"legs":[{"name":"rear-near","hip":[305,388],"knee":[202,531],"ankle":[85,806],"phase":0.03,"lift":67},{"name":"rear-far","hip":[553,437],"knee":[549,555],"ankle":[511,728],"phase":0.54,"lift":54},{"name":"fore-near","hip":[917,322],"knee":[981,453],"ankle":[944,736],"phase":0.53,"lift":84},{"name":"fore-far","hip":[1312,412],"knee":[1242,567],"ankle":[1418,754],"phase":0.07,"lift":74}]};
  const boxes = model.boxes;
  const legs = model.legs;
  const names = {'body':'肩披虎纹 · 躯干','head':'粗颈熊首'};
  const directions = {'rear-near':'近后','rear-far':'远后','fore-near':'近前','fore-far':'远前'};
  for (const leg of legs) {
    for (const [segment,label] of Object.entries({upper:'上肢',shin:'胫片',paw:'掌爪'})) {
      names[leg.name+'-'+segment]=directions[leg.name]+label;
    }
  }
  const parts=Object.entries(names).map(([id,label])=>({id,label}));
  const images={};
  const ready=Promise.all(parts.map(async part=>{
    const image=new Image();image.src='actors/'+id+'/art/'+part.id+'.webp';
    await image.decode(); images[part.id]=image;
  }));
  const tau=2*Math.PI;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function turn(m,p,a){return m.translate(...p).rotate(a*180/Math.PI).translate(-p[0],-p[1]);}
  function at(m,p){const q=m.transformPoint({x:p[0],y:p[1]});return [q.x,q.y];}
  function vec(a,b){return [b[0]-a[0],b[1]-a[1]];}
  function solve(base,hip,knee,ankle,screenTarget) {
    const target=at(base.inverse(),screenTarget);
    const u=vec(hip,knee),v=vec(knee,ankle),g=vec(hip,target);
    const l1=Math.hypot(...u),l2=Math.hypot(...v),dist=clamp(Math.hypot(...g),Math.abs(l1-l2)+.02,l1+l2-.02);
    const side=Math.sign(u[0]*v[1]-u[1]*v[0]);
    const bend=side*Math.acos(clamp((dist*dist-l1*l1-l2*l2)/(2*l1*l2),-1,1));
    const aa=Math.atan2(g[1],g[0])-Math.atan2(l2*Math.sin(bend),l1+l2*Math.cos(bend))-Math.atan2(u[1],u[0]);
    const bb=bend-(Math.atan2(v[1],v[0])-Math.atan2(u[1],u[0]));
    const upper=turn(base,hip,aa);
    return [upper,turn(upper,knee,bb)];
  }
  function pose(t) {
    t=clamp(t,0,8);
    const stride=302,travel=t*219,cycle=travel/stride,q=cycle*tau,scale=.303;
    const stage=new DOMMatrix().translate(340+travel*scale,590).scale(scale).translate(-887,-855);
    const pitch=.015*Math.sin(q),body=turn(stage.translate(0,30+7*Math.cos(2*q)),[815,403],pitch);
    const neck=[1374,269],matrices={body,head:turn(body,neck,.039*Math.sin(q+.63)-.024*Math.cos(q*2))};
    const pivots={head:at(body,neck)};
    for(const leg of legs){
      const phase=(cycle+leg.phase)%1,stance=.67,up=clamp((phase-stance)/(1-stance),0,1);
      const swing=up*up*(3-2*up),x=stride*(stance/2-phase+swing);
      const pawBox=boxes[leg.name+'-paw'],soleY=pawBox[1]+pawBox[3]-1;
      const depth=leg.name.endsWith('far')?13:0;
      const ankleTarget=at(stage,[leg.ankle[0]+x,leg.ankle[1]+855-soleY-depth-leg.lift*Math.sin(Math.PI*up)**2]);
      const [a,b]=solve(body,leg.hip,leg.knee,leg.ankle,ankleTarget);
      const ankle=at(b,leg.ankle);
      const paw=new DOMMatrix().translate(...ankle).scale(scale).rotate(7*Math.sin(tau*up)).translate(-leg.ankle[0],-leg.ankle[1]);
      for(const [s,m,p] of [['upper',a,leg.hip],['shin',b,leg.knee],['paw',paw,leg.ankle]]){
        const part=leg.name+'-'+s;matrices[part]=m;pivots[part]=at(m,p);
      }
    }
    return {matrices,pivots};
  }
  const order=['rear-far','fore-far','rear-near','fore-near'].flatMap(leg=>['paw','shin','upper'].map(s=>leg+'-'+s));
  order.push('body','head');
  function draw(ctx,t,{pins=false,only}={}){
    const {matrices,pivots}=pose(t);
    for(const part of order){
      if(only && only!=='all' && only!==part)continue;
      const m=matrices[part];ctx.save();ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);ctx.drawImage(images[part],...boxes[part]);ctx.restore();
    }
    if(pins)for(const [part,p] of Object.entries(pivots)){
      if(only&&only!=='all'&&only!==part)continue;
      ctx.save();ctx.fillStyle='#f9e5a5';ctx.strokeStyle='#4e362b';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(...p,3.6,0,tau);ctx.fill();ctx.stroke();ctx.restore();
    }
  }
  (window.cast??={})[id]={name:'黑熊精 · 四足',parts,ready,draw,pose};
})();
