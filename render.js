import {KEYS,LABELS,COLORS,index,REFERENCE,referenceHV,clamp} from './materials.js';
import {probeIndex} from './model.js';
import {METRICS,geometry,probe,profile,compareSeries} from './analysis.js';
import {logTimeAxis,logCurve,TIME_UNITS,figureHeight} from './time-axis.js';
export const FIGURES=[['thermal','Temperaturverlauf'],['reservoirs','Reservoirentwicklung am gewählten Ort'],['hardening','Aushärtung: Kern, Rand und Mittel'],['comparison','Vollständige Prozessvergleiche'],['field','Bauteilquerschnitt'],['profile','Ortsprofil auf der Schnittlinie'],['micro','Ausscheidungen · schematische Vergrößerung']];
export function timeLabel(s){return s<120?s.toFixed(1)+' s':s<7200?(s/60).toFixed(1)+' min':s<172800?(s/3600).toFixed(2)+' h':(s/86400).toFixed(2)+' Tage';}
function line(c,points,color,width=3,dash=[]){c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();c.setLineDash([]);}
function text(c,value,x,y,size=18,color='#453c30'){c.font=size+'px system-ui';c.fillStyle=color;c.fillText(value,x,y);}
function base(c,title,subtitle,height=560){c.fillStyle='#fff';c.fillRect(0,0,1000,height);text(c,title,32,38,24);text(c,subtitle,32,67,15);text(c,'Werkzeugdeck · EN AW-6082 · unkalibriertes Lehrmodell',32,height-5,13,'#74644d');}
function chart(c,{title,subtitle,series,maxX,maxY,ylabel,xlabel,marker,dots=[],logTime=false}){
 const height=logTime?720:560; base(c,title,subtitle,height);
 const box=logTime?{x:130,y:130,w:820,h:270}:{x:85,y:108,w:865,h:330};
 const axis=logTime?logTimeAxis(maxX*3600,box.x,box.x+box.w):null;
 const X=x=>axis?axis.position(x*3600):box.x+box.w*x/maxX,Y=y=>box.y+box.h-box.h*y/maxY;
 for(let j=0;j<=5;j++){const y=maxY*j/5;line(c,[[box.x,Y(y)],[950,Y(y)]],'#e9e1d4',1);text(c,y.toFixed(maxY<=100?0:1),logTime?60:28,Y(y)+6,15);}
 text(c,ylabel,box.x,logTime?113:94,16);
 if(axis){
  text(c,'Start t = 0 s separat · logarithmisch ab '+axis.min.toLocaleString('de-DE')+' s',box.x,92,14);
  for(const tick of axis.ticks())line(c,[[tick.x,box.y],[tick.x,box.y+box.h]],tick.major?'#d7cdbd':'#f0eae1',tick.major?1:.7);
  TIME_UNITS.forEach((unit,i)=>{const baseline=444+i*64;text(c,unit.label,box.x,baseline-12,16);line(c,[[box.x,baseline],[950,baseline]],'#675c4d',1);
   for(const tick of axis.ticks(unit.factor)){line(c,[[tick.x,baseline],[tick.x,baseline+(tick.major?7:4)]],'#675c4d',1);if(tick.major){c.textAlign='center';text(c,tick.label,tick.x,baseline+25,17);c.textAlign='start';}}
  });
  text(c,'0 s',77,420,15);text(c,'Start',70,440,13);line(c,[[108,442],[117,434]],'#675c4d',1.5);line(c,[[112,448],[121,440]],'#675c4d',1.5);
 }else{
  for(let j=0;j<=4;j++)text(c,(maxX*j/4).toFixed(maxX>=50?0:maxX>=1?1:maxX>=.1?2:3),X(maxX*j/4)-8,466,15);
  text(c,xlabel,720,495,16);
 }
 series.forEach((s,i)=>{
  const points=axis?logCurve(s.values,3600,axis).map(p=>[axis.position(p[0]),Y(p[1])]):s.values.map(p=>[X(p[0]),Y(p[1])]);line(c,points,s.color,3,s.dash);
  if(axis&&s.values[0]?.[0]===0){c.fillStyle=s.color;c.beginPath();c.arc(82,Y(s.values[0][1]),4,0,2*Math.PI);c.fill();}
  const x=32+(i%3)*320,y=(logTime?638:514)+Math.floor(i/3)*(logTime?23:19);line(c,[[x,y-5],[x+22,y-5]],s.color,3,s.dash);text(c,s.name.length>33?s.name.slice(0,30)+'…':s.name,x+28,y,14);
 });
 if(marker!==undefined){const x=axis&&marker===0?82:X(marker);if(x!==null)line(c,[[x,box.y],[x,box.y+box.h]],'#292723',2,[6,5]);}
 for(const d of dots){if(axis&&d[0]>0&&d[0]*3600<axis.min)continue;const x=axis&&d[0]===0?82:X(d[0]);c.fillStyle='#513821';c.beginPath();c.arc(x,Y(d[1]),5,0,2*Math.PI);c.fill();}
}
export function render(c,id,r,frameIndex=0,options={}){
 const logTime=figureHeight(id,options)===720;
 if(id==='reference'){
  const t=options.referenceTime??8;
  chart(c,{title:'Literaturreferenz · 175 °C',subtitle:'He et al. (2019) · vier Textwerte; lineare Verbindung, kein Kinetikfit',series:[{name:'Literatur · HV 0,5',color:'#865b2e',values:REFERENCE.map(p=>[p.h,p.hv])}],maxX:96,maxY:150,ylabel:'Vickershärte [HV 0,5]',xlabel:'Auslagerungszeit [h]',marker:referenceHV(t)===null?undefined:t,dots:REFERENCE.map(p=>[p.h,p.hv]),logTime});
  const bottom=logTime?720:560;c.fillStyle='#fff';c.fillRect(20,bottom-37,960,37);text(c,'Quelle: doi.org/10.3390/met9020173 · keine Übertragung auf freie Prozesse',32,bottom-16,15);return;
 }
 if(id==='comparison'){
  const series=compareSeries(r,options.comparisons||[],options),metric=METRICS[options.compareMetric||'index'],relative=options.compareAxis==='relative';
  if(!series.length){base(c,'Vollständige Prozessvergleiche','Prozess berechnen und bis zu vier Verläufe merken.');return;}
  const names={mean:'Volumenmittel',core:'Kern',edge:'Rand / Ecke',probe:'gleiche relative Position'};
  chart(c,{title:'Prozessvergleich · '+metric.label,subtitle:(relative?'Relative Prozesszeit: gleiche Fortschrittsanteile, unterschiedliche reale Zeiten':'Absolute Prozesszeit: Kurven enden mit ihrem jeweiligen Prozess')+' · '+names[options.compareLocation||'mean'],series,maxX:relative?100:Math.max(...series.map(s=>s.result.total))/3600,maxY:metric.max,ylabel:metric.label+' ['+metric.unit+']',xlabel:relative?'Prozessfortschritt [%]':'Prozesszeit [h]',marker:r?(relative?100*r.frames[frameIndex].time/r.total:r.frames[frameIndex].time/3600):undefined,logTime});return;
 }
 if(!r){base(c,FIGURES.find(f=>f[0]===id)?.[1]||'Aluminium','Prozess einstellen und berechnen.',figureHeight(id,options));return;}
 const f=r.frames[frameIndex],p=probeIndex(r,options.x||0,options.y||0),s=f.states[p],xMax=r.total/3600;
 const point=probe(r,options.x||0,options.y||0);
 const subtitle=timeLabel(f.time)+' · '+f.label+' · Zellmitte x = '+point.xMM.toFixed(2)+' mm, y = '+point.yMM.toFixed(2)+' mm';
 const values=fn=>r.frames.map(v=>[v.time/3600,fn(v)]);
 if(id==='thermal')chart(c,{title:'Medium und Bauteil',subtitle,series:[{name:'Medium',color:'#8c7c68',dash:[6,4],values:values(v=>v.bath)},{name:'Kern',color:'#b44c39',values:values(v=>v.temps[0])},{name:'Rand / Ecke',color:'#347c9d',values:values(v=>v.temps.at(-1))}],maxX:xMax,maxY:600,ylabel:'Temperatur [°C]',xlabel:'Prozesszeit [h]',marker:f.time/3600,logTime});
 if(id==='reservoirs')chart(c,{title:'Verteilung des Modellreservoirs',subtitle,series:KEYS.map(k=>({name:LABELS[k],color:COLORS[k],values:values(v=>100*v.states[p][k])})),maxX:xMax,maxY:100,ylabel:'Reservoiranteil [%] · keine Phasenanteile',xlabel:'Prozesszeit [h]',marker:f.time/3600,logTime});
 if(id==='hardening')chart(c,{title:'Illustrativer Aushärtungsindex',subtitle,series:[{name:'Kern',color:'#b44c39',values:values(v=>index(v.states[0]))},{name:'Rand / Ecke',color:'#347c9d',values:values(v=>index(v.states.at(-1)))},{name:'Volumenmittel',color:'#326a50',values:values(v=>v.meanIndex)}],maxX:xMax,maxY:100,ylabel:'Index [0–100] · keine Härte / Warmfestigkeit',xlabel:'Prozesszeit [h]',marker:f.time/3600,logTime});
 if(id==='profile'){
  const metric=METRICS[options.profileMetric||'temperature'];
  chart(c,{title:'Ortsprofil · '+metric.label,subtitle:timeLabel(f.time)+' · Schnitt bei y = '+point.yMM.toFixed(2)+' mm · Werte an Zellmitten',series:[{name:metric.label,color:'#3c7497',values:profile(r,f,options.y||0,options.profileMetric||'temperature').map(p=>[p.x,p.value])}],maxX:r.parameters.size/2,maxY:metric.max,ylabel:metric.label+' ['+metric.unit+']',xlabel:r.parameters.shape==='rod'?'Radius r [mm]':'Abstand x von der Mitte [mm]',marker:point.xMM});
 }
 if(id==='field'){
  const g=geometry(r.parameters);
  const temp=options.field!=='index',limit=temp?550:100;const val=i=>temp?f.temps[i]:index(f.states[i]);
  const color=v=>{const z=clamp(v/limit);return 'rgb('+Math.round(231-50*z)+','+Math.round(239-151*z)+','+Math.round(245-208*z)+')';};
  base(c,temp?'Temperatur im Querschnitt':'Aushärtungsindex im Querschnitt',subtitle);
  if(r.parameters.shape==='rod'){for(let j=r.nx-1;j>=0;j--){c.fillStyle=color(val(j));c.beginPath();c.arc(410,290,180*(j+1)/r.nx,0,2*Math.PI);c.fill();}text(c,'Durchmesser '+r.parameters.size+' mm · radial',150,490,17);}
  else {const ratio=r.parameters.size/r.parameters.height,w=Math.min(640,330*ratio),h=w/ratio,left=410-w/2,top=290-h/2;for(let iy=0;iy<r.ny*2;iy++)for(let ix=0;ix<r.nx*2;ix++){const gx=Math.floor(Math.abs(ix+.5-r.nx)),gy=Math.floor(Math.abs(iy+.5-r.ny));c.fillStyle=color(val(gy*r.nx+gx));c.fillRect(left+ix*w/(2*r.nx),top+iy*h/(2*r.ny),w/(2*r.nx)+.2,h/(2*r.ny)+.2);}text(c,r.parameters.size+' × '+r.parameters.height+' mm · langer Körper',150,490,17);}
  for(let j=0;j<100;j++){c.fillStyle=color((99-j)/99*limit);c.fillRect(835,110+j*3.3,32,3.5);}text(c,String(limit),880,125,18);text(c,'0',880,440,18);text(c,temp?'°C':'Index',832,475,18);
  const mx=g.shape==='rod'?g.cx+g.radius*point.x:g.cx+g.w/2*point.x,my=g.shape==='rod'?g.cy:g.cy+g.h/2*point.y;
  if(g.shape==='plate'){line(c,[[g.left,my],[g.left+g.w,my]],'#302b25',2,[7,4]);line(c,[[g.left,2*g.cy-my],[g.left+g.w,2*g.cy-my]],'#302b25',1,[3,4]);}
  else line(c,[[g.cx,g.cy],[g.cx+g.radius,g.cy]],'#302b25',2,[7,4]);
  line(c,[[mx-8,my],[mx+8,my]],'#fff',6);line(c,[[mx,my-8],[mx,my+8]],'#fff',6);line(c,[[mx-8,my],[mx+8,my]],'#201f1c',2);line(c,[[mx,my-8],[mx,my+8]],'#201f1c',2);
  text(c,'Ableseort: '+val(p).toFixed(1)+(temp?' °C':' / 100'),32,96,18);
 }
 if(id==='micro'){
  base(c,'Matrix und Ausscheidungen · getrennte Größenmaßstäbe',subtitle);
  const seeds=Array.from({length:22},(_,j)=>[45+((j*137.5)%375),145+((j*91.73)%275)]);
  for(const [i,seed] of seeds.entries()){let poly=[[40,140],[430,140],[430,430],[40,430]];for(const other of seeds){if(other===seed)continue;const dx=other[0]-seed[0],dy=other[1]-seed[1],limit=(other[0]**2+other[1]**2-seed[0]**2-seed[1]**2)/2,next=[];for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],va=a[0]*dx+a[1]*dy-limit,vb=b[0]*dx+b[1]*dy-limit;if(va<=0)next.push(a);if((va<=0)!==(vb<=0)){const t=va/(va-vb);next.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}poly=next;if(!poly.length)break;}if(poly.length){c.fillStyle=['#e6eddd','#f0f2e8','#e0e8d5'][i%3];c.strokeStyle='#91a08a';c.lineWidth=1.5;c.beginPath();poly.forEach((p,j)=>j?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();c.stroke();}}
  text(c,'Kornübersicht · rein schematisch',40,467,17);text(c,'Kein Kornwachstumsmodell',40,491,16);
  c.fillStyle='#e9f0f4';c.fillRect(510,140,440,290);
  // Fixed deterministic coordinates; sizes illustrate state, never represent nm.
  for(let j=0;j<180;j++){const u=(Math.sin(j*127.1+3)*43758.5453)%1,v=(Math.sin(j*311.7+9)*27463.17)%1,type=j/180<s.coarse?'coarse':j/180<s.coarse+s.fine?'fine':j/180<s.coarse+s.fine+s.clusters?'clusters':'solute';if(type==='solute')continue;c.fillStyle=COLORS[type];const size=type==='coarse'?15:type==='fine'?6:3;c.fillRect(520+Math.abs(u)*405,150+Math.abs(v)*265,size,type==='clusters'?size:3);}
  text(c,'Ausscheidungslupe · ohne Maßstab',510,467,17);text(c,'Teilchenzahl und Größe sind Illustration',510,491,16);
  KEYS.forEach((k,i)=>text(c,LABELS[k]+': '+(s[k]*100).toFixed(1)+' %',40+(i%2)*470,95+Math.floor(i/2)*20,14,COLORS[k]));
 }
}

