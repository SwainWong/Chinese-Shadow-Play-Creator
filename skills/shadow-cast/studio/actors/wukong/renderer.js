/* Approved wukong-05 leather plates. Stage coordinates grow rightward and downward. */
(() => {
  'use strict';
  const base = new URL('art/', document.currentScript.src);
  const art = {};
  const originY = 590, stageScale = 1.53;
  const pins = {
    coat:[[105,24],[97,248]], sleeve:[[105,32],[72,278]], cuff:[[47,24],[58,225]],
    thigh:[[71,26],[77,285]], shin:[[68,24],[52,302]], neck:[[48,12],[36,111]],
    shoe:[52,31], faceplate:[217,189], skull:[110,216], fist:[29,67],
    relax:[28,41], palm:[26,71], point:[29,50]
  };
  const parts = [
    ['rear-shoe','远侧靴','shoe'],['rear-shin','远侧裤管','shin'],['rear-thigh','远侧大腿','thigh'],
    ['front-shoe','近侧靴','shoe'],['front-shin','近侧裤管','shin'],['front-thigh','近侧大腿','thigh'],
    ['rear-sleeve','远侧上袖','sleeve'],['rear-cuff','远侧护臂','cuff'],
    ['neck','短颈','neck'],['coat','胸衣','coat'],['hem','开衩衣摆','splithem'],['belt','垂带','beltend'],
    ['face','脸与冠','faceplate'],['scarf','衣领','scarf'],
    ['front-sleeve','近侧上袖','sleeve'],['front-cuff','近侧护臂','cuff'],
    ['front-hand','空手掌','relax / point / palm'],['staff','金箍棒','Canvas'],['rear-hand','握棍手','fist']
  ].map(([id,label,plate]) => ({id,label,plate}));
  const allImages = ['faceplate','neck','coat','sleeve','cuff','thigh','shin','shoe','fist','relax','point','palm','scarf','splithem','beltend'];
  const ready = Promise.all(allImages.map(async name => {
    const image = new Image();
    image.src = new URL(name+'.webp', base).href;
    await image.decode();
    art[name]=image;
    const shade=document.createElement('canvas');
    shade.width=image.width;shade.height=image.height;
    const ink=shade.getContext('2d');
    ink.drawImage(image,0,0);ink.globalCompositeOperation='source-atop';
    ink.fillStyle='rgba(78,34,20,.14)';ink.fillRect(0,0,shade.width,shade.height);
    art['dark-'+name]=shade;
  }));
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
  const mul=(a,b)=>[a[0]*b,a[1]*b], length=a=>Math.hypot(...a);
  const unit=a=>mul(a,1/(length(a)||1)), normal=a=>[-a[1],a[0]];
  const mix=(a,b,t)=>a+(b-a)*t, limit=(n,a,b)=>Math.min(b,Math.max(a,n));
  const rad=d=>d*Math.PI/180, rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
  const smooth=u=>u*u*(3-2*u), progress=(a,b,t)=>smooth(limit((t-a)/(b-a),0,1));
  function line(keys,t){
    let i=1;
    while(i<keys.length && keys[i][0]<t)i++;
    if(i===keys.length)return keys.at(-1)[1];
    return mix(keys[i-1][1],keys[i][1],progress(keys[i-1][0],keys[i][0],t));
  }

  // Each row is [liftoff, landing, new ankle x, clearance, pitch at tuck].
  // Between events the complete shoe stays at exactly the last world placement.
  const steps={
    rear:[[.38,.81,231,29,-12],[1.25,1.57,291,34,-19],[2.23,2.74,351,62,-32],
          [3.21,3.54,410,34,-15],[4.0,4.41,472,47,-22],[5.32,5.76,529,32,-17],
          [6.14,6.47,584,38,-19],[7.03,7.32,605,23,-10]],
    front:[[.85,1.19,261,36,-21],[1.64,2.05,321,45,-24],
           [2.79,3.15,382,31,-15],[3.61,3.94,441,39,-21],
           [4.58,5.08,500,62,-36],[5.8,6.1,557,27,-16],[6.53,6.95,609,44,-22]]
  };
  function shoeAt(side,t){
    let x=side==='front'?201:168;
    for(const [a,b,target,h,pitch] of steps[side]){
      if(t<a)break;
      if(t<b){
        const u=(t-a)/(b-a),rise=Math.sin(u*Math.PI);
        x=mix(x,target,smooth(u));
        return {x,h:h*rise*rise,pitch:pitch*rise+9*Math.sin(2*Math.PI*u),plant:false};
      }
      x=target;
    }
    if(side==='front' && t>7.34){
      const u=progress(7.34,7.77,t);
      return {x:mix(x,643,u),h:65*u,pitch:-28*u,plant:u===0};
    }
    return {x,h:0,pitch:0,plant:true};
  }
  // The visibly flat edge of the actual boot has its low point at source y=123.
  // At rest its sole touches the stage; the lifted boot turns around its ankle.
  const shoeScale=.184;
  function foot(phase){
    const ankle=[phase.x,-(123-pins.shoe[1])*shoeScale-phase.h];
    return {ankle,toe:add(ankle,rotate(mul([142,34],shoeScale),rad(phase.pitch))),theta:rad(phase.pitch),plant:phase.plant};
  }
  function knee(hip,ankle,upper,lower){
    const delta=sub(ankle,hip),d=Math.max(.01,length(delta)),u=unit(delta);
    const along=limit((upper*upper-lower*lower+d*d)/(2*d),0,Math.min(d,upper));
    const out=Math.sqrt(Math.max(0,upper*upper-along*along));
    return add(hip,add(mul(u,along),mul(normal(u),-out)));
  }
  function elbow(shoulder,hand,sign){
    const d=sub(hand,shoulder),u=unit(d),size=length(d);
    const along=Math.min(size*.52,39);
    const depth=Math.sqrt(Math.max(0,43*43-along*along));
    return add(shoulder,add(mul(u,along),mul(normal(u),sign*depth)));
  }

  // Holds and changes of attention are keyed separately to the feet.
  const gazeKeys=[[0,10],[.22,-7],[.68,6],[1.95,11],[2.31,-8],[2.63,-4],
                  [3.01,11],[3.96,5],[4.33,-11],[4.86,-8],[5.26,5],[6.74,10],[7.38,-7],[8,-9]];
  const reachKeys=[[0,15],[.23,32],[.9,13],[1.95,24],[2.25,46],[2.75,41],
                   [3.25,15],[3.88,19],[4.4,47],[5,46],[5.5,19],[6.8,17],[7.55,49],[8,49]];
  // Vertical and forward wrist travel are keyed separately. The hand folds to the sash
  // during a gather, reaches out at the first stop, and hangs from the wrist at rest.
  const handY=[[0,26],[.23,5],[.55,36],[1.12,47],[1.6,30],[1.99,38],[2.36,-4],[2.68,-8],
               [3.03,25],[3.42,44],[3.95,37],[4.38,-13],[4.82,-34],[5.12,-23],[5.57,40],
               [6,27],[6.42,44],[6.8,33],[7.18,7],[7.6,-10],[8,-10]];
  const bendKeys=[[0,0],[.25,-3],[1.15,2],[1.94,8],[2.36,6],[2.75,0],[3.45,5],
                  [3.96,8],[4.35,5],[4.8,-3],[5.2,0],[5.6,8],[6.2,4],[6.9,7],[7.56,-3],[8,-3]];
  const stickKeys=[[0,17],[.32,15],[1.72,11],[2.27,-12],[2.75,-11],[3.34,15],
                   [4,13],[4.51,-13],[5,-9],[5.65,13],[6.7,17],[7.53,-8],[8,-9]];
  function pose(time){
    const t=limit(Number.isFinite(time)?time:0,0,8);
    const near=shoeAt('front',t),far=shoeAt('rear',t);
    const front=foot(near),rear=foot(far);
    const lift=Math.max(near.h,far.h);
    const shift=limit((near.h-far.h)/58,-1,1);
    const restX=(near.x+far.x)/2;
    // In each rising step the waist leans over the shoe that remains planted.
    const rootX=restX+shift*(far.x-near.x)*.33+1;
    const crouch=line(bendKeys,t);
    const rootY=-109-lift*.10+crouch-3*progress(7.25,7.76,t);
    const hip=[rootX,rootY],reach=line(reachKeys,t);
    const neck=add(hip,[16+.18*reach+crouch*.63,-76+lift*.045+crouch*.32]);
    const spine=unit(sub(hip,neck)),side=mul(normal(spine),-1);
    const local=(p,across,down)=>add(p,add(mul(side,across),mul(spine,down)));
    const headTurn=rad(line(gazeKeys,t)),headScale=.311;
    const skullPin=local(neck,1,-11);
    const eye=sub(skullPin,rotate(mul(sub(pins.skull,pins.faceplate),headScale),headTurn));
    const frontShoulder=local(neck,2,8),rearShoulder=local(neck,-6,9);
    const frontSocket=local(hip,4,16),rearSocket=local(hip,-5,15);
    const frontKnee=knee(frontSocket,front.ankle,51,57),rearKnee=knee(rearSocket,rear.ankle,51,57);
    const freeWrist=add(frontShoulder,[22+reach,line(handY,t)+shift*2]);
    const frontElbow=elbow(frontShoulder,freeWrist,1);
    const grip=add(hip,[-31+11*shift,-17-14*progress(7.2,7.73,t)]);
    const rearElbow=elbow(rearShoulder,grip,1);
    const theta=rad(line(stickKeys,t)-shift*3.5);
    const direction=[Math.cos(theta),Math.sin(theta)];
    const staff=[add(grip,mul(direction,-134)),add(grip,mul(direction,107))];
    const turn=Math.atan2(spine[1],spine[0])-Math.PI/2;
    return {t,front,rear,hip,neck,eye,headTurn,headScale,skullPin,collar:local(neck,0,13),
      turn,frontShoulder,rearShoulder,frontSocket,rearSocket,frontKnee,rearKnee,
      freeWrist,frontElbow,grip,rearElbow,staff,reach,sash:turn*.15+shift*.15};
  }
  const layerVisible=(only,id)=>!only||only==='all'||only==='*'||(Array.isArray(only)?only.includes(id):only===id);
  function draw(ctx,t,{pins:showPins=false,only=null}={}){
    const p=pose(t), visible=id=>layerVisible(only,id);
    function image(name,P,src,axis,perp,far){
      const sheet=art[(far?'dark-':'')+name];
      if(!sheet)return;
      ctx.save();ctx.transform(axis[0],axis[1],perp[0],perp[1],P[0],P[1]);
      ctx.drawImage(sheet,-src[0],-src[1]);ctx.restore();
    }
    const dots=[];
    function marks(id,points){if(showPins&&visible(id))dots.push(...points);}
    function flat(id,name,P,src,sx,sy,theta,far=false,pivots=[P]){
      if(!visible(id))return;
      image(name,P,src,rotate([sx,0],theta),rotate([0,sy],theta),far);
      marks(id,pivots);
    }
    function hinge(id,name,a,b,width,far=false){
      if(!visible(id)||!art[name])return;
      const [start,end]=pins[name],s=unit(sub(end,start)),n=normal(s),delta=sub(b,a);
      const u=unit(delta),along=mul(u,length(delta)/length(sub(end,start))),cross=mul(normal(u),width/art[name].width);
      image(name,a,start,add(mul(along,s[0]),mul(cross,n[0])),add(mul(along,s[1]),mul(cross,n[1])),far);
      marks(id,[a,b]);
    }
    ctx.save();ctx.translate(0,originY);ctx.scale(stageScale,stageScale);
    for(const side of ['rear','front']){
      const far=side==='rear',f=p[side],kneePoint=p[side+'Knee'];
      flat(side+'-shoe','shoe',f.ankle,pins.shoe,shoeScale,shoeScale,f.theta,far);
      hinge(side+'-shin','shin',kneePoint,f.ankle,33,far);
      hinge(side+'-thigh','thigh',p[side+'Socket'],kneePoint,36,far);
    }
    const gripUnit=unit(sub(p.grip,p.rearElbow)),rearWrist=sub(p.grip,mul(gripUnit,10));
    hinge('rear-sleeve','sleeve',p.rearShoulder,p.rearElbow,33,true);
    hinge('rear-cuff','cuff',p.rearElbow,rearWrist,17,true);
    hinge('neck','neck',p.skullPin,p.collar,21);
    hinge('coat','coat',p.neck,p.hip,50);
    flat('hem','splithem',p.hip,[260,40],64.8/491,61.56/402,p.turn*.9);
    flat('belt','beltend',add(p.hip,[6,2]),[24,28],.136,.14,p.sash);
    flat('face','faceplate',p.eye,pins.faceplate,p.headScale,p.headScale,p.headTurn,false,[p.skullPin]);
    flat('scarf','scarf',add(p.neck,[5,9]),[134,112],.0745,.08,p.turn*.7);
    hinge('front-sleeve','sleeve',p.frontShoulder,p.frontElbow,33);
    hinge('front-cuff','cuff',p.frontElbow,p.freeWrist,17);
    const hand=p.t>=4.48 && p.t<=5.02?'palm':p.reach>39?'point':'relax';
    const freeAngle=Math.atan2(p.freeWrist[1]-p.frontElbow[1],p.freeWrist[0]-p.frontElbow[0]);
    if(art[hand])flat('front-hand',hand,p.freeWrist,pins[hand],23/art[hand].width,23/art[hand].width,freeAngle);
    if(visible('staff')){
      const [a,b]=p.staff,d=sub(b,a),l=length(d);
      ctx.save();ctx.translate(...a);ctx.rotate(Math.atan2(d[1],d[0]));
      ctx.fillStyle='#b94124';ctx.fillRect(0,-3.35,l,6.7);
      ctx.fillStyle='#daa23c';ctx.fillRect(0,-3.35,l*.182,6.7);ctx.fillRect(l*.818,-3.35,l*.182,6.7);
      ctx.fillStyle='rgba(255,211,116,.3)';ctx.fillRect(0,-3.35,l,.8);
      ctx.restore();marks('staff',[p.grip]);
    }
    if(art.fist)flat('rear-hand','fist',rearWrist,pins.fist,19/art.fist.width,19/art.fist.width,Math.atan2(gripUnit[1],gripUnit[0]),true,[rearWrist,p.grip]);
    if(showPins){
      ctx.lineWidth=.8;ctx.fillStyle='#f6e5ad';ctx.strokeStyle='#742a26';
      for(const d of dots){ctx.beginPath();ctx.arc(...d,2.5,0,2*Math.PI);ctx.fill();ctx.stroke();}
    }
    ctx.restore();
    return p;
  }
  window.cast=window.cast||{};
  window.cast.wukong={name:'孙悟空',parts,ready,draw};
})();
