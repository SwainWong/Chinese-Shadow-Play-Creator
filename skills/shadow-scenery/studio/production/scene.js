// Coordinates are stage pixels. x and y are the registration point on the floor.
// The size is always a uniform width; the height follows the original leather plate.
window.studies = [
  {name:'山麓人家',note:'花窗 · 远岫 · 牡丹',move:8,actorX:849,actorScale:.53,
   distant:{x:655, y:602, width:1360,opacity:.37,flip:false}, near:{x:1148,y:599,width:737,opacity:.48,flip:true},
   building:{id:'house',x:361,y:607,width:708,opacity:.96}, flower:{x:1067,y:605,width:179,angle:6.4,flip:false},
   grass:{x:91,y:607,size:1.05}, gust:1.03},
  {name:'古刹山门',note:'重檐 · 门洞 · 檐铃',move:11,actorX:519,actorScale:.53,
   distant:{x:655,y:602,width:1350,opacity:.35,flip:true},near:{x:20,y:599,width:610,opacity:.44,flip:false},
   hall:{x:940,y:550,width:259,opacity:.65},
   building:{id:'temple',x:942,y:608,width:620,opacity:.98},flower:{x:167,y:605,width:160,angle:-6.7,flip:true},
   grass:{x:1153,y:607,size:.83},gust:1.29}
];
