'use strict';
const frameW = 1280, frameH = 720, fps = 24, duration = 5;
const layerList={far:'远山',near:'近丘',hall:'内院正殿',building:'建筑',flowers:'花草',bell:'檐铃',actor:'悟空',floor:'台板'};
const plates={};
const readyScenery=Promise.all(['house','temple','hill','foothills','peony','hall'].map(async key=>{
  const img=new Image();img.src='art/'+key+'.webp';await img.decode();plates[key]=img;
}));
const ready=Promise.all([readyScenery,cast.wukong.ready]);
const cloth=document.createElement('canvas');cloth.width=frameW;cloth.height=frameH;
(function lightScreen(){
  const ctx=cloth.getContext('2d'),pix=ctx.createImageData(frameW,frameH);
  let seed=1709; const rnd=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  const warp=Array.from({length:frameW},()=>rnd()*1.9),weft=Array.from({length:frameH},()=>rnd()*2.4);
  for(let y=0;y<frameH;y++)for(let x=0;x<frameW;x++){
    const i=(y*frameW+x)*4,edge=Math.min(1,Math.pow(((x-650)/860)**2+((y-300)/630)**2,.82));
    const n=(rnd()-.5)*4+warp[x]+weft[y]-2.1;
    pix.data[i]=251-24*edge+n;pix.data[i+1]=236-35*edge+n;pix.data[i+2]=198-49*edge+n;pix.data[i+3]=255;
  }
  ctx.putImageData(pix,0,0);
})();
const allLayers=Object.fromEntries(Object.keys(layerList).map(k=>[k,true]));
const clamp01=x=>Math.max(0,Math.min(1,x));
// The pulse begins and ends at rest; later oscillations lose amplitude.
function gust(t,start){const u=t-start;if(u<=0||u>=3.4)return 0;
  return Math.sin(4.8*u)*Math.exp(-.9*u)*Math.min(u*7,1)*Math.min((3.4-u)*3,1);}
function drawPlate(ctx,id,p,angle=0){
  const im=plates[id],h=p.width*im.height/im.width;ctx.save();ctx.translate(p.x,p.y);
  ctx.rotate(angle*Math.PI/180);if(p.flip)ctx.scale(-1,1);ctx.globalAlpha=p.opacity??1;
  ctx.drawImage(im,-p.width/2,-h,p.width,h);ctx.restore();return h;
}
// The two flowering branches join above the grass fan at source pixel (228,345).
// Put the upper cut through the stem at this fork; route the rest through empty light.
const flowerCut = new Path2D('M-2 -2 H540 V241 H409 L398 300 L325 295 L252 324 L236 348 L223 346 L200 333 L169 328 L157 342 L115 394 L-2 419 Z');
let plantParts;
function flowerPieces(){
  if(plantParts)return plantParts;
  function mask(upper){
    const c=document.createElement('canvas');c.width=plates.peony.width;c.height=plates.peony.height;
    const k=c.getContext('2d');k.drawImage(plates.peony,0,0);
    k.globalCompositeOperation=upper?'destination-in':'destination-out';k.fill(flowerCut);
    if(!upper){
      // Preserve the narrow sliver of original leather immediately below the pin.
      k.globalCompositeOperation='source-over';k.save();k.beginPath();k.arc(228,345,6,0,Math.PI*2);
      k.clip();k.drawImage(plates.peony,0,0);k.restore();
    }
    return c;
  }
  return plantParts=[mask(false),mask(true)];
}
function peony(ctx,p,t,start){
  const [root,branch]=flowerPieces(),scale=p.width/root.width;
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.flip?-scale:scale,scale);ctx.translate(-root.width/2,-root.height);
  ctx.drawImage(root,0,0);ctx.translate(228,345);
  ctx.rotate(p.angle*gust(t,start)*Math.PI/180);ctx.translate(-228,-345);ctx.drawImage(branch,0,0);ctx.restore();
}
function grass(ctx,p,g){
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.size,p.size);
  for(const [dx,dy,w,col,phase] of [[-45,-29,6,'#627552',.72],[-30,-49,7,'#687853',.82],[-11,-67,8,'#556c48',1],[10,-48,5,'#708154',.65],[33,-59,8,'#667d55',.85],[54,-37,5,'#63794c',.68]]){
    ctx.save();ctx.rotate(g*phase*Math.PI/180);
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(dx*.18,dy*.64,dx,dy);ctx.quadraticCurveTo(dx*.65+w,dy*.55,4,0);ctx.closePath();
    ctx.fillStyle=col;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#88683f';ctx.stroke();
    ctx.beginPath();ctx.moveTo(2,-2);ctx.quadraticCurveTo(dx*.37,dy*.53,dx*.78,dy*.84);ctx.strokeStyle='#c3ab66';ctx.stroke();ctx.restore();
  }
  ctx.restore();
}
function bell(ctx,p,t,start){
  const im=plates.temple,h=p.width*im.height/im.width;
  const x=p.x+p.width*.46,y=p.y-h+h*.414;
  ctx.save();ctx.translate(x,y);ctx.rotate(gust(t,start+.12)*.22);
  ctx.strokeStyle='#6a4c31';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,13);ctx.stroke();
  ctx.fillStyle='#a97636';ctx.beginPath();ctx.moveTo(-1,12);ctx.bezierCurveTo(-9,13,-4,23,-10,24);
  ctx.quadraticCurveTo(0,28,10,24);ctx.bezierCurveTo(5,21,8,14,1,12);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#e3bb66';ctx.fillRect(-7,22,14,2);
  ctx.beginPath();ctx.moveTo(0,26);ctx.lineTo(0,32);ctx.stroke();
  ctx.fillStyle='#a34c32';ctx.beginPath();ctx.moveTo(0,31);ctx.lineTo(3,40);ctx.lineTo(0,44);ctx.lineTo(-3,39);ctx.closePath();ctx.fill();
  ctx.restore();
}
function filmFrame(ctx,shot,frame,mask=allLayers){
  const s=studies[shot],t=Math.min(119,Math.max(0,frame))/fps;
  ctx.save();ctx.drawImage(cloth,0,0);ctx.globalCompositeOperation='multiply';
  if(mask.far)drawPlate(ctx,'foothills',s.distant);
  if(mask.near)drawPlate(ctx,'hill',s.near);
  if(mask.hall&&s.hall){
    const h=s.hall;
    ctx.fillStyle='rgba(174,129,77,.17)';ctx.beginPath();ctx.moveTo(h.x-27,h.y-1);ctx.lineTo(h.x+27,h.y-1);
    ctx.lineTo(h.x+79,603);ctx.lineTo(h.x-79,603);ctx.closePath();ctx.fill();
    drawPlate(ctx,'hall',h);
  }
  if(mask.building)drawPlate(ctx,s.building.id,s.building);
  if(mask.bell&&s.building.id==='temple')bell(ctx,s.building,t,s.gust);
  ctx.globalCompositeOperation='source-over';
  if(mask.actor){ctx.save();ctx.translate(s.actorX,603);ctx.scale(s.actorScale,s.actorScale);
    ctx.translate(-moves[s.move].x,-560);drawMove(ctx,s.move,Math.min(3.958,t*.82));ctx.restore();}
  if(mask.flowers){
    ctx.globalCompositeOperation='multiply';
    peony(ctx,s.flower,t,s.gust);
    grass(ctx,s.grass,5.8*gust(t,s.gust+.17));ctx.globalCompositeOperation='source-over';
  }
  if(mask.floor){
    ctx.fillStyle='#745337';ctx.fillRect(0,604,1280,2);ctx.fillStyle='#ad8760';ctx.fillRect(0,606,1280,4);
    ctx.fillStyle='#8b694c';ctx.fillRect(0,610,1280,2);
  }
  ctx.fillStyle='#342a23';ctx.fillRect(0,629,1280,91);ctx.fillStyle='#b79764';ctx.fillRect(0,629,1280,2);
  ctx.font='500 33px "Songti SC", "Noto Serif CJK SC",serif';ctx.fillStyle='#f8e7bc';ctx.fillText(s.name,42,685);
  ctx.font='19px "Songti SC",serif';ctx.fillStyle='#d7c5a4';ctx.fillText(s.note,222,683);
  ctx.textAlign='right';ctx.fillText('山门一阵风',1238,683);
  ctx.restore();
}
