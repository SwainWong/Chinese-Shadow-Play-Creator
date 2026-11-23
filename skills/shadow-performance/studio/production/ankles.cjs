// Read rendered boot contact points and the knee rivet. Unfold the change of facing
// before reading oriented angles, retaining the actual global airborne rotation.
const path = require('node:path');
const root = path.resolve(process.argv[2] || path.resolve(__dirname,'..'));
global.window = {};
global.document = { currentScript: {src: 'http://studio/production/monkey.js'} };
global.Image = class { decode() { return new Promise(()=>{}); } };
require(path.join(root,'production','monkey.js'));
require(path.join(root,'production','moves.js'));
const forms = window.moves.map((move,i)=>{
  const samples = [];
  for (let f=0;f<96;f++){
    const p = window.drawMove(null,i,f/24);
    if (Math.abs(p.turn)<1e-7) continue; // No measurable side view if exactly edge-on.
    for (const side of ['front','rear']){
      const sole=p[side+'Sole'],ankle=p[side+'Ankle'],knee=p[side+'Knee'];
      const shin=[(knee[0]-ankle[0])/p.turn,knee[1]-ankle[1]];
      const foot=[(sole[3][0]-sole[1][0])/p.turn,sole[3][1]-sole[1][1]];
      const degrees=Math.atan2(shin[0]*foot[1]-shin[1]*foot[0],shin[0]*foot[0]+shin[1]*foot[1])*180/Math.PI;
      samples.push({frame:f,side,degrees,grounded:p[side+'Planted']});
    }
  }
  const ordered=samples.slice().sort((a,b)=>a.degrees-b.degrees);
  return {name:move.name,samples:samples.length,min:ordered[0],max:ordered.at(-1),
    inverted:samples.filter(s=>s.degrees<=0).length,
    belowTwenty:samples.filter(s=>s.degrees<20).length};
});
process.stdout.write(JSON.stringify({method:'Signed angle from ankle-to-knee to forward sole (sole points 1 and 3), in the unfolded puppet plane; degrees.',
  forms,inverted:forms.reduce((n,f)=>n+f.inverted,0),
  belowTwenty:forms.reduce((n,f)=>n+f.belowTwenty,0)},null,2)+'\n');
