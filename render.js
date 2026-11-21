import {liquidusGeometry} from './liquidus-geometry.js';
import {reactionReferences} from './reaction-data.js';
import { triangleAxes } from './axes.js';
import { triangleLayout, triangleDisplayPoint, triangleDisplayInverse } from './triangle-geometry.js';
import { residualPath } from './boundary.js';
import { joinContours, roundContour, simplifyContour } from './geometry.js';
import { elementSymbol } from './symbols.js';
import {solve,toMass,composition,phaseName,contourSegments,thresholds} from './equilibrium.js';
export const pointColors=['#8c4a12','#354fa0','#9e365b','#126957','#755ca1','#bd623a'];
export const fmt=(value,digits=2)=>Number(value.toFixed(digits)).toLocaleString('de-DE');
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const text=(x,y,s,size=13,anchor='start',color='#382f25')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" text-anchor="'+anchor+'" fill="'+color+'">'+escape(s)+'</text>';
export const line=(x,y,u,v,color='#bbb',width=1,dash='')=>'<path d="M'+x+' '+y+'L'+u+' '+v+'" fill="none" stroke="'+color+'" stroke-width="'+width+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
export function svg(body,width=900,height=500,label='Legierungsatlas'){
 return '<svg class="chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'" role="img" aria-label="'+escape(label)+'" font-family="system-ui"><rect width="100%" height="100%" fill="white"/>'+body+'</svg>';
}
export function fieldColor(name){
 if(!name)return '#ccc';
 if(name==='L')return '#dcecf7';
 let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))>>>0;
 return 'hsl('+(h%360)+' 36% 85%)';
}
export function phaseColor(name){
 const colors={'L':'#337b9c','β-Sn':'#b87a28','Bi':'#8255a1','Ag₃Sn':'#b34e60','Cu₆Sn₅':'#248371','Cu₆Sn₅′':'#306a46','Cu₃Sn':'#777c2d','α (kfz)':'#b47d36','γ':'#776bb0','β (krz)':'#aa5f35'};
 return colors[name]||fieldColor(name).replace('36% 85%','60% 36%');
}
export function liquidColor(f){return 'rgb('+[0,1,2].map((_,i)=>Math.round([235,216,175][i]*(1-f)+[55,126,157][i]*f)).join(',')+')'}
export function display(x,state){return state.basis==='mass'?toMass(x,state.model.masses):x}
export function compositionLabel(x,state){
 return display(x,state).map((v,i)=>elementSymbol(state.model.components[i])+' '+fmt(v*100)+' %').join(' · ');
}
export function trianglePoint(x,state){
 const v=display(x,state);
 if(state.zoom==='tin')return triangleDisplayPoint([1-(v[0]+v[1])/.1,v[0]/.1,v[1]/.1]);
 return triangleDisplayPoint(v);
}
export function triangleInverse(px,py,state){
 const [,p,q]=triangleDisplayInverse(px,py);
 return state.zoom==='tin'?[p*.1,q*.1,1-(p+q)*.1]:[1-p-q,p,q];
}
function path(points){return points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('')+'Z'}
function faceSignature(model,nodes){
 const names=[...new Set(nodes.map(n=>phaseName(model.phases[n[0]],model)))];
 return names.sort().join(' + ');
}
export function triangleChart(state){
 const {model,surface,ti}=state;
 let body=text(65,24,state.triangleMode==='projection'?'Liquidusprojektion':'Isothermer Schnitt · '+fmt(model.T[ti])+' °C',19);
 const {top,bottom}=triangleLayout;
 const outline=[[1,0,0],[0,1,0],[0,0,1]].map(triangleDisplayPoint);
 body+='<defs><clipPath id="triangleClip"><path d="'+path(outline)+'"/></clipPath></defs><g clip-path="url(#triangleClip)">';
 const labels=new Map();
 if(state.triangleMode==='isothermal'&&model.diagramModel){
  for(const face of surface?.drawTriangles||[]){const nodes=face.map(i=>surface.nodes[i]),x=[0,1,2].map(k=>nodes.reduce((s,n)=>s+n.x[k],0)/3),sample=solve(model,x,ti),name=sample.signature;
   body+='<path d="'+path(nodes.map(n=>trianglePoint(n.x,state)))+'" fill="'+(sample.unavailable?'#e4e2df':fieldColor(name))+'" stroke="none"/>';
   if(!sample.unavailable){const p=trianglePoint(x,state);if(!labels.has(name))labels.set(name,{centers:[]});labels.get(name).centers.push(p)}
  }
 }else if(state.triangleMode==='isothermal'){
  const frame=model.frames[ti],edges=new Map();
  frame.faces.forEach(face=>{
   const nodes=face.map(i=>frame.vertices[i]);
   const points=nodes.map(n=>trianglePoint(composition(model,n),state));
   if(Math.max(...points.map(p=>p[0]))<65||Math.min(...points.map(p=>p[0]))>755||Math.max(...points.map(p=>p[1]))<top||Math.min(...points.map(p=>p[1]))>bottom)return;
   const signature=faceSignature(model,nodes);
   const f=nodes.filter(n=>model.phases[n[0]]==='LIQUID').length/nodes.length;
   body+='<path d="'+path(points)+'" fill="'+(state.style==='liquid'?liquidColor(f):fieldColor(signature))+'"/>';
   const centroid=points[0].map((_,j)=>points.reduce((s,p)=>s+p[j],0)/3);
   const area=Math.abs((points[1][0]-points[0][0])*(points[2][1]-points[0][1])-(points[2][0]-points[0][0])*(points[1][1]-points[0][1]));
   if(!labels.has(signature)||area>labels.get(signature).area)labels.set(signature,{point:centroid,area});
   for(let i=0;i<3;i++){const key=[face[i],face[(i+1)%3]].sort((a,b)=>a-b).join(',');if(!edges.has(key))edges.set(key,{points:[points[i],points[(i+1)%3]],signature});else if(edges.get(key).signature!==signature)body+=line(...points[i],...points[(i+1)%3],'#8c8174',1)}
  });
 }else if(surface){
  for(const face of (surface.drawTriangles||surface.triangles)){
   const nodes=face.map(i=>surface.nodes[i]);
   const names=nodes.map(n=>n.primary).filter(Boolean);
   const name=names.sort((a,b)=>names.filter(v=>v===b).length-names.filter(v=>v===a).length)[0]||'';
   if(name){if(!labels.has(name))labels.set(name,{sumX:0,sumY:0,count:0});const label=labels.get(name),p=nodes.map(n=>trianglePoint(n.x,state));label.sumX+=p.reduce((v,q)=>v+q[0],0)/3;label.sumY+=p.reduce((v,q)=>v+q[1],0)/3;label.count++;}
   body+='<path d="'+path(nodes.map(n=>trianglePoint(n.x,state)))+'" fill="'+fieldColor(name)+'" stroke="'+fieldColor(name)+'" stroke-width=".3"/>';
  }
  const geometry=liquidusGeometry(surface,Number(state.interval));
  for(const {t:level,paths} of geometry.isotherms){
   const curves=paths.map(points=>points.map(p=>trianglePoint(p,state)));
   body+='<path data-isotherm="'+level+'" d="'+curves.map(points=>points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('')).join('')+'" fill="none" stroke="#776653" stroke-width="1.25"/>';
   if(state.supportPoints)body+=curves.flat().map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="1.1" fill="#513821"/>').join('');
   for(const points of curves.filter(p=>p.length>30).slice(0,2)){const p=points[Math.floor(points.length*.6)];body+='<g style="paint-order:stroke;stroke:white;stroke-width:3px">'+text(...p,fmt(level)+'°',11)+'</g>'}
  }
  if(state.reactionLines){
   body+='<defs><marker id="downhill" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L7 3L0 6Z" fill="#382d22"/></marker></defs>';
   for(const {path:points} of geometry.reactions){
    const p=points.map(q=>trianglePoint(q.x,state));
    body+='<path data-reaction-line d="'+p.map((v,i)=>(i?'L':'M')+v.join(' ')).join('')+'" fill="none" stroke="#382d22" stroke-width="2.5"/>';
    // Temperature gradient along each reconstructed branch determines arrow direction locally.
    for(let i=3;i<p.length-3;i+=Math.max(9,Math.floor(p.length/3))){
     const before=i-2,after=i+2;
     if(Math.abs(points[after].t-points[before].t)<.1||Math.hypot(p[after][0]-p[before][0],p[after][1]-p[before][1])<4)continue;
     const from=points[after].t<points[before].t?before:after,to=from===before?after:before;
     body+='<path data-reaction-arrow d="M'+p[from].join(' ')+'L'+p[to].join(' ')+'" stroke="#382d22" stroke-width="2" marker-end="url(#downhill)"/>';
    }
   }
   const refs=reactionReferences(model);
   refs.forEach((e,i)=>{
    const p=trianglePoint(e.x,state),color=e.kind==='E'?'#873b31':'#4d3b88';
    body+='<circle data-reaction-point="'+e.label+'" cx="'+p[0]+'" cy="'+p[1]+'" r="4.5" fill="white" stroke="'+color+'" stroke-width="2"><title>'+escape(e.reaction+' · Literatur '+fmt(e.t)+' °C')+'</title></circle>';
    // Dense high-temperature nodes are numbered; the table contains every temperature and reaction.
    if(refs.length<=3||i<3)body+='<g style="paint-order:stroke;stroke:white;stroke-width:4px">'+text(p[0]+8,p[1]+(i%2?-10:17),e.label+' '+fmt(e.t)+' °C',12,'start',color)+'</g>';
    else body+=text(p[0]+6,p[1]-4,e.label,10,'start',color);
   });
  }
 }
 if(state.triangleMode==='projection')for(const [name,label] of labels)if(label.count>16)body+='<g style="paint-order:stroke;stroke:white;stroke-width:4px">'+text(label.sumX/label.count,label.sumY/label.count,name,13,'middle')+'</g>';
 for(let k=1;k<10;k++){
  const f=k/10;
  body+=line(...triangleDisplayPoint([1-f,f,0]),...triangleDisplayPoint([0,f,1-f]),'#706354',.4);
  body+=line(...triangleDisplayPoint([1-f,0,f]),...triangleDisplayPoint([0,1-f,f]),'#706354',.4);
  body+=line(...triangleDisplayPoint([f,1-f,0]),...triangleDisplayPoint([f,0,1-f]),'#706354',.4);
 }
 if(state.triangleMode==='isothermal'){
  for(const [name,label] of labels)if(label.centers?.length>15){const mean=[0,1].map(k=>label.centers.reduce((s,p)=>s+p[k],0)/label.centers.length),p=label.centers.reduce((a,b)=>Math.hypot(b[0]-mean[0],b[1]-mean[1])<Math.hypot(a[0]-mean[0],a[1]-mean[1])?b:a);body+='<g style="paint-order:stroke;stroke:white;stroke-width:3px">'+text(...p,name,11,'middle')+'</g>'}
  for(const [name,label] of labels)if(label.area>280)body+=text(...label.point,name,12,'middle');
  if(state.ties&&state.current){
   const current=state.current;
   const points=current.phases.map(p=>trianglePoint(p.x,state));
   if(points.length>1)for(let i=0;i<points.length;i++)body+=line(...points[i],...points[(i+1)%points.length],'#3b3731',2,'5 3');
   points.forEach((p,i)=>{body+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#111"/>';body+=text(p[0]+6,p[1]-6,current.phases[i].name,12)});
  }
 }
 const a=trianglePoint(state.a,state),b=trianglePoint(state.b,state);
 body+=line(...a,...b,'#654019',3);
 state.points.slice(0,state.lambdas.length).forEach((x,i)=>{const p=trianglePoint(x,state);body+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="'+pointColors[i]+'"/>'+text(p[0]+6,p[1]+17,'X'+(i+1),13)});

 if(state.profiles?.length){
  const samples=residualPath(state.profiles[state.selected]).map(s=>s.phase);
  if(samples.length>1)body+='<path d="'+samples.map((p,i)=>(i?'L':'M')+trianglePoint(p.x,state).join(' ')).join('')+'" stroke="#a22c34" stroke-width="2.5" stroke-dasharray="5 3" fill="none"/>';
  if(samples.length>1){const p=trianglePoint(samples.at(-1).x,state);body+='<circle data-residual-end cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#a22c34" stroke="white" stroke-width="1"><title>Ende des modellierten Restschmelzpfads</title></circle>';}
 }
 body+='</g><path d="'+path(outline)+'" fill="none" stroke="#5e5144" stroke-width="1.5"/>';
 for(const [p,name] of [[a,'S₁'],[b,'S₂']])body+='<circle data-endpoint="'+name+'" cx="'+p[0]+'" cy="'+p[1]+'" r="10" fill="white" stroke="#513821" stroke-width="3"/>'+text(p[0],p[1]<100?p[1]+26:p[1]-16,name,15,'middle');
 for(const anchor of state.cutAnchors||[]){
  const p=trianglePoint(anchor.x,state);
  body+='<path data-cut-anchor="'+anchor.id+'" d="M'+p[0]+' '+(p[1]-9)+'L'+(p[0]+9)+' '+p[1]+'L'+p[0]+' '+(p[1]+9)+'L'+(p[0]-9)+' '+p[1]+'Z" fill="#513821" stroke="white" stroke-width="2"><title>'+escape(anchor.label)+'</title></path>'+text(p[0]-10,p[1]-13,anchor.id==='A1'?'A₁':'A₂',14,'end');
 }
 body+=triangleAxes(state);
 if(model.diagramModel&&state.zoom==='full'&&(model.diagram.maxAl||model.diagram.unsupportedLabel))body+=text(410,97,model.diagram.unsupportedLabel||'Nicht berechnet: AlCl₃-reiche Spitze',11,'middle');
 body+=text(410,bottom+91,''+(model.diagramModel?'Geometrisches Isothermenmodell':'CALPHAD-Gleichgewichtsmodell')+' · Achsen in '+(state.basis==='mass'?'Masse-%':'mol-%'),12,'middle');
 return svg(body,820,bottom+110,'Gehaltsdreieck mit Isothermen und freier Schnittlinie');
}
export function curvesChart(state){
 const profiles=state.profiles;
 const minT=state.model.T[0],maxT=state.model.T.at(-1),Y=t=>395-330*(t-minT)/(maxT-minT);
 const energies=profiles.map(p=>p.map(s=>s.enthalpy));
 const maxima=energies.map(e=>Math.max(...e.filter(Number.isFinite)));
 const span=Math.max(1,...energies.flatMap((e,i)=>e.filter(Number.isFinite).map(v=>(maxima[i]-v)/1000)));
 const X=q=>65+790*q/span;
 let body=text(65,25,''+(state.model.diagramModel?'Schematische Abkühlverläufe':'Abkühlverläufe · vollständiger Temperaturverlauf')+'',18);
 body+='<defs><clipPath id="curveClip"><rect x="65" y="55" width="790" height="340"/></clipPath></defs><g clip-path="url(#curveClip)">';
 profiles.forEach((series,k)=>{
  if(state.shown&&!state.shown.includes(k))return;
  let d='',connected=false;
  series.forEach(s=>{if(!Number.isFinite(s.enthalpy)){connected=false;return}d+=(connected?'L':'M')+X((maxima[k]-s.enthalpy)/1000)+' '+Y(s.temperature);connected=true});
  body+='<path d="'+d+'" fill="none" stroke="'+pointColors[k]+'" stroke-width="2.5"/>';
  const s=series[state.ti];if(Number.isFinite(s.enthalpy)&&Number.isFinite(maxima[k]))body+='<circle cx="'+X((maxima[k]-s.enthalpy)/1000)+'" cy="'+Y(s.temperature)+'" r="5" fill="'+pointColors[k]+'"/>';
 });
 body+=line(65,Y(state.model.T[state.ti]),855,Y(state.model.T[state.ti]),'#555',1,'5 4')+'</g>';
 for(let i=0;i<=5;i++)body+=text(55,Y(minT+(maxT-minT)*i/5)+4,fmt(minT+(maxT-minT)*i/5,0),13,'end')+text(X(span*i/5),425,fmt(span*i/5,0),13,'middle');
 body+=text(10,47,'T / °C')+text(460,452,''+(state.model.diagramModel?'Normiertes Wärmeabfuhrmaß / Modellgröße':'Entzogene molare Enthalpie / kJ mol⁻¹')+'',14,'middle');
 (state.shown||state.points.map((_,i)=>i)).forEach((i,j)=>body+=text(440+70*j,27,state.labels?.[i]||'X'+(i+1),14,'middle',pointColors[i]));
 return svg(body,900,475,'Energetische Abkühlkurven');
}