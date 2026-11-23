// A 1280 × 720 fixed proscenium. The close-up samples the same rendered instant.
const canvas = document.querySelector('#film');
const ink = canvas.getContext('2d');
const stage = document.createElement('canvas');
stage.width = 1280; stage.height = 580;
const paint = stage.getContext('2d');
const scenery = {};
for (const [id,file] of Object.entries({mountain:'mountain-screen.webp',cloud:'cloud.webp'})){
  const im = new Image();
  im.src = new URL('../assets/'+file, document.currentScript.src).href;
  scenery[id] = im;
}
const numerals = ['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五'];
function label(ctx,text,x,y,size,color,serif=true,weight=400){
  ctx.font = weight+' '+size+'px '+(serif?'"Songti SC","Noto Serif CJK SC",serif':'-apple-system,"PingFang SC",sans-serif');
  ctx.fillStyle = color; ctx.fillText(text,x,y);
}
window.drawCloud = function(ctx,x,y,opacity=1,width=140){
  if(opacity<=0)return;
  ctx.save();ctx.globalAlpha*=opacity;
  ctx.drawImage(scenery.cloud,x-width*.75,y,width,width*.392);
  ctx.restore();
};
function gripDiagram(hands){
  const x=525, end=798, y=647, span=end-x;
  label(ink,'棒上握位',x,608,16,'#d3b28a');
  label(ink,'上 · 近手    下 · 远手',x+130,608,13,'#c3ab89');
  ink.fillStyle='#ac4e36';ink.fillRect(x,y-3,span,6);
  ink.fillStyle='#e7b75f';
  ink.fillRect(x,y-3,span*.18,6);ink.fillRect(end-span*.18,y-3,span*.18,6);
  for(const [side,tone,dy] of [['rear','#bcb49b',13],['front','#fff0c2',-13]]){
    const hand=hands[side];
    if(!hand || !Number.isFinite(hand.u) || hand.closed===false || hand.weight<.3)continue;
    const cx=x+span*Math.min(1,Math.max(0,hand.u));
    ink.fillStyle=tone;ink.beginPath();ink.moveTo(cx,y+Math.sign(dy)*4);
    ink.lineTo(cx-5,y+dy);ink.lineTo(cx+5,y+dy);ink.closePath();ink.fill();
  }
  label(ink,'棒尾',x,686,14,'#ad987b');ink.textAlign='right';
  label(ink,'棒梢',end,686,14,'#ad987b');ink.textAlign='left';
}
// Overlay is visible only when the viewer selects the rivet control.
function showChains(ctx,p){
  ctx.save();
  for(const [side,color] of [['rear','#154d74'],['front','#ae242a']]){
    for(const chain of [[p[side+'Shoulder'],p[side+'Elbow'],p.hands[side].wrist,p.hands[side].center],
                        [p[side+'Hip'],p[side+'Knee'],p[side+'Ankle'],p[side+'Sole'][4]]]){
      ctx.beginPath();chain.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.strokeStyle='#ffedcb';ctx.lineWidth=4.5;ctx.stroke();
      ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.stroke();
      for(const [x,y] of chain){ctx.beginPath();ctx.arc(x,y,3.4,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();}
    }
  }
  ctx.restore();
}
function drawFrame(index,frame,pins=false){
  const move=moves[index],seconds=Math.min(95,Math.max(0,frame))/24;
  paint.clearRect(0,0,1280,580);
  paint.drawImage(scenery.mountain,0,0,1280,611,0,0,1280,580);
  drawStageProps(paint,index,seconds);
  const pose=drawMove(paint,index,seconds,pins);
  if(pins)showChains(paint,pose);
  ink.drawImage(stage,0,0);
  ink.fillStyle='#2a231f'; ink.fillRect(0,580,1280,140);
  ink.fillStyle='#bc9866'; ink.fillRect(0,580,1280,1);
  const divider=x=>{ink.fillStyle='#665444';ink.fillRect(x,600,1,98);};
  divider(497);divider(830);
  label(ink,'大 圣 试 棒',34,609,17,'#d7ba8d');
  label(ink,'第'+numerals[index]+'式',161,609,17,'#d7ba8d');
  label(ink,move.name,32,663,46,'#fff0d1',true,600);
  label(ink,move.note||move.family,35,695,18,'#d9c4a9');
  gripDiagram(pose.hands);
  const hands=Object.values(pose.hands);
  const holding=hands.filter(h=>h.closed!==false && !(h.weight<.3));
  const selected=holding.length?holding:hands;
  const onPole=pose.perch?.active;
  const center=onPole?pose.perch.point:[0,1].map(k=>selected.reduce((n,h)=>n+h.center[k],0)/selected.length);
  const w=219,h=70;
  const sx=Math.max(0,Math.min(1280-w,center[0]-w/2));
  const sy=Math.max(0,Math.min(580-h,center[1]-h/2));
  ink.drawImage(stage,sx,sy,w,h,857,589,392,124);
  ink.fillStyle='#392a21da';ink.fillRect(857,589,66,21);
  label(ink,onPole?'靴底支点':'握手局部',863,605,13,'#ffe6be');
  return pose;
}
window.drawFrame=drawFrame;
window.ready=Promise.all([cast.wukong.ready,...Object.values(scenery).map(i=>i.decode())]);
