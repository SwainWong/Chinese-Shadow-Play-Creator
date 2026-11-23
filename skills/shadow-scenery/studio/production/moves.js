/* The score uses a four-second local clock. Points are authored on the leather puppet.
   One row: seconds, shaft angle, lead hand's fraction from end A, hand X/Y from its
   shoulder, coat inclination, waist height above the soles. Clock/angle grow on screen. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  function step(a,b,t){const u=clamp((t-a)/(b-a));return u*u*(3-2*u);}
  const hold=(t,a,b,c,d)=>step(a,b,t)*(1-step(c,d,t));
  const mix=(a,b,q)=>a+(b-a)*q;
  // Shape-preserving cubic interpolation: a sustained mark has zero speed,
  // while a hand in transit can cross intermediate marks without a little stop.
  function sample(rows,t,col=1){
    const last=rows.length-1;
    if(t<=rows[0][0])return rows[0][col];
    if(t>=rows[last][0])return rows[last][col];
    const rate=i=>(rows[i+1][col]-rows[i][col])/(rows[i+1][0]-rows[i][0]);
    function slope(i){
      if(i===0||i===last)return 0;
      const a=rate(i-1),b=rate(i);
      return a*b>0?2*a*b/(a+b):0;
    }
    let i=0;while(rows[i+1][0]<t)i++;
    const a=rows[i],b=rows[i+1],h=b[0]-a[0],u=(t-a[0])/h;
    return mix(a[col],b[col],u*u*(3-2*u))+h*u*(1-u)*((1-u)*slope(i)-u*slope(i+1));
  }
  const scores=[
    {name:'金猴醒山',family:'开场亮相',note:'捋棒抬眼，提靴亮掌。',accent:2.5,x:602,
      body:[[0,24,.51,6,41,10,75],[.70,27,.51,8,45,15,71],[1.42,4,.50,2,31,2,88],[2.5,-49,.48,-20,42,-12,97],[3.18,-49,.48,-20,42,-12,97],[4,-29,.47,-12,35,-4,89]],
      feet:[21,-23],gesture:'wake',steps:[['rear',.52,1.19,-43,29],['front',1.67,3.72,34,62]]},
    {name:'探海戳云',family:'前送',note:'棒头朝前，踏步送出，再收到腰边。',accent:2.25,x:553,
      body:[[0,-21,.23,-10,36,-4,91],[.66,-7,.11,-44,34,-12,88],[1.35,-4,.045,-54,31,-15,76],[1.58,-4,.045,-54,31,-15,76],[2.25,-4,.045,28,33,19,83],[2.55,-4,.045,28,33,19,83],[3.28,-12,.14,-19,39,4,85],[4,-29,.23,-9,38,-5,90]],
      feet:[22,-23],gesture:'poke',steps:[['rear',.25,.77,14,23],['front',1.32,2.22,109,33],['rear',2.66,3.16,67,42]]},
    {name:'当头拍月',family:'下拍',note:'棒影先高悬，随着腰身拍低。',accent:2.375,x:648,
      body:[[0,-26,.26,18,27,-2,83],[.68,-80,.22,24,-8,-15,92],[1.26,-124,.26,4,-42,-20,98],[1.62,-117,.25,7,-42,-18,97],[1.92,-60,.25,32,-28,1,94],[2.375,34,.22,28,17,23,77],[2.65,34,.23,25,16,22,77],[3.18,13,.33,18,36,8,83],[4,-20,.39,8,37,-2,90]],
      feet:[30,-31],gesture:'both',steps:[['front',1.18,2.08,71,54],['rear',2.91,3.60,-8,26]]},
    {name:'却步藏锋',family:'退步',note:'目光留在原处，双靴交替退向山门。',accent:2.5,x:723,
      body:[[0,1,.10,30,27,12,88],[.54,-3,.10,28,30,14,86],[1.1,-31,.24,5,31,-4,90],[1.71,-71,.36,-20,28,-10,83],[2.5,-112,.45,-35,38,-14,77],[3.03,-109,.45,-32,36,-11,77],[4,-72,.41,-20,31,-4,89]],
      feet:[24,-22],gesture:'retreat',steps:[['rear',.43,1.03,-70,37],['front',1.06,1.62,-39,28],['rear',1.66,2.46,-131,50],['front',2.80,3.32,-89,29]]},
    {name:'低身扫叶',family:'低扫',note:'低腰开步，长棒从身侧扫过。',accent:2.25,x:628,
      body:[[0,-145,.30,-27,28,-5,88],[.61,-171,.20,-34,41,-9,75],[1.13,-194,.20,-23,60,7,63],[1.48,-244,.26,14,65,15,61],[1.83,-312,.30,27,58,23,63],[2.25,-358,.13,36,55,27,65],[2.70,-357,.13,34,55,26,65],[3.27,-381,.24,13,48,14,79],[4,-394,.32,-4,34,3,90]],
      feet:[27,-28],gesture:'sweep',steps:[['rear',.39,.95,-45,31],['front',1.47,2.21,61,25]]},
    {name:'挑帘望月',family:'挑举',note:'低棒挑起，猴脸循棒梢仰望。',accent:2.5,x:615,
      body:[[0,2,.32,-3,38,7,86],[.73,32,.30,22,38,16,71],[1.23,32,.30,22,38,17,70],[1.81,4,.24,41,26,10,83],[2.5,-65,.13,36,-11,-9,96],[2.97,-65,.13,36,-11,-9,96],[3.50,-49,.22,19,0,-5,88],[4,-29,.32,13,27,-1,88]],
      feet:[22,-27],gesture:'lift',steps:[['front',.41,1.06,51,34],['rear',1.88,3.45,-32,51]]},
    {name:'移星换把',family:'移握',note:'近手留住棍身，远手松开，移向金箍再扣。',accent:2.625,x:635,
      body:[[0,-12,.46,26,42,0,84],[.70,-5,.46,27,40,-9,88],[1.16,-6,.48,29,39,-7,87],[1.72,-8,.48,29,39,-5,85],[2.14,-9,.43,27,37,0,84],[2.625,-12,.37,25,37,8,80],[3,-12,.37,25,37,8,80],[4,-24,.39,24,35,0,87]],
      feet:[32,-33],gesture:'regrip',steps:[['rear',.21,.68,-40,22]]},
    {name:'双花照面',family:'盘花',note:'两周棍花绕身展开，手与棒心一同走弧。',accent:2.625,x:656,
      body:[[0,-26,.52,17,33,0,83],[.45,-76,.53,37,15,-6,93],[.90,-166,.52,23,37,-13,86],[1.23,-245,.51,-3,54,-6,77],[1.62,-341,.50,26,57,5,81],[1.98,-442,.49,53,27,-4,91],[2.31,-545,.50,13,33,-11,85],[2.625,-693,.49,13,58,12,76],[2.97,-719,.51,40,45,13,82],[3.47,-741,.52,13,33,2,87],[4,-742,.52,12,32,-1,90]],
      feet:[29,-24],gesture:'wheel',steps:[['front',.40,.97,56,39],['rear',1.70,2.40,-21,48]]},
    {name:'独足听风',family:'独足',note:'一靴悬起，悟空侧耳；棍在身后压住影形。',accent:2.25,x:632,
      body:[[0,9,.55,4,43,7,80],[.71,30,.63,-16,45,-4,80],[1.37,50,.69,-28,47,-15,92],[2.25,69,.72,-38,35,-21,99],[2.86,69,.72,-38,35,-21,99],[3.42,42,.61,-23,42,-8,88],[4,10,.53,-5,39,2,82]],
      feet:[28,-22],gesture:'listen',steps:[['rear',.3,.85,-36,28],['front',1.04,3.46,32,80]]},
    {name:'腾云横渡',family:'腾云',note:'一靴蹬台，团身越云，前靴寻地。',accent:2.125,x:508,
      body:[[0,-45,.41,-13,34,3,82],[.52,-63,.39,-17,46,21,64],[.88,-46,.39,-18,35,-4,100],[1.47,-35,.45,-19,33,2,89],[2.125,-25,.43,-14,16,13,86],[2.55,-28,.44,-10,21,8,88],[3.22,-40,.40,-12,35,0,96],[3.50,-35,.38,-12,47,16,70],[4,-31,.37,5,33,3,87]],
      feet:[27,-36],gesture:'cloud',steps:[]},
    {name:'回身指路',family:'翻面',note:'影偶绕支撑靴转过窄边，另一面指向来路。',accent:2.375,x:651,
      body:[[0,-12,.41,-12,22,8,86],[.77,-48,.49,0,41,11,80],[1.27,-87,.50,-7,37,-4,86],[1.66,-85,.50,-5,35,-7,87],[2.375,-11,.23,3,38,14,89],[2.92,-11,.23,3,38,14,89],[3.52,-30,.36,-12,42,2,82],[4,-42,.40,-15,34,-3,87]],
      feet:[24,-22],gesture:'turn',steps:[['rear',.53,1.91,24,47],['rear',2.03,2.59,-45,36]]},
    {name:'立棒定山',family:'立棒',note:'棒脚落台，悟空倚棒收势。',accent:2.75,x:646,
      body:[[0,3,.48,16,42,6,80],[.72,-15,.51,29,35,-2,87],[1.23,-56,.55,43,15,-8,95],[1.90,-86,.60,53,15,-6,94],[2.39,-90,.63,57,33,0,88],[2.75,-90,.60,58,42,4,82],[3.35,-90,.60,58,42,4,82],[4,-90,.60,58,42,4,82]],
      feet:[34,-32],gesture:'pillar',steps:[['front',.70,1.43,57,33]]}
  ];
  scores.push(
    {name:'棍上望岳',family:'立棍加演',note:'棒脚定在台心，腾身收膝，一靴踏上棒头望山。',accent:2.125,x:597,
      body:[[0,-90,.62,28,15,-1,89],[.55,-90,.62,28,24,11,72],[.875,-90,.64,30,17,-3,98],[1.4,-90,.84,35,13,17,68],[1.88,-90,.92,36,19,34,53],[2.125,-90,.92,36,19,34,53],[2.56,-90,.92,36,19,34,53],[3.18,-90,.75,24,21,4,87],[3.375,-90,.64,30,27,6,68],[4,-90,.62,28,15,1,88]],
      feet:[17,-25],gesture:'perch',steps:[]},
    {name:'连珠点云',family:'三点加演',note:'棒影向前连点三次，每点之间留出回程。',accent:2.625,x:579,
      body:[[0,-5,.045,-38,26,-9,86],[.58,-5,.045,-45,26,-12,77],[1.125,-5,.045,29,26,18,85],[1.45,-5,.045,-47,27,-9,76],[1.875,-5,.045,32,26,18,83],[2.15,-5,.045,-48,28,-11,76],[2.625,-5,.045,38,26,23,86],[2.88,-5,.045,34,28,20,83],[3.39,-12,.14,-17,37,4,82],[4,-22,.22,-11,38,-3,87]],
      feet:[24,-24],gesture:'triple',steps:[['front',.46,1.07,69,25],['rear',1.25,1.66,27,28],['front',1.98,2.58,112,32]]},
    {name:'走花归山',family:'走花加演',note:'棍花随两靴过山门，最后一响停在斜肩。',accent:3.25,x:537,
      body:[[0,-18,.50,23,24,-4,88],[.47,-89,.48,39,16,4,92],[.875,-182,.50,9,33,-8,85],[1.23,-255,.50,8,32,8,88],[1.625,-353,.50,31,44,5,83],[1.94,-453,.51,40,18,-8,89],[2.25,-565,.51,5,29,3,87],[2.62,-676,.49,22,34,5,87],[3.08,-721,.49,40,22,3,93],[3.25,-754,.51,7,37,-8,92],[4,-754,.51,7,37,-8,92]],
      feet:[23,-20],gesture:'walkingWheel',steps:[['rear',.15,.70,48,35],['front',.76,1.29,103,46],['rear',1.35,1.90,132,34],['front',1.96,2.60,181,46],['rear',2.65,3.2,126,26]]}
  );
  // Each mark specifies the open angle of the longest supporting leg, weight travel
  // toward the near shoe, and extra coat pitch. The heel positions remain independent.
  const bearing={
    wake:[[0,114,0,3],[.7,91,-7,6],[1.45,133,-8,-6],[2.5,151,-15,-9],[3.18,150,-15,-9],[4,124,0,-4]],
    poke:[[0,131,-3,-4],[.78,123,-7,-4],[1.58,106,-11,-3],[2.25,151,25,4],[2.55,149,25,4],[3.32,122,2,-4],[4,138,0,-6]],
    both:[[0,126,0,-5],[.67,142,-9,-9],[1.3,151,-10,-12],[1.65,149,-12,-11],[2.375,132,24,10],[2.65,131,24,10],[3.3,123,6,2],[4,141,4,-3]],
    retreat:[[0,144,6,-4],[.52,124,-5,2],[1.07,134,-6,-4],[1.62,124,-3,0],[2.5,139,-25,-10],[3.15,122,-8,-5],[4,142,0,-6]],
    sweep:[[0,134,0,-7],[.72,119,-4,2],[1.36,99,-12,11],[1.85,112,4,13],[2.25,135,25,16],[2.7,135,25,16],[3.26,118,0,5],[4,142,0,-5]],
    lift:[[0,126,0,-4],[.85,102,8,8],[1.25,99,8,10],[1.83,121,9,0],[2.5,149,12,-12],[2.94,149,12,-13],[3.55,126,5,-5],[4,141,0,-5]],
    regrip:[[0,133,0,-6],[.72,146,-8,-4],[1.53,130,-7,0],[2.1,116,-5,4],[2.625,139,16,3],[3.0,139,16,3],[4,146,1,-5]],
    wheel:[[0,124,-2,-4],[.45,149,-12,-8],[.94,133,-8,-8],[1.28,103,5,4],[1.62,118,9,9],[1.98,148,-2,-6],[2.31,123,10,2],[2.625,112,12,8],[2.98,130,6,5],[4,145,0,-7]],
    listen:[[0,124,0,0],[.71,105,-4,4],[1.37,138,-8,-5],[2.25,152,-14,-7],[2.86,152,-14,-7],[3.52,119,0,1],[4,136,1,-4]],
    cloud:[[0,135,0,-5],[.52,101,9,10],[.88,151,-9,-5],[1.08,151,-9,-5],[1.63,128,0,3],[2.125,142,4,4],[2.6,130,3,4],[3.22,146,-4,-6],[3.50,103,2,9],[4,140,0,-5]],
    turn:[[0,139,3,-4],[.77,115,4,5],[1.27,147,6,-3],[1.66,148,2,-5],[2.375,146,15,4],[2.92,146,15,4],[3.54,117,2,4],[4,138,0,-4]],
    pillar:[[0,129,0,-4],[.71,116,-5,5],[1.23,147,-6,-7],[1.90,151,0,-7],[2.39,133,4,-4],[2.75,142,6,-7],[4,142,6,-7]],
    perch:[[0,139,2,-5],[.55,103,4,5],[.875,150,-4,-5],[1.4,106,2,6],[1.88,97,-2,8],[2.56,97,-2,8],[3.18,139,3,-2],[3.375,105,6,6],[4,139,1,-5]],
    triple:[[0,133,-2,-3],[.58,103,-7,-3],[1.125,146,19,6],[1.45,106,-8,-5],[1.875,145,22,5],[2.15,103,-9,-5],[2.625,151,24,7],[2.88,148,23,6],[3.39,123,1,-2],[4,141,0,-6]],
    walkingWheel:[[0,134,0,-4],[.47,144,0,-4],[.875,122,4,4],[1.23,134,-3,-2],[1.625,120,6,6],[1.94,145,-4,-5],[2.25,124,8,4],[2.62,131,-1,2],[3.08,144,3,-6],[3.25,151,5,-9],[4,151,5,-9]]
  };
  const beats=[
    [[.71,'step'],[1.53,'lift']],[[.71,'step'],[1.52,'gather'],[3.10,'step']],
    [[1.28,'lift'],[3.16,'settle']],[[1.05,'step'],[1.62,'step'],[3.30,'step']],
    [[.88,'step'],[1.58,'sweep']],[[1.08,'step'],[1.82,'lift']],[[1.08,'catch'],[1.73,'release']],
    [[.92,'circle'],[1.65,'circle'],[2.28,'circle']],[[.82,'step'],[1.34,'lift']],
    [[.88,'takeoff'],[3.27,'land']],[[.77,'step'],[1.55,'turn']],[[1.42,'step'],[2.36,'gather']],
    [[.875,'takeoff'],[3.375,'land']],[[1.125,'point'],[1.875,'point']],[[.875,'circle'],[1.625,'circle'],[2.25,'circle']]
  ];
  for(const [index,s] of scores.entries())s.events=beats[index].map(([t,type])=>({t,type}));
  function footAt(s,side,t){
    let x=s.feet[side==='front'?0:1];
    for(const [which,a,b,target,high] of s.steps){
      if(which!==side||t<a)continue;
      if(t<b){
        const u=(t-a)/(b-a),h=Math.sin(Math.PI*u);
        return [mix(x,target,step(0,1,u)),high*h*h,-23*h+6*Math.sin(2*Math.PI*u)];
      }
      x=target;
    }
    return [x,0,0];
  }
  function cues(s,t){
    const val=col=>sample(s.body,t,col);
    const a=val(1),u=val(2),bar={lead:'rear',anchor:[val(3),val(4)],lean:val(5),
      rearU:u,frontU:Math.min(.97,u+.26),rearHold:1,frontHold:1,frontFree:[44,22],rearFree:[-35,42]};
    const c={bar,staffDeg:a,waistAboveSole:val(6),waistControl:1,inkTips:true,
      feet:{front:footAt(s,'front',t),rear:footAt(s,'rear',t)},look:0,nod:0};
    const b=(a,b,c,d)=>hold(t,a,b,c,d);
    const load=bearing[s.gesture];
    c.supportAngle=sample(load,t);
    c.weightShift=sample(load,t,2);
    bar.lean+=sample(load,t,3);
    switch(s.gesture){
      case 'wake':
        bar.frontHold=1-b(.55,.96,2.98,3.69);bar.anchor[0]-=14*b(.65,1.34,3.19,3.78);bar.frontFree=[79,-9];bar.frontStyle='palm';c.look=.80*b(.69,1.62,2.93,3.66);break;
      case 'triple':
      case 'poke':
        bar.lead='front';
        bar.frontU=s.gesture==='poke'?Math.max(.075,u):u;
        bar.rearU=bar.frontU+.20;
        bar.anchor[0]+=11*step(-20,25,bar.anchor[0]);
        c.nod=.65*b(1.56,2.17,2.53,3.08);break;
      case 'both':
        c.staffDeg+=9*b(1.74,2.375,2.64,3.3);bar.anchor[1]+=8*b(1.74,2.375,2.64,3.3);bar.anchor[0]+=12*b(1.81,2.375,2.62,3.26);bar.frontU=u+.25;bar.anchor[0]+=16*b(.59,1.2,1.66,2.18);bar.anchor[1]-=8*b(.59,1.2,1.66,2.18);c.look=.55*b(.5,.98,1.6,2.12);c.nod=b(1.75,2.26,2.85,3.48);break;
      case 'retreat':
        bar.frontHold=1-b(.82,1.34,2.89,3.47);bar.anchor[0]-=13*b(1,1.65,2.85,3.5);bar.frontFree=[77,-3];bar.frontStyle='palm';c.look=.25*b(.9,1.52,2.63,3.23);break;
      case 'sweep':{
        // A low sweep describes a shallow ellipse across the screen. The same
        // physical staff narrows towards the viewer and opens out to the opposite side.
        const yaw=sample([[0,164],[.69,175],[1.05,173],[1.47,132],[1.84,62],[2.25,4],[2.70,4],[3.33,-17],[4,-27]],t)*Math.PI/180;
        const px=Math.cos(yaw),py=.26*Math.sin(yaw);
        c.staffDeg=Math.atan2(py,px)*180/Math.PI+28*b(1.33,2.25,2.70,3.4);
        bar.projectedRatio=Math.hypot(px,py);
        bar.rearU=.12;bar.frontU=.45;bar.frontHold=1-b(.99,1.35,1.88,2.21);
        bar.frontFree=[-8,43];c.nod=.82*b(.85,1.45,2.60,3.06);break;
      }
      case 'lift':
        bar.rearU=u+.065*b(1.65,2.43,2.99,3.5);bar.frontU=bar.rearU+.22;bar.frontHold=1-b(1.46,1.91,2.99,3.44);bar.frontFree=[-50,67];bar.frontStyle='palm';bar.anchor[0]+=17*b(1.43,2.26,3,3.65);bar.anchor[1]-=14*b(1.43,2.26,3,3.65);c.look=.94*b(1.47,2.32,2.95,3.63);break;
      case 'regrip':{
        bar.lead='front';bar.frontU=u+.065;bar.frontHold=1;bar.anchor[0]+=21*b(.92,1.52,3.06,3.69);
        bar.rearU=sample([[0,.31],[1.1,.31],[1.67,.28],[2.46,.043],[4,.043]],t);
        bar.rearHold=1-b(1.08,1.42,1.82,2.625);
        bar.rearFree=[-59,49];bar.rearStyle='palm';c.nod=.72*b(1.10,1.61,2.62,3.07);break;
      }
      case 'walkingWheel':
        bar.frontU=u+.13+.26*step(2.67,3.2,t);bar.anchor[0]-=35*step(2.67,3.2,t);bar.anchor[1]+=9*step(2.67,3.2,t);bar.frontHold=1-b(.28,.62,2.75,3.15);bar.frontFree=[-34,44];bar.frontStyle='palm';break;
      case 'perch':
        c.rearFold=b(.93,1.55,2.62,3.24);c.airLegs={rear:[-80,48,-14]};
        c.look=.85*b(1.28,1.85,2.64,3.24);
        bar.frontFree=[73,-4];bar.rearFree=[-56,8];bar.frontStyle='point';bar.rearStyle='palm';
        bar.frontHold=1-b(.83,1.29,2.89,3.30);
        bar.rearHold=1-b(.78,1.21,3.00,3.37);break;
      case 'wheel':
        bar.anchor[1]-=31*Math.pow(Math.max(0,Math.sin(a*Math.PI/180)),2);
        bar.frontU=u+.29;bar.anchor[0]+=16*b(.34,.82,2.45,3.27);bar.frontHold=1-b(.10,.83,2.34,2.625);bar.frontFree=[-23,42];bar.frontStyle='palm';break;
      case 'listen':
        bar.lead='front';bar.frontU=u;bar.rearU=Math.max(.02,u-.22);
        bar.frontHold=1;bar.rearHold=1-b(.55,1.08,2.98,3.63);bar.rearFree=[-10,-30];bar.rearStyle='palm';c.look=.4*b(.96,1.74,2.82,3.46);break;
      case 'cloud':
        const airHand=b(.93,1.48,2.68,3.13);
        bar.anchor[0]+=12*airHand;bar.anchor[1]+=30*airHand;
        c.tuck=b(.94,1.53,2.49,3.13);c.frontFold=b(1.02,1.68,2.47,3.02);c.rearFold=b(1.17,1.72,2.62,3.32);
        bar.frontHold=1-b(.51,.85,2.72,3.29);c.airLegs={front:[47,66,-18],rear:[-102,38,-19]};bar.frontFree=[-12,82];bar.frontStyle='palm';break;
      case 'turn':
        bar.frontHold=1-b(1.47,1.94,2.98,3.49);bar.frontFree=[79,-9];bar.anchor[0]-=12*b(1.66,2.24,2.97,3.62);bar.frontStyle='point';c.look=.44*b(1.55,2.2,2.91,3.47);break;
      case 'pillar':
        bar.frontU=u-.30;bar.frontHold=1-b(.26,.62,1.22,1.73);bar.frontStyle='palm';c.look=.5*b(.6,1.32,1.89,2.63);break;
    }
    return c;
  }
  const ground=560;
  const nativeScale=1.53*238/395;
  function raiseOverShoes(cue,p){
    const {thigh,shin}=window.cast.wukong.bone;
    const radians=cue.supportAngle*Math.PI/180;
    const span=nativeScale*Math.sqrt(thigh*thigh+shin*shin-2*thigh*shin*Math.cos(radians));
    let target=Infinity,ceiling=Infinity;
    for(const side of ['rear','front']){
      const [x,h]=cue.feet[side],socket=p[side+'Hip'];
      const horizontal=x*nativeScale-socket[0];
      const level=580-(580-nativeScale*(16.928+h))+socket[1]-p.hip[1];
      const waistFor=length=>level+Math.sqrt(Math.max(0,length*length-horizontal*horizontal));
      if(h<.01)target=Math.min(target,waistFor(span));
      ceiling=Math.min(ceiling,waistFor(nativeScale*Math.sqrt(thigh*thigh+shin*shin-2*thigh*shin*Math.cos(153*Math.PI/180))));
    }
    cue.waistAboveSole=Math.min(ceiling,Number.isFinite(target)?target:cue.waistAboveSole);
  }
  function drawMove(ctx,index,seconds,pins=false){
    const s=scores[index],t=Math.max(0,Math.min(4,seconds)),cue=cues(s,t);
    const scale=s.gesture==='perch'?1.18:1.39;
    const clock=.28;cue.pins=!!pins;
    let p=window.drawMonkey(null,0,1,clock,cue);
    raiseOverShoes(cue,p);
    p=window.drawMonkey(null,0,1,clock,cue);
    if(s.gesture==='listen'){
      // Follow the ear cut into this actual face plate. The palm approaches from
      // behind the cheek and the elbow opens towards the back of the cap.
      const native=1.53*238/395;
      cue.bar.rearFree=[(p.ear[0]-p.rearShoulder[0])/native-9,
        (p.ear[1]-p.rearShoulder[1])/native+3];
      p=window.drawMonkey(null,0,1,clock,cue);
    }
    if(s.gesture==='pillar'&&t>1.90){
      // With the shaft upright, set its lower tip exactly on the floor at the final beat.
      const w=step(1.90,2.75,t),y=p.hands.rear.point[1],dy=p.staff[0][1]-p.staff[1][1];
      const floorU=(580-y)/dy;
      cue.bar.rearU=Math.min(mix(cue.bar.rearU,floorU,w),floorU-(1-w)*.035);cue.bar.frontU=cue.bar.rearU-.30;
      p=window.drawMonkey(null,0,1,clock,cue);
    }
    let turn=1,about=0,flight=0,travel=0,tilt=0,cloud=0;
    if(s.gesture==='turn'){
      turn=Math.cos(Math.PI*step(1.17,1.89,t));
      about=p.frontAnkle[0];
    }
    if(s.gesture==='cloud'){
      flight=sample([[0,0],[.9,0],[1.13,47],[1.68,114],[2.125,130],[2.64,100],[3.07,42],[3.27,0],[4,0]],t);
      travel=217*step(.89,3.27,t);
      tilt=sample([[0,0],[.9,0],[1.38,19],[2.125,47],[2.57,31],[3.08,-5],[3.27,0],[4,0]],t)*Math.PI/180;
      cloud=hold(t,1.24,1.68,2.74,3.07);
    }
    let perch=null;
    if(s.gesture==='perch'){
      const phase=sample([[0,0],[.78,0],[.875,.035],[1.22,.40],[1.65,.89],[1.92,1],[2.58,1],[2.89,.76],[3.19,.19],[3.375,0],[4,0]],t);
      const shoe=p.frontSole[2],barLength=Math.hypot(p.staff[1][0]-p.staff[0][0],p.staff[1][1]-p.staff[0][1]);
      const poleX=65,nativeScale=1.53*238/395;
      flight=phase*scale*(barLength+shoe[1]-580);
      travel=phase*scale*(poleX-shoe[0]);
      cue.bar.support={base:[(poleX-travel/scale)/nativeScale,flight/(scale*nativeScale)],u:0,weight:1};
      cue.bar.rearU=Math.min(.96,.62+flight/(scale*barLength));
      cue.bar.frontU=Math.min(.98,.81+flight/(scale*barLength));
      p=window.drawMonkey(null,0,1,clock,cue);
      perch={active:phase>=.9999,phase};
    }
    const cos=Math.cos(tilt),sin=Math.sin(tilt);
    function stage(q){
      const dx=q[0]-p.hip[0],dy=q[1]-p.hip[1];
      const x=p.hip[0]+dx*cos-dy*sin,y=p.hip[1]+dx*sin+dy*cos;
      return [s.x+travel+scale*(about+turn*(x-about)),ground-flight+scale*(y-580)];
    }
    const frontSole=p.frontSole.map(stage),rearSole=p.rearSole.map(stage);
    const low=sole=>sole.reduce((a,b)=>a[1]>b[1]?a:b);
    const frontBottom=low(frontSole),rearBottom=low(rearSole),support=low([frontBottom,rearBottom]);
    if(ctx){
      if(cloud && window.drawCloud)window.drawCloud(ctx,support[0],support[1]+1,cloud,158);
      ctx.save();ctx.translate(s.x+travel,ground-flight);ctx.scale(scale,scale);
      ctx.translate(about,0);ctx.scale(turn,1);ctx.translate(-about,-580);
      ctx.translate(...p.hip);ctx.rotate(tilt);ctx.translate(-p.hip[0],-p.hip[1]);
      window.drawMonkey(ctx,0,1,clock,cue);ctx.restore();
    }
    const out={staff:p.staff.map(stage),rodProjection:p.rodProjection??1,hands:{},frontBottom,rearBottom,frontSole,rearSole,
      frontPlanted:p.frontPlanted&&!flight,rearPlanted:p.rearPlanted&&!flight,cloud,turn,flight,ground};
    if(perch)out.perch={...perch,point:out.staff[1],foot:frontSole[2],base:out.staff[0]};
    for(const k of ['hip','eye','ear','neck','frontHip','frontKnee','frontAnkle','rearHip','rearKnee','rearAnkle','frontShoulder','rearShoulder','frontElbow','rearElbow'])out[k]=stage(p[k]);
    for(const [side,h] of Object.entries(p.hands)){
      const center=stage(h.point);
      out.hands[side]={...h,point:center,center,wrist:stage(h.wrist),weight:h.hold,
        closed:h.closed??h.style==='fist',gap:h.gap*scale,targetError:h.targetError*scale};
    }
    return out;
  }
  window.moves=scores;
  window.drawMove=drawMove;
})();
