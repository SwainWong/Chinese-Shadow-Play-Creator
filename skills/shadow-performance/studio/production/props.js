// Small independently moving leather props give the three emphases readable stage marks.
(() => {
  const markCache=new Map();
  function mark(index,t){
    const key=index+'/'+t;
    if(!markCache.has(key))markCache.set(key,drawMove(null,index,t).staff[1]);
    return markCache.get(key);
  }
  function cloudWisp(g,x,y,d){
    if(d>1.1)return;
    const u=Math.max(0,d)/1.1;
    g.save();g.globalAlpha=.79*(1-u*u);
    const im=scenery.cloud;
    const w=65,h=w*im.height/im.width;
    for(const side of [0,1]){
      const drift=u*(26+side*18);
      g.drawImage(im,side*im.width/2,0,im.width/2,im.height,
        x+w*.5*side+drift,y-h*.55+(side?1:-1)*18*Math.sin(u*2),w*.5,h);
    }
    g.restore();
  }
  function bronzeMoon(g,x,y,d){
    const r=Math.min(19,Math.max(10,(557-y)/1.76));
    const cx=x+r*.66,cy=y+r*.75;
    const sway=d>0?.37*Math.exp(-3*d)*Math.sin(20*d):0;
    g.save();g.strokeStyle='#8c6641';g.lineWidth=2;g.beginPath();
    g.moveTo(cx,cy);g.lineTo(cx,560);g.stroke();
    g.translate(cx,cy);g.rotate(sway);g.scale(1-Math.abs(sway)*.55,1);
    const bronze=g.createRadialGradient(-5,-8,2,0,0,r);
    bronze.addColorStop(0,'#f9d889');bronze.addColorStop(.63,'#d89c4e');bronze.addColorStop(1,'#a46334');
    g.fillStyle=bronze;g.strokeStyle='#82532b';g.lineWidth=1.6;
    g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();g.stroke();
    g.beginPath();g.arc(0,0,r*.80,0,Math.PI*2);g.stroke();
    g.fillStyle='#b97637';g.beginPath();g.arc(0,0,r*.27,0,Math.PI*2);g.fill();
    for(let i=0;i<12;i++){const a=i*Math.PI/6;g.fillStyle='#ffdd96';g.beginPath();g.arc(Math.cos(a)*r*.90,Math.sin(a)*r*.90,1,0,Math.PI*2);g.fill();}
    g.restore();
  }
  function leaf(g,x,y,a,len){
    g.save();g.translate(x,y);g.rotate(a);
    g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(len*.58,-len*.34,len,0);
    g.quadraticCurveTo(len*.48,len*.27,0,0);g.fillStyle='#a7532f';g.fill();
    g.strokeStyle='#876035';g.lineWidth=.9;g.stroke();g.beginPath();g.moveTo(0,0);g.lineTo(len*.87,0);
    g.strokeStyle='#ecc581';g.stroke();g.restore();
  }
  window.drawStageProps=function(ctx,i,t){
    const accent=moves[i].accent;
    if(i===1){
      const [x,y]=mark(i,accent);
      cloudWisp(ctx,x,y,t-accent);
    }else if(i===2){
      const [x,y]=mark(i,accent);
      bronzeMoon(ctx,x,y,t-accent);
    }else if(i===4){
      const [x]=mark(i,accent);
      for(let n=0;n<4;n++){
        const u=Math.max(0,Math.min(1,(t-accent+.33-n*.08)/1.33));
        leaf(ctx,x-35+n*14+u*(55+13*n),553-3*(n%2)-(31+9*n)*Math.sin(Math.PI*u),
          -.1-n*.12+u*(2.3+n*.48),13+n*2);
      }
    }
  };
})();
