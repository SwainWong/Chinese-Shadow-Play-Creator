"""Show the actual six cutouts over the same illuminated fabric as the film."""
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',args=['--allow-file-access-from-files'])
    page=browser.new_page();page.goto((root/'index.html').as_uri());page.evaluate('()=>studioReady')
    jpeg=page.evaluate("""()=>{
      const c=document.createElement('canvas');c.width=1320;c.height=790;const k=c.getContext('2d');
      k.fillStyle='#342b23';k.fillRect(0,0,c.width,c.height);k.fillStyle='#f2dcb3';
      k.font='34px "Songti SC",serif';k.fillText('山门一阵风 · 景片',24,53);
      const parts=[['house','民居'],['temple','山门'],['hall','正殿'],['foothills','远山'],['hill','近丘'],['peony','牡丹花草']];
      for(let i=0;i<parts.length;i++){
        const x=20+(i%3)*430,y=80+Math.floor(i/3)*349,[id,name]=parts[i],im=plates[id];
        k.drawImage(cloth,x,y,418,280);const scale=Math.min(382/im.width,239/im.height);
        const w=im.width*scale,h=im.height*scale;k.save();k.globalCompositeOperation='multiply';
        k.drawImage(im,x+(418-w)/2,y+(280-h)/2,w,h);k.restore();
        k.font='23px "Songti SC",serif';k.fillStyle='#efdbb9';k.fillText(name,x+3,y+315);
      }
      return c.toDataURL('image/jpeg',.94).split(',')[1];
    }""")
    (root/'review/plates.jpg').write_bytes(base64.b64decode(jpeg))
