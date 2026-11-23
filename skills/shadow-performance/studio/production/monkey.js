/* Approved wukong-05 leather plates. Stage coordinates grow rightward and downward. */
(() => {
  'use strict';
  const base = new URL('../assets/wukong/', document.currentScript.src);
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
    if(['sleeve','cuff','palm','fist','relax','point'].includes(name)){
      const edge=document.createElement('canvas');edge.width=image.width;edge.height=image.height;
      const ec=edge.getContext('2d');ec.drawImage(image,0,0);ec.globalCompositeOperation='source-in';
      ec.fillStyle='#653a21';ec.fillRect(0,0,edge.width,edge.height);art['edge-'+name]=edge;
    }
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
  // Physical rivet spacing in puppet units. The coat and short neck use fixed pins too.
  const bone=Object.freeze({sleeve:43,cuff:39,thigh:51,shin:57,coat:79,neck:Math.hypot(1,24)});
  const palmReach=10;
  // Screen-space articulation limits for this puppet. Zero interior angle is folded.
  const articulation={arm:[43,158],leg:[30,158],wrist:[-56,56]};
  const reverseKnee=-1,forwardElbow=1;
  const mixAngle=(a,b,u)=>a+u*Math.atan2(Math.sin(b-a),Math.cos(b-a));
  function solvePair(from,target,first,second,bend,range=articulation.arm){
    const v=sub(target,from),r=length(v),axis=r>1e-8?mul(v,1/r):[1,0];
    const span=angle=>Math.sqrt(first*first+second*second-2*first*second*Math.cos(rad(angle)));
    const d=limit(r,span(range[0]),span(range[1]));
    const a=(first*first-second*second+d*d)/(2*d);
    const h=Math.sqrt(Math.max(0,first*first-a*a));
    return {joint:add(from,add(mul(axis,a),mul(normal(axis),bend*h))),end:add(from,mul(axis,d))};
  }
  function between(a,b,u){return [mix(a[0],b[0],u),mix(a[1],b[1],u)];}
  function channel(cue,name){return limit(Number.isFinite(cue?.[name])?cue[name]:0,0,1);}

  // Moving a rigid rod translates both holes by the same amount. For a two-hand
  // pose the anchor must lie in BOTH arms' reachable rings. On their boundary the
  // closest feasible point is a radial projection or a circle intersection.
  const rodLength=241;
  const armRadii=articulation.arm.map(a=>Math.sqrt(bone.sleeve**2+(bone.cuff+palmReach)**2
    -2*bone.sleeve*(bone.cuff+palmReach)*Math.cos(rad(a))));
  // The rosette is the outside of the elbow. A right-facing coat puts that
  // rivet below/back of a forward-reaching hand, on BOTH sides of the chest.
  // The trailing sleeve may swing behind the belt, but cannot swing through
  // the nape merely to satisfy a requested grip.
  const upperArc=[rad(-78),rad(161)];
  const palmEnds=bone.cuff+palmReach;
  const sleeveAngle=u=>{
    const middle=(upperArc[0]+upperArc[1])/2;
    const x=Math.atan2(u[1],u[0])-middle;
    return middle+Math.atan2(Math.sin(x),Math.cos(x));
  };
  function naturalArm(shoulder,target){
    const chain=solvePair(shoulder,target,bone.sleeve,palmEnds,forwardElbow);
    const offset=sub(chain.joint,shoulder),angle=sleeveAngle(offset);
    const correction=limit(angle,...upperArc)-angle;
    if(Math.abs(correction)>1e-9){
      chain.joint=add(shoulder,rotate(offset,correction));
      chain.end=add(shoulder,rotate(sub(chain.end,shoulder),correction));
    }
    return chain;
  }
  // Route grip targets past the front/underside of the shoulder button. The
  // clearance changes continuously with the authored height, so a target
  // crossing the chest cannot teleport between opposite sides of the rivet.
  function gripNormal(offset){
    const high=1-progress(-40,22,offset[1]);
    return rotate([1,0],rad(mix(74,-54,high)));
  }
  function guideAnchor(want,first,second=null){
    const centers=second?[first,second]:[first],limits=centers.map(c=>gripNormal(sub(want,c)));
    const hi=armRadii[1],lo=armRadii[0]+.2;
    let q=want;
    // Alternating projections on the forward chest half-plane and each
    // shoulder's reach disk converge to their convex intersection.
    for(let i=0;i<64;i++){
      let error=0;
      for(let j=0;j<centers.length;j++){
        const c=centers[j],n=limits[j],v=sub(q,c),dot=v[0]*n[0]+v[1]*n[1];
        if(dot<lo){q=add(q,mul(n,lo-dot));error=Math.max(error,lo-dot);}
        const next=sub(q,c),d=length(next);
        if(d>hi){q=add(c,mul(next,hi/d));error=Math.max(error,d-hi);}
      }
      if(error<1e-7)break;
    }
    return q;
  }
  function reachableAnchor(want,first,second=null){
    const centers=second?[first,second]:[first];
    const valid=q=>centers.every(c=>length(sub(naturalArm(c,q).end,q))<1e-6);
    if(valid(want))return want;
    const circles=[];
    for(const c of centers){
      for(const r of armRadii)circles.push([c,r]);
      for(const angle of upperArc)circles.push([add(c,rotate([bone.sleeve,0],angle)),palmEnds]);
    }
    const candidates=centers.map(c=>naturalArm(c,want).end);
    for(let i=0;i<circles.length;i++){
      const [center,r]=circles[i],towards=sub(want,center);
      candidates.push(add(center,mul(length(towards)>1e-8?unit(towards):[1,0],r)));
      for(let j=0;j<i;j++){
        const [other,s]=circles[j],line=sub(other,center),d=length(line);
        if(d<1e-8 || d>r+s+1e-8 || d<Math.abs(r-s)-1e-8)continue;
        const x=(r*r-s*s+d*d)/(2*d),y=Math.sqrt(Math.max(0,r*r-x*x));
        const axis=unit(line),base=add(center,mul(axis,x));
        candidates.push(add(base,mul(normal(axis),y)),sub(base,mul(normal(axis),y)));
      }
    }
    let best=null,dist=Infinity;
    for(const q of candidates){
      const error=length(sub(q,want));
      if(error<dist&&valid(q)){best=q;dist=error;}
    }
    return best??naturalArm(first,want).end;
  }
  function poseRod(p,bar,angle){
    const axis=[Math.cos(angle),Math.sin(angle)];
    const projection=limit(bar.projectedRatio??1,.25,1), span=rodLength*projection;
    const lead=bar.lead==='front'?'front':'rear',other=lead==='front'?'rear':'front';
    const sides=['front','rear'], settings={};
    for(const s of sides){
      settings[s]={u:limit(bar[s+'U']??(s==='front'?.68:.4),0,1),hold:limit(bar[s+'Hold']??1,0,1)};
    }
    const primary=p[lead+'Shoulder'],secondary=p[other+'Shoulder'];
    const want=add(primary,bar.anchor??[36,29]);
    const delta=mul(axis,span*(settings[other].u-settings[lead].u));
    // During a release, interpolating two legal targets may cross the
    // shoulder's folded exclusion circle. Keep the planted hand on its pin.
    const second=sub(secondary,delta);
    const one=reachableAnchor(guideAnchor(want,primary),primary);
    const two=reachableAnchor(guideAnchor(want,primary,second),primary,second);
    const anchor=settings[other].hold===1?two:reachableAnchor(between(one,two,settings[other].hold),primary);
    let start=sub(anchor,mul(axis,span*settings[lead].u));
    // A stage socket can support either end after the actor opens both hands.
    // The body may rise above it; it still identifies the same full-length prop.
    if(bar.support){
      const socket=add([184.5,0],bar.support.base);
      const seated=sub(socket,mul(axis,span*bar.support.u));
      start=between(start,seated,limit(bar.support.weight??1,0,1));
    }
    p.staff=[start,add(start,mul(axis,span))];p.rodProjection=projection;p.hands={};
    for(const s of sides){
      const shoulder=p[s+'Shoulder'],{u,hold}=settings[s];
      const target=add(start,mul(axis,span*u));
      const free=add(shoulder,bar[s+'Free']??(s==='front'?[40,27]:[-21,52]));
      const loose=naturalArm(shoulder,guideAnchor(free,shoulder));
      const rendezvous=s===other&&!bar.support?add(two,delta):target;
      const held=naturalArm(shoulder,rendezvous);
      let chain=held;
      if(hold<1){
        const ua=sleeveAngle(sub(loose.joint,shoulder)),ub=sleeveAngle(sub(held.joint,shoulder));
        const elbowAngle=arm=>{
          const a=sub(shoulder,arm.joint),b=sub(arm.end,arm.joint);
          return Math.atan2(Math.abs(a[0]*b[1]-a[1]*b[0]),a[0]*b[0]+a[1]*b[1]);
        };
        const turn=mix(ua,ub,hold),bend=mix(elbowAngle(loose),elbowAngle(held),hold);
        const joint=add(shoulder,rotate([bone.sleeve,0],turn));
        chain={joint,end:add(joint,rotate([palmEnds,0],turn+bend-Math.PI))};
        if(hold>.68 && length(sub(chain.end,target))<2.2)chain=naturalArm(shoulder,target);
      }
      const axisArm=unit(sub(chain.end,chain.joint));
      const wrist=add(chain.joint,mul(axisArm,bone.cuff));
      const facing=Math.atan2(axisArm[1],axisArm[0]);
      const onRod=sub(chain.end,start),along=onRod[0]*axis[0]+onRod[1]*axis[1];
      const error=length(sub(chain.end,target));
      const style=hold>.68&&error<1e-6?'fist':hold>.36?'relax':bar[s+'Style']??'palm';
      if(s==='front'){
        p.freeWrist=wrist;p.freeAngle=facing;p.freeStyle=style;p.frontKnuckles=chain.end;p.braceGoal=target;
      }else{
        p.rearWrist=wrist;p.grip=chain.end;p.rearStyle=style;p.rearRelease=1-hold;
      }
      p[s+'Elbow']=chain.joint;
      p.hands[s]={point:chain.end,wrist,u:along/span,targetU:u,hold,style,
        gap:Math.abs(onRod[0]*axis[1]-onRod[1]*axis[0]),targetError:error};
    }
    return p;
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
  function pose(time, cue){
    const look=channel(cue,'look'),point=channel(cue,'point'),ear=channel(cue,'ear');
    const tuck=channel(cue,'tuck'),staffPose=channel(cue,'staff'),nod=channel(cue,'nod');
    const t=limit(Number.isFinite(time)?time:0,0,8);
    function phase(side){
      const key=cue?.feet?.[side];
      if(!key)return shoeAt(side,t);
      const [x,h=0,pitch=0]=key;
      return {x:184.5+x,h,pitch,plant:h<1e-6};
    }
    const near=phase('front'),far=phase('rear');
    const front=foot(near),rear=foot(far);
    const launchStance=channel(cue,'launchStance');
    rear.ankle[0]-=32*launchStance+19*channel(cue,'landingStance');
    front.ankle[0]+=16*launchStance;
    const lift=Math.max(near.h,far.h);
    const shift=limit((near.h-far.h)/58,-1,1);
    const restX=(near.x+far.x)/2;
    // In each rising step the waist leans over the shoe that remains planted.
    const rootX=restX+shift*(far.x-near.x)*.33+1+(cue?.weightShift??0);
    const crouch=line(bendKeys,t);
    const preload=channel(cue,'preload'),push=channel(cue,'push');
    const gaitY=22*preload-(19+6*launchStance)*push-109-lift*.10+crouch-3*progress(7.25,7.76,t)+14*channel(cue,'land');
    const fixedHeight=Number.isFinite(cue?.waistAboveSole)?-cue.waistAboveSole/(actorScale*stageScale):gaitY;
    const rootY=mix(gaitY,fixedHeight,channel(cue,'waistControl'));
    const hip=[rootX,rootY],reach=line(reachKeys,t);
    const neckAxis=rotate(unit([16+.18*reach+crouch*.63+tuck*12+preload*28,-76+lift*.045+crouch*.32]),rad(cue?.bar?.lean??0));
    const neck=add(hip,mul(neckAxis,bone.coat));
    const spine=unit(sub(hip,neck)),side=mul(normal(spine),-1);
    const local=(p,across,down)=>add(p,add(mul(side,across),mul(spine,down)));
    // Pivot the face at the original ear hinge, keeping the short neck rooted in its collar.
    const headTurn=rad(mix(line(gazeKeys,t),-46,look)+16*nod-5*ear),headScale=.311;
    const skullPin=local(neck,1,-11);
    const eye=sub(skullPin,rotate(mul(sub(pins.skull,pins.faceplate),headScale),headTurn));
    const frontShoulder=local(neck,5,9),rearShoulder=local(neck,-10,10);
    const frontSocket=local(hip,4,16),rearSocket=local(hip,-5,15);
    function leg(socket,f,folded,angle,fold){
      const anchored=f.plant;
      const target=between(f.ankle,add(hip,folded),fold);
      const chain=solvePair(socket,target,bone.thigh,bone.shin,reverseKnee,articulation.leg);
      f.ankle=chain.end;f.theta=mix(f.theta,rad(angle),fold);
      if(!anchored||fold>0){
        // The rigid boot hangs from the ankle. When the knee lifts past it,
        // allow plantar flexion instead of letting the toe enter the trouser.
        const shin= Math.atan2(chain.joint[1]-f.ankle[1],chain.joint[0]-f.ankle[0]);
        const solePitch=Math.atan2(-1,110);
        const ankleOpening=f.theta+solePitch-shin;
        const wrapped=Math.atan2(Math.sin(ankleOpening),Math.cos(ankleOpening));
        f.theta=shin+limit(wrapped,rad(38),rad(142))-solePitch;
      }
      f.toe=add(f.ankle,rotate(mul([142,34],shoeScale),f.theta));
      f.plant=anchored && fold===0;
      return chain.joint;
    }
    const flyFront=cue?.airLegs?.front??[43,41,-24],flyRear=cue?.airLegs?.rear??[-48,14,-68];
    const frontKnee=leg(frontSocket,front,flyFront,flyFront[2],cue?.frontFold??tuck);
    const rearKnee=leg(rearSocket,rear,flyRear,flyRear[2],cue?.rearFold??tuck);
    const earPivot=add(eye,rotate(mul(sub([130,192],pins.faceplate),headScale),headTurn));
    const pointTarget=add(frontShoulder,[63,-43]);
    let freeTarget=between(add(frontShoulder,[22+reach,line(handY,t)+shift*2]),pointTarget,point);
    // Meet the ear with the fingertips, not the wrist. The palm's visible fingertip is
    // 16 puppet units beyond its rivet; solving the full reach leaves a natural wrist.
    const fingerOffset=mul(sub([177,21],pins.palm),23/227);
    const earArm=solvePair(frontShoulder,earPivot,bone.sleeve,bone.cuff+length(fingerOffset),forwardElbow);
    const earWrist=add(earArm.joint,mul(unit(sub(earArm.end,earArm.joint)),bone.cuff));
    freeTarget=between(freeTarget,earWrist,ear);
    freeTarget=between(freeTarget,add(frontShoulder,[44,-27]),tuck*(1-ear)*(1-point));
    const carrying=add(hip,[-31+11*shift,-17-14*progress(7.2,7.73,t)]);
    let desiredGrip=between(carrying,add(hip,[32,-48]),staffPose);
    desiredGrip=between(desiredGrip,add(hip,[-3,-47]),tuck*(1-staffPose));
    const flourish=channel(cue,'flourish'),rearRelease=channel(cue,'release');
    const shaftAngle=rad(cue?.staffDeg??0);
    desiredGrip=between(desiredGrip,add(frontShoulder,[44+8*Math.cos(shaftAngle),20+8*Math.sin(shaftAngle)]),flourish);
    // Holding hand extends the forearm to its fixed palm pin. Solve to that endpoint,
    // then mark the wrist precisely one cuff length from the elbow.
    const holdingArm=solvePair(rearShoulder,desiredGrip,bone.sleeve,bone.cuff+palmReach,forwardElbow);
    let rearElbow=holdingArm.joint;
    const grip=holdingArm.end;
    let rearWrist=add(rearElbow,mul(unit(sub(grip,rearElbow)),bone.cuff));
    if(rearRelease>0){
      const openArm=solvePair(rearShoulder,between(rearWrist,add(hip,[-23,-8]),rearRelease),bone.sleeve,bone.cuff,forwardElbow);
      rearElbow=openArm.joint;rearWrist=openArm.end;
    }
    const gaitStick=line(stickKeys,t)-shift*3.5;
    const degrees=Number.isFinite(cue?.staffDeg)?cue.staffDeg:mix(gaitStick,-62,staffPose);
    const theta=rad(degrees);
    const direction=[Math.cos(theta),Math.sin(theta)];
    const staff=[add(grip,mul(direction,-134)),add(grip,mul(direction,107))];
    const guard=channel(cue?.combatHand,'guard'),brace=Math.max(channel(cue?.combatHand,'brace'),channel(cue,'catch'));
    const chamber=channel(cue?.combatHand,'chamber'),trail=channel(cue?.combatHand,'trail');
    // The two-handed hold meets a separate point 67 units ahead of the fixed main grip.
    // The knuckle is ten units beyond the wrist of this leather fist.
    const braceGoal=add(grip,mul(direction,mix(67,17,flourish)));
    const braceArm=solvePair(frontShoulder,braceGoal,bone.sleeve,bone.cuff+palmReach,forwardElbow);
    const braceAxis=unit(sub(braceArm.end,braceArm.joint));
    const braceWrist=add(braceArm.joint,mul(braceAxis,bone.cuff));
    const sum=guard+brace+chamber+trail,weight=Math.max(1,sum);
    const home=mul(freeTarget,Math.max(0,1-sum));
    freeTarget=add(home,add(
      add(mul(add(frontShoulder,[65,11]),guard/weight),mul(braceWrist,brace/weight)),
      add(mul(add(hip,[-11,-1]),chamber/weight),mul(add(frontShoulder,[-77,9]),trail/weight))
    ));
    const freeArm=solvePair(frontShoulder,freeTarget,bone.sleeve,bone.cuff,forwardElbow);
    const frontElbow=freeArm.joint,freeWrist=freeArm.end;
    let freeStyle=ear>.25?'palm':point>.3?'point':
      t>=4.48 && t<=5.02?'palm':reach>39?'point':'relax';
    const strongest=Math.max(guard,brace,chamber,trail);
    if(strongest>.32)freeStyle=(strongest===brace||strongest===chamber)?'fist':'palm';
    const forearmAngle=Math.atan2(freeWrist[1]-frontElbow[1],freeWrist[0]-frontElbow[0]);
    const earAngle=forearmAngle-Math.atan2(fingerOffset[1],fingerOffset[0]);
    let desiredAngle=mixAngle(mixAngle(forearmAngle,rad(-38),point),earAngle,ear);
    desiredAngle=mixAngle(desiredAngle,rad(-12),guard);
    desiredAngle=mixAngle(desiredAngle,forearmAngle,Math.max(brace,chamber));
    desiredAngle=mixAngle(desiredAngle,rad(174),trail);
    const swivel=Math.atan2(Math.sin(desiredAngle-forearmAngle),Math.cos(desiredAngle-forearmAngle));
    const freeAngle=forearmAngle+limit(swivel,rad(articulation.wrist[0]),rad(articulation.wrist[1]));
    const frontKnuckles=add(freeWrist,rotate([palmReach,0],freeAngle));
    const turn=Math.atan2(spine[1],spine[0])-Math.PI/2;
    const result={t,look,point,ear,tuck,rearRelease,front,rear,hip,neck,eye,earPivot,freeStyle,freeAngle,headTurn,headScale,skullPin,collar:local(neck,0,13),
      turn,frontShoulder,rearShoulder,frontSocket,rearSocket,frontKnee,rearKnee,
      freeWrist,frontElbow,grip,rearElbow,rearWrist,staff,frontKnuckles,braceGoal,reach,sash:turn*.15+shift*.15};
    return cue?.bar?poseRod(result,cue.bar,theta):result;
  }
  const layerVisible=(only,id)=>!only||only==='all'||only==='*'||(Array.isArray(only)?only.includes(id):only===id);
  function draw(ctx,t,{pins:showPins=false,only=null,cue=null,walkTime=t}={}){
    const p=pose(walkTime,cue), visible=id=>layerVisible(only,id);
    function image(name,P,src,axis,perp,far){
      const sheet=art[(far?'dark-':'')+name];
      if(!sheet)return;
      const rim=art['edge-'+name],accent=channel(cue?.combatHand,'trail');
      if(!far&&rim&&accent>0){
        // The pale cut hide meets a yellow screen. Trace only the moving outside edge
        // so the elbow and the open palm can still be read during the backswing.
        ctx.save();ctx.globalAlpha*=accent*.78;
        for(const [dx,dy] of [[-1.05,0],[1.05,0],[0,-1.05],[0,1.05]]){
          ctx.save();ctx.transform(axis[0],axis[1],perp[0],perp[1],P[0]+dx,P[1]+dy);
          ctx.drawImage(rim,-src[0],-src[1]);ctx.restore();
        }
        ctx.restore();
      }
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
      const u=unit(delta),along=mul(u,bone[name]/length(sub(end,start))),cross=mul(normal(u),width/art[name].width);
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
    const gripUnit=unit(sub(p.rearWrist,p.rearElbow)),rearWrist=p.rearWrist;
    hinge('rear-cuff','cuff',p.rearElbow,rearWrist,17,true);
    hinge('rear-sleeve','sleeve',p.rearShoulder,p.rearElbow,33,true);
    hinge('neck','neck',p.skullPin,p.collar,21);
    hinge('coat','coat',p.neck,p.hip,50);
    flat('hem','splithem',p.hip,[260,40],64.8/491,61.56/402,p.turn*.9);
    flat('belt','beltend',add(p.hip,[6,2]),[24,28],.136,.14,p.sash);
    if(visible('staff')){
      const [a,b]=p.staff,d=sub(b,a),l=rodLength;
      ctx.save();ctx.translate(...a);ctx.rotate(Math.atan2(d[1],d[0]));
      ctx.scale(length(d)/rodLength,1);
      ctx.fillStyle='#b94124';ctx.fillRect(0,-3.35,l,6.7);
      ctx.fillStyle='#daa23c';ctx.fillRect(0,-3.35,l*.182,6.7);ctx.fillRect(l*.818,-3.35,l*.182,6.7);
      if(cue?.inkTips){
        ctx.strokeStyle='#6d351c';ctx.lineWidth=1.65;
        for(const start of [0,l*.818]){
          ctx.strokeRect(start+.83,-2.53,l*.182-1.66,5.06);
          ctx.fillStyle='#975825';ctx.fillRect(start+(start===0?1.25:l*.182-4.3),-2.45,3.1,4.9);
        }
        // Ring cuts are engraved into the rod's plate. As a wrist slides, each
        // ornament stays at its original station measured from the physical tip.
        for(const end of [0,1]){
          ctx.save();ctx.translate(end*l,0);ctx.scale(end?-1:1,1);
          ctx.lineWidth=.9;ctx.strokeStyle='#985522';
          for(const x of [8.0,11.0,l*.182-9.0,l*.182-6.0]){
            ctx.beginPath();ctx.moveTo(x,-2.55);ctx.quadraticCurveTo(x+1.7,0,x,2.55);ctx.stroke();
          }
          const mid=l*.091;
          ctx.beginPath();ctx.moveTo(mid-5,0);ctx.lineTo(mid,-1.85);
          ctx.lineTo(mid+5,0);ctx.lineTo(mid,1.85);ctx.closePath();ctx.stroke();
          ctx.restore();
        }
        for(const fraction of [.294,.496,.706]){
          const x=l*fraction;
          ctx.fillStyle='#7d3522';ctx.fillRect(x-2.6,-3.35,5.2,6.7);
          ctx.fillStyle='#dcaa4a';ctx.fillRect(x-1.65,-3.35,1.35,6.7);ctx.fillRect(x+.55,-3.35,1.1,6.7);
        }
      }
      ctx.fillStyle='rgba(255,211,116,.3)';ctx.fillRect(0,-3.35,l,.8);
      ctx.restore();marks('staff',[p.grip]);
    }
    flat('face','faceplate',p.eye,pins.faceplate,p.headScale,p.headScale,p.headTurn,false,[p.skullPin]);
    flat('scarf','scarf',add(p.neck,[5,9]),[134,112],.0745,.08,p.turn*.7);
    hinge('front-cuff','cuff',p.frontElbow,p.freeWrist,17);
    hinge('front-sleeve','sleeve',p.frontShoulder,p.frontElbow,33);
    const hand=p.freeStyle;
    if(art[hand]){
      const scale=(hand==='fist'?19:23)/art[hand].width;
      flat('front-hand',hand,p.freeWrist,pins[hand],scale,scale,p.freeAngle);
    }
    const backHand=p.rearStyle??(p.rearRelease>.18?'relax':'fist');
    if(art[backHand]){
      const handScale=(backHand==='fist'?19:23)/art[backHand].width;
      flat('rear-hand',backHand,rearWrist,pins[backHand],handScale,handScale,Math.atan2(gripUnit[1],gripUnit[0]),true,[rearWrist]);
    }
    if(showPins){
      ctx.lineWidth=.8;ctx.fillStyle='#f6e5ad';ctx.strokeStyle='#742a26';
      for(const d of dots){ctx.beginPath();ctx.arc(...d,2.5,0,2*Math.PI);ctx.fill();ctx.stroke();}
    }
    ctx.restore();
    return p;
  }
  window.cast=window.cast||{};
  window.cast.wukong={name:'孙悟空',parts,ready,draw,pose,bone,articulation};
  const actorScale=238/395,baseX=282.285,ground=580;
  function worldPose(p,x,dir){
    const sx=(dir<0?-1:1)*actorScale;
    const toWorld=([px,py])=>[x+sx*(stageScale*px-baseX),ground+actorScale*stageScale*py];
    const pa={};
    for(const [id,local] of Object.entries({
      eye:p.eye,ear:p.earPivot,hip:p.hip,neck:p.neck,headHinge:p.skullPin,collar:p.collar,
      frontShoulder:p.frontShoulder,rearShoulder:p.rearShoulder,frontElbow:p.frontElbow,rearElbow:p.rearElbow,
      frontWrist:p.freeWrist,rearWrist:p.rearWrist,grip:p.grip,frontHip:p.frontSocket,rearHip:p.rearSocket,
      frontKnee:p.frontKnee,rearKnee:p.rearKnee,frontAnkle:p.front.ankle,rearAnkle:p.rear.ankle,
      frontToe:p.front.toe,rearToe:p.rear.toe,frontKnuckles:p.frontKnuckles,braceGoal:p.braceGoal
    }))pa[id]=toWorld(local);
    const edge=[[8,117],[45,122],[100,123],[155,121],[178,116],[190,109],[206,89]];
    for(const side of ['front','rear']){
      const shoe=p[side];
      pa[side+'Sole']=edge.map(q=>toWorld(add(shoe.ankle,rotate(mul(sub(q,pins.shoe),shoeScale),shoe.theta))));
    }
    pa.staff=p.staff.map(toWorld);
    pa.rodProjection=p.rodProjection??1;
    if(p.hands){
      pa.hands={};
      for(const [s,h] of Object.entries(p.hands)){
        pa.hands[s]={...h,point:toWorld(h.point),wrist:toWorld(h.wrist),
          gap:h.gap*actorScale*stageScale,targetError:h.targetError*actorScale*stageScale};
      }
    }
    pa.frontPlanted=p.front.plant;pa.rearPlanted=p.rear.plant;
    return pa;
  }
  window.monkeyPoints=(x,dir,clock,cue={})=>worldPose(pose(clock,cue),x,dir);
  window.drawMonkey=(ctx,x,dir,clock,cue={})=>{
    if(!ctx)return window.monkeyPoints(x,dir,clock,cue);
    ctx.save();ctx.translate(x,ground);ctx.scale(dir<0?-actorScale:actorScale,actorScale);ctx.translate(-baseX,-originY);
    const p=draw(ctx,clock,{cue,pins:!!cue.pins,only:cue.only});ctx.restore();
    return worldPose(p,x,dir);
  };
})();
