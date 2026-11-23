const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(process.argv[2] || path.join(__dirname,'../../shadow-performance/studio'));
const D=180/Math.PI, r=x=>Math.round(x*10000)/10000;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const angle=(u,v)=>Math.atan2(u[0]*v[1]-u[1]*v[0],u[0]*v[0]+u[1]*v[1])*D;
const deg=a=>Math.atan2(a[1],a[0])*D;
const shift=(a,b)=>Math.abs((a-b+540)%360-180);
const range=a=>[Math.min(...a),Math.max(...a)].map(r);
const channels=['elbow','knee','ankle','upper','lower','thigh','shin','boot','upperLength','lowerLength','thighLength','shinLength'];
function inspect(dir){
 const w={}; const c=vm.createContext({window:w,document:{currentScript:{src:'http://study/production/monkey.js'}},URL,Image:class{decode(){return new Promise(()=>{});}}});
 for(const m of ['monkey','moves'])vm.runInContext(fs.readFileSync(path.join(dir,'production',m+'.js'),'utf8'),c);
 const fn=w.drawMonkey;let raw;
 w.drawMonkey=(...args)=>(raw=fn(...args));
 const list=[];
 for(let i=0;i<15;i++){
  const frames=[],summary={};
  for(let f=0;f<96;f++){
   const stage=w.drawMove(null,i,f/24),frame={};
   for(const s of ['front','rear']){
    const upper=sub(raw[s+'Elbow'],raw[s+'Shoulder']),lower=sub(raw.hands[s].wrist,raw[s+'Elbow']);
    const thigh=sub(raw[s+'Knee'],raw[s+'Hip']),shin=sub(raw[s+'Ankle'],raw[s+'Knee']);
    const sole=sub(raw[s+'Sole'][3],raw[s+'Sole'][1]);
    const inv=v=>v.map(a=>-a),array=[angle(inv(upper),lower),angle(inv(thigh),shin),angle(inv(shin),sole),
     ...[upper,lower,thigh,shin,sole].map(deg),...[upper,lower,thigh,shin].map(q=>Math.hypot(...q))];
    frame[s]=array.map(r);
    // On the reverse face, the whole puppet changes apparent handedness.
    // Check the rendered chain against the direction the leather faces.
    if(Math.abs(stage.turn)>1e-7){
      const sh=stage[s+'Shoulder'],el=stage[s+'Elbow'],w=stage.hands[s].wrist,
        hip=stage[s+'Hip'],knee=stage[s+'Knee'],ankle=stage[s+'Ankle'];
      const facing=Math.sign(stage.turn);
      frame[s+'OnScreen']={elbowSide:Math.sign(angle(sub(sh,el),sub(w,el)))*facing,
        kneeSide:Math.sign(angle(sub(hip,knee),sub(ankle,knee)))*facing,
        elbowDrop:r(raw[s+'Elbow'][1]-raw[s+'Shoulder'][1])};
    }
   }
   frame.plantError=Math.max(...['front','rear'].map(s=>stage[s+'Planted']?Math.abs(stage[s+'Bottom'][1]-stage.ground):0));
   frame.closedError=Math.max(...Object.values(stage.hands).map(x=>x.hold===1?x.targetError:0));
   frames.push(frame);
  }
  for(const side of ['front','rear']){
   const bounds={},speeds={};
   for(const [j,key] of channels.entries()){
    bounds[key]=range(frames.map(f=>f[side][j]));
    if(j<8){
     let top=0,frame=0;
     for(let f=1;f<96;f++){const delta=shift(frames[f][side][j],frames[f-1][side][j]);if(delta>top){top=delta;frame=f;}}
     speeds[key]={degreesPerFrame:r(top),endFrame:frame};
    }
   }
   summary[side]={bounds,speeds};
  }
  summary.maxFullyHeldError=r(Math.max(...frames.map(f=>f.closedError)));
  summary.maxPlantedSoleError=r(Math.max(...frames.map(f=>f.plantError)));
  list.push({name:w.moves[i].name,summary,frames});
 }
 return list;
}
const clips=inspect(root);
for(const [index,v] of clips.entries()){
 const c={name:v.name,n:index+1};
 assert.equal(v.frames.length,96);
 assert.ok(v.summary.maxFullyHeldError<.02,c.name+' closed fist');
 assert.ok(v.summary.maxPlantedSoleError<.02,c.name+' planted sole');
 for(const side of ['front','rear']){
  const b=v.summary[side].bounds,speed=v.summary[side].speeds;
  assert.ok(b.elbow[0]>=42.99&&b.elbow[1]<=158.01,c.name+' elbow aperture');
  assert.ok(b.knee[0]>=-158.01&&b.knee[1]<=-29.99,c.name+' knee aperture');
  assert.ok(b.ankle[0]>20&&b.ankle[1]<151,c.name+' boot/shin');
  for(const key of ['upperLength','lowerLength','thighLength','shinLength'])assert.ok(b[key][1]-b[key][0]<.001,c.name+' rigid length');
  for(const key of ['upper','lower','thigh','shin','boot'])assert.ok(speed[key].degreesPerFrame<52,c.name+' joint jump '+key);
  for(const f of v.frames){
   const s=f[side+'OnScreen'];if(!s)continue;
   assert.equal(s.elbowSide,1,c.name+' elbow cuts toward the coat back');
   assert.equal(s.kneeSide,-1,c.name+' knee points toward the toe');
   // These two horizontal, waist-level exchange pieces may retract the hand,
   // but the elbow should never rise above its shoulder or turn towards the cap.
   if(c.n===2||c.n===14)assert.ok(s.elbowDrop>0,c.name+' elbow above shoulder');
  }
 }
}
console.log(JSON.stringify({forms:clips.length,frames:clips.reduce((n,c)=>n+c.frames.length,0),result:'pass'}));
