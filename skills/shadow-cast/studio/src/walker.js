// The robes share assembly operations. Each puppet supplies its own cuts, hinge positions,
// lengths, silhouette and cadence. All distances are stage pixels. Positive y is down.
window.cast = window.cast || {};
const add=(p,q)=>[p[0]+q[0],p[1]+q[1]],minus=(p,q)=>[p[0]-q[0],p[1]-q[1]];
const times=(p,a)=>[p[0]*a,p[1]*a],lengthOf=p=>Math.hypot(...p);
const unit=p=>times(p,1/(lengthOf(p)||1)),normal=p=>[-p[1],p[0]];
const radians=d=>d*Math.PI/180,turn=(p,d)=>[p[0]*Math.cos(radians(d))-p[1]*Math.sin(radians(d)),p[0]*Math.sin(radians(d))+p[1]*Math.cos(radians(d))];
const bound=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
const tau=Math.PI*2;
function joint(origin,target,a,b,bend) {
 const v=minus(target,origin),u=unit(v),d=bound(lengthOf(v),Math.abs(a-b)+.001,a+b-.001);
 const offset=(a*a-b*b+d*d)/(2*d),lift=Math.sqrt(Math.max(0,a*a-offset*offset));
 return add(origin,add(times(u,offset),times(normal(u),bend*lift)));
}
const titles={head:'头茬',neck:'颈片',body:'上衣',hem:'袍摆',upper:'上袖',fore:'下袖',hand:'手',thigh:'大腿',shin:'小腿',shoe:'鞋',prop:'随身道具'};
function makeWalker(config){
 const {id,name,pins,geo,gait}=config;
 const names=['head','body','hem','upper','fore','hand','thigh','shin','shoe'];
 const art={},px={};
 if(config.held)names.push("grip","object");
 const ready=Promise.all(names.map(async n=>{
  const im=new Image();im.src='actors/'+id+'/'+n+'.webp';await im.decode();art[n]=im;
  const dim=p=>[im.width*p[0],im.height*p[1]];
  if(n==="grip"||n==="object")return;
  px[n]=Array.isArray(pins[n][0])?pins[n].map(dim):dim(pins[n]);
  const back=document.createElement('canvas');back.width=im.width;back.height=im.height;
  const g=back.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-atop';
  g.fillStyle='rgba(61,36,33,.18)';g.fillRect(0,0,im.width,im.height);art['far-'+n]=back;
 }));
 const parts=['neck','body','hem','head'].map(id=>({id,label:titles[id]}));
 for(const side of ['far','near'])for(const n of ['upper','fore','hand','thigh','shin','shoe']){
  parts.push({id:side+'-'+n,label:(side==='far'?'远侧':'近侧')+titles[n]});
 }
 if(config.prop)parts.push({id:'prop',label:({beads:'念珠',vase:'净瓶',staff:'锡杖'}[config.prop]||'道具')});
 function pose(t) {
  const step=t/gait.cycle,phase=step*tau,rootX=gait.beginX+step*gait.stride;
  const hip=[rootX,590-geo.hipHeight-gait.bob*Math.cos(phase*2-.3)];
  const tilt=gait.lean+Math.sin(phase)*1.3;
  const local=p=>add(hip,turn(p,tilt));
  const neck=local([0,-geo.torso]),head=add(neck,turn([0,-6],tilt));
  const limbs={};
  for(const [i,side] of ['near','far'].entries()){
   const shift=i*.5,ph=step+shift,u=ph-Math.floor(ph),stance=gait.stance??.61;
   const swing=bound((u-stance)/(1-stance),0,1),flight=Math.sin(Math.PI*swing);
   const smooth=swing*swing*(3-2*swing);
   const x=gait.beginX+gait.stride*(Math.floor(ph)-shift+stance/2+smooth)+(i?-4:4);
   const sole=[x,590-gait.lift*flight**1.28];
   const toeAngle=flight*(17-34*swing);
   const heelToSole=[(0.44-pins.shoe[0])*geo.shoe[0],(1-pins.shoe[1])*geo.shoe[1]];
   const ankle=minus(sole,turn(heelToSole,toeAngle));
   const socket=local([i?-5:5,1]);
   const knee=joint(socket,ankle,geo.thigh[0],geo.shin[0],-1);
   const shoulder=local([i?-7:4,-geo.torso+geo.shoulder]);
   const wave=Math.cos(ph*tau+.2);
   let target=add(shoulder,[gait.armX-gait.swing*wave,gait.armY+4*Math.sin(ph*tau)]);
   if(config.prop==='vase'&&!i)target=add(shoulder,[51+3*wave,38+2*Math.sin(phase)]);
   if(config.prop==='staff'&&!i)target=add(shoulder,[63-6*wave,49+3*Math.sin(phase)]);
   const reach=minus(target,shoulder),limit=geo.upper[0]+geo.fore[0]-.5;
   if(lengthOf(reach)>limit)target=add(shoulder,times(unit(reach),limit));
   const elbow=joint(shoulder,target,geo.upper[0],geo.fore[0],1);
   limbs[side]={sole,ankle,socket,knee,shoulder,elbow,wrist:target,toeAngle,swing};
  }
  return {hip,neck,head,tilt,phase,limbs};
 }
 function draw(ctx,t,options={}){
  const {pins:debug=false,only=''}=options,p=pose(t);
  const see=id=>!only||only==='all'||id===only;
  const artKey=(name,side)=>art[(side==='far'?'far-':'')+name];
  function part(name,side,fn){if(see(side?side+'-'+name:name))fn(artKey(name,side));}
  function plate(name,side,at,size,angle){
   part(name,side,im=>{ctx.save();ctx.translate(...at);ctx.rotate(radians(angle));
    ctx.drawImage(im,-pins[name][0]*size[0],-pins[name][1]*size[1],...size);ctx.restore();});
  }
  function link(name,side,a,b,width){
   part(name,side,im=>{
    const [start,end]=px[name],s=unit(minus(end,start)),n=normal(s),v=minus(b,a),u=unit(v);
    const along=times(u,lengthOf(v)/lengthOf(minus(end,start))),cross=times(normal(u),width/im.width);
    const x=add(times(along,s[0]),times(cross,n[0])),y=add(times(along,s[1]),times(cross,n[1]));
    ctx.save();ctx.transform(x[0],x[1],y[0],y[1],a[0],a[1]);
    ctx.drawImage(im,-start[0],-start[1]);ctx.restore();
   });
  }
  function leg(side){
   const l=p.limbs[side];plate('shoe',side,l.ankle,geo.shoe,l.toeAngle);
   link('shin',side,l.knee,l.ankle,geo.shin[1]);link('thigh',side,l.socket,l.knee,geo.thigh[1]);
  }
  function arm(side){
   const l=p.limbs[side];link('upper',side,l.shoulder,l.elbow,geo.upper[1]);
   link('fore',side,l.elbow,l.wrist,geo.fore[1]);
  }
  function hand(side){
   const l=p.limbs[side],v=minus(l.wrist,l.elbow);
   if(side==='near'&&config.held){
    if(see('near-hand')){
     const h=config.held;ctx.save();ctx.translate(...l.wrist);ctx.rotate(radians(h.angle));
     ctx.drawImage(art.grip,-h.pin[0]*h.hand[0],-h.pin[1]*h.hand[1],...h.hand);ctx.restore();
    }return;
   }
   const a=Math.atan2(v[1],v[0])*180/Math.PI*.53+(config.prop==='vase'?-14:2);
   plate('hand',side,l.wrist,geo.hand,a);
  }
  function prop(){
   if(!config.prop||!see('prop'))return;
   if(config.held){
    const h=config.held;
    const v=[(h.socket[0]-h.pin[0])*h.hand[0],(h.socket[1]-h.pin[1])*h.hand[1]];
    const center=add(p.limbs.near.wrist,turn(v,h.angle));
    ctx.save();ctx.translate(...center);ctx.rotate(radians(h.sway*Math.sin(p.phase)));
    ctx.drawImage(art.object,-h.grasp[0]*h.size[0],-h.grasp[1]*h.size[1],...h.size);
    ctx.restore();return;
   }
   const h=add(p.limbs.near.wrist,[geo.hand[0]*.54,geo.hand[1]*.25]);
   ctx.save();ctx.translate(...h);
   if(config.prop==='beads'){
    ctx.rotate(.12*Math.sin(p.phase-.65));ctx.strokeStyle='#66391d';ctx.lineWidth=1.6;ctx.beginPath();
    ctx.ellipse(0,18,10,21,0,0,tau);ctx.stroke();
    for(let i=0;i<16;i++){const a=i*tau/16;ctx.beginPath();ctx.arc(10*Math.cos(a),18+21*Math.sin(a),3.2,0,tau);
     ctx.fillStyle=i%4?'#854e2b':'#bd914c';ctx.fill();ctx.stroke();}
   }
   ctx.restore();
  }
  leg('far');arm('far');hand('far');leg('near');
  if(see('neck')){ctx.save();ctx.strokeStyle=config.neckColor||'#bc8456';ctx.lineWidth=18;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.neck[0],p.neck[1]+9);ctx.lineTo(p.head[0],p.head[1]-8);ctx.stroke();ctx.restore();}
  link('body',null,p.neck,p.hip,geo.bodyW);
  plate('hem',null,p.hip,geo.hem,p.tilt*.32+gait.hemSwing*Math.sin(p.phase-.4));
  plate('head',null,p.head,geo.head,p.tilt*.55+gait.headNod*Math.sin(p.phase*2-.52));
  arm('near');prop();hand('near');
  if(debug){
   ctx.save();ctx.lineWidth=2;
   for(const [side,color] of [['far','#284e7b'],['near','#16806c']]){
    ctx.strokeStyle=color;ctx.fillStyle=color;const l=p.limbs[side];
    for(const path of [[l.socket,l.knee,l.ankle,l.sole],[l.shoulder,l.elbow,l.wrist],[p.hip,p.neck,p.head]]){
     ctx.beginPath();path.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.stroke();
     path.forEach(q=>{ctx.beginPath();ctx.arc(...q,3.2,0,tau);ctx.fill();});
    }
   }ctx.restore();
  }
  return p;
 }
 return {name,description:config.description,parts,ready,draw,pose,config};
}
