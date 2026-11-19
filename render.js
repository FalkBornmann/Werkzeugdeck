import {toMass,composition,phaseName,contourSegments,thresholds} from './equilibrium.js';
export const pointColors=['#8c4a12','#354fa0','#9e365b','#126957'];
export const fmt=(value,digits=2)=>Number(value.toFixed(digits)).toLocaleString('de-DE');
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const text=(x,y,s,size=13,anchor='start',color='#382f25')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" text-anchor="'+anchor+'" fill="'+color+'">'+escape(s)+'</text>';
export const line=(x,y,u,v,color='#bbb',width=1,dash='')=>'<path d="M'+x+' '+y+'L'+u+' '+v+'" fill="none" stroke="'+color+'" stroke-width="'+width+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
export function svg(body,width=900,height=500,label='Legierungsatlas'){
 return '<svg class="chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'" role="img" aria-label="'+escape(label)+'" font-family="system-ui"><rect width="100%" height="100%" fill="white"/>'+body+'</svg>';
}
export function fieldColor(name){
 if(!name)return '#ccc';
 let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))>>>0;
 return 'hsl('+(h%360)+' 36% 85%)';
}
export function liquidColor(f){return 'rgb('+[0,1,2].map((_,i)=>Math.round([235,216,175][i]*(1-f)+[55,126,157][i]*f)).join(',')+')'}
export function display(x,state){return state.basis==='mass'?toMass(x,state.model.masses):x}
export function compositionLabel(x,state){
 return display(x,state).map((v,i)=>state.model.components[i]+' '+fmt(v*100)+' %').join(' · ');
}
export function trianglePoint(x,state){
 const v=display(x,state);
 if(state.zoom==='tin')return [65+690*(v[0]+v[1]*.5)/.1,425-360*v[1]/.1];
 return [65+690*(v[1]+v[2]*.5),425-360*v[2]];
}
export function triangleInverse(px,py,state){
 const q=(425-py)/360,p=(px-65)/690-q*.5;
 return state.zoom==='tin'?[p*.1,q*.1,1-(p+q)*.1]:[1-p-q,p,q];
}
function path(points){return points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('')+'Z'}
function faceSignature(model,nodes){
 const names=[...new Set(nodes.map(n=>phaseName(model.phases[n[0]])))];
 return names.sort().join(' + ');
}
export function triangleChart(state){
 const {model,surface,ti}=state;
 let body=text(65,24,state.triangleMode==='projection'?'Liquidusprojektion':'Isothermer Schnitt · '+fmt(model.T[ti])+' °C',19);
 const outline=[[65,425],[755,425],[410,65]];
 body+='<defs><clipPath id="triangleClip"><path d="'+path(outline)+'"/></clipPath></defs><g clip-path="url(#triangleClip)">';
 const labels=new Map();
 if(state.triangleMode==='isothermal'){
  const frame=model.frames[ti],edges=new Map();
  frame.faces.forEach(face=>{
   const nodes=face.map(i=>frame.vertices[i]);
   const points=nodes.map(n=>trianglePoint(composition(model,n),state));
   if(Math.max(...points.map(p=>p[0]))<65||Math.min(...points.map(p=>p[0]))>755||Math.max(...points.map(p=>p[1]))<65||Math.min(...points.map(p=>p[1]))>425)return;
   const signature=faceSignature(model,nodes);
   const f=nodes.filter(n=>model.phases[n[0]]==='LIQUID').length/nodes.length;
   body+='<path d="'+path(points)+'" fill="'+(state.style==='liquid'?liquidColor(f):fieldColor(signature))+'"/>';
   const centroid=points[0].map((_,j)=>points.reduce((s,p)=>s+p[j],0)/3);
   const area=Math.abs((points[1][0]-points[0][0])*(points[2][1]-points[0][1])-(points[2][0]-points[0][0])*(points[1][1]-points[0][1]));
   if(!labels.has(signature)||area>labels.get(signature).area)labels.set(signature,{point:centroid,area});
   for(let i=0;i<3;i++){const key=[face[i],face[(i+1)%3]].sort((a,b)=>a-b).join(',');if(!edges.has(key))edges.set(key,{points:[points[i],points[(i+1)%3]],signature});else if(edges.get(key).signature!==signature)body+=line(...points[i],...points[(i+1)%3],'#8c8174',1)}
  });
 }else if(surface){
  for(const face of surface.triangles){
   const nodes=face.map(i=>surface.nodes[i]);
   const names=nodes.map(n=>n.primary).filter(Boolean);
   const name=names.sort((a,b)=>names.filter(v=>v===b).length-names.filter(v=>v===a).length)[0]||'';
   if(name){if(!labels.has(name))labels.set(name,{sumX:0,sumY:0,count:0});const label=labels.get(name),p=nodes.map(n=>trianglePoint(n.x,state));label.sumX+=p.reduce((v,q)=>v+q[0],0)/3;label.sumY+=p.reduce((v,q)=>v+q[1],0)/3;label.count++;}
   body+='<path d="'+path(nodes.map(n=>trianglePoint(n.x,state)))+'" fill="'+fieldColor(name)+'"/>';
  }
  const values=surface.nodes.map(n=>n.value).filter(v=>v!==null);
  const interval=Number(state.interval);
  for(let level=Math.ceil(Math.min(...values)/interval)*interval;level<=Math.max(...values);level+=interval){
   const segments=contourSegments(surface.nodes,surface.triangles,level);
   body+='<path d="'+segments.map(segment=>segment.map((p,i)=>(i?'L':'M')+trianglePoint(p,state).join(' ')).join('')).join('')+'" fill="none" stroke="#726354" stroke-width="1.2"/>';
   if(segments.length){const p=trianglePoint(segments[Math.floor(segments.length*.6)][0],state);body+=text(...p,fmt(level)+'°',12)}
  }
 }
 if(state.triangleMode==='projection')for(const [name,label] of labels)if(label.count>16)body+='<g style="paint-order:stroke;stroke:white;stroke-width:4px">'+text(label.sumX/label.count,label.sumY/label.count,name,13,'middle')+'</g>';
 for(let k=1;k<10;k++){
  const f=k/10;
  body+=line(65+690*f,425,410+345*f,65+360*f,'#706354',.4);
  body+=line(65+345*f,425-360*f,755-345*f,425-360*f,'#706354',.4);
  body+=line(755-690*f,425,410-345*f,65+360*f,'#706354',.4);
 }
 if(state.triangleMode==='isothermal'){
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
 state.points.forEach((x,i)=>{const p=trianglePoint(x,state);body+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="'+pointColors[i]+'"/>'+text(p[0]+6,p[1]+17,'X'+(i+1),13)});
 for(const [p,name] of [[a,'S₁'],[b,'S₂']])body+='<circle data-endpoint="'+name+'" cx="'+p[0]+'" cy="'+p[1]+'" r="10" fill="white" stroke="#513821" stroke-width="3"/>'+text(p[0],p[1]-14,name,15,'middle');
 if(state.profiles?.length){
  const samples=state.profiles[state.selected].slice().reverse().map(s=>s.phases?.find(p=>p.raw==='LIQUID')).filter(Boolean);
  if(samples.length>1)body+='<path d="'+samples.map((p,i)=>(i?'L':'M')+trianglePoint(p.x,state).join(' ')).join('')+'" stroke="#a22c34" stroke-width="2.5" stroke-dasharray="5 3" fill="none"/>';
 }
 body+='</g><path d="'+path(outline)+'" fill="none" stroke="#5e5144" stroke-width="1.5"/>';
 const names=state.zoom==='tin'?['Sn','10 % Ag','10 % Cu']:model.components;
 body+=text(65,449,names[0],16,'middle')+text(755,449,names[1],16,'middle')+text(410,54,names[2],16,'middle');
 for(let i=1;i<10;i++)body+=text(65+690*i/10,444,fmt(i*(state.zoom==='tin'?1:10),0),11,'middle');
 body+=text(410,478,'Zusammensetzung in '+(state.basis==='mass'?'Masse-%':'mol-%')+' · NIST-Gleichgewichtsmodell',13,'middle');
 return svg(body,820,495,'Gehaltsdreieck mit Isothermen und freier Schnittlinie');
}
export function sectionChart(state){
 const {model,columns}=state,n=columns.length-1;
 const view=state.window,low=view[0],high=view[1];
 const X=lambda=>65+790*lambda,Y=t=>410-350*(t-low)/(high-low);
 let body=text(65,23,'S₁–S₂ · '+(state.style==='fields'?'Phasenfelder':'Schmelzanteil'),18);
 body+='<defs><clipPath id="sectionClip"><rect x="65" y="60" width="790" height="350"/></clipPath></defs><g clip-path="url(#sectionClip)">';
 const legend=new Set(),cells=[],counts=new Map();
 columns.forEach((column,i)=>{
  const width=790/n,left=X(Math.max(0,(i-.5)/n));
  column.series.forEach((s,j)=>{
   const top=Y((model.T[j]+(model.T[j+1]??model.T[j]))/2),bottom=Y((model.T[j]+(model.T[j-1]??model.T[j]))/2);
   const signature=s.signature||'Datenlücke';legend.add(signature);
   let f=s.liquid??0;if(state.basis==='mass'&&s.phases)f=s.phases.filter(p=>p.raw==='LIQUID').reduce((sum,p)=>sum+p.mass,0);
   body+='<rect x="'+left+'" y="'+top+'" width="'+width+'" height="'+Math.max(.01,bottom-top+.05)+'" fill="'+(state.style==='fields'?fieldColor(signature):liquidColor(f))+'"/>';
   if(j&&column.series[j-1].signature!==signature)body+=line(left,bottom,left+width,bottom,'#726b61',.8);
   if(i&&columns[i-1].series[j].signature!==signature)body+=line(left,top,left,bottom,'#726b61',.8);
   if(top>=60&&bottom<=410){
    if(!counts.has(signature))counts.set(signature,[]);
    counts.get(signature).push({x:left+width/2,y:(top+bottom)/2});
   }
  });
 });
 for(const [field,list] of counts){
  if(list.length<12||Math.max(...list.map(p=>p.y))-Math.min(...list.map(p=>p.y))<18||Math.max(...list.map(p=>p.x))-Math.min(...list.map(p=>p.x))<field.length*5.5)continue;
  const mx=list.reduce((s,p)=>s+p.x,0)/list.length,my=list.reduce((s,p)=>s+p.y,0)/list.length;
  const p=list.reduce((best,p)=>(p.x-mx)**2+(p.y-my)**2<(best.x-mx)**2+(best.y-my)**2?p:best);
  body+='<g style="paint-order:stroke;stroke:white;stroke-width:4px;stroke-linejoin:round">'+text(p.x,p.y,field,12,'middle')+'</g>';
 }
 for(const kind of ['liquidus','solidus']){
  let d='',connected=false;
  columns.forEach((column,i)=>{
   const bracket=thresholds(column.series)[kind];
   if(!bracket){connected=false;return}
   const t=(bracket[0]+bracket[1])/2;
   d+=(connected?'L':'M')+X(i/n)+' '+Y(t);connected=true;
  });
  body+='<path d="'+d+'" fill="none" stroke="'+(kind==='liquidus'?'#b62c32':'#176657')+'" stroke-width="3"/>';
 }
 body+=line(65,Y(model.T[state.ti]),855,Y(model.T[state.ti]),'#252525',1.5,'5 4');
 state.lambdas.forEach((lambda,i)=>body+=line(X(lambda),60,X(lambda),410,pointColors[i],i===state.selected?3:1.5)+text(X(lambda),52,'X'+(i+1),14,'middle',pointColors[i]));
 body+='</g>';
 for(let i=0;i<=5;i++){
  const t=low+(high-low)*i/5;
  body+=text(58,Y(t)+4,fmt(t,0),13,'end')+line(65,Y(t),855,Y(t),'#8e8375',.35);
  const c=state.binary ? display(columns[Math.round(n*i/5)].x,state)[0]*100 : i*20;
  body+=text(X(i/5),435,fmt(c,0),14,'middle');
 }
 body+=text(12,42,'T / °C',14)+text(460,463,state.binary?model.components[0]+' / '+(state.basis==='mass'?'Masse-%':'mol-%'):'Position entlang S₁–S₂ / %',15,'middle');
 body+=text(460,490,'NIST-Gleichgewicht · Anschmelzbeginn und Liquidus innerhalb der Temperaturauflösung',12,'middle');
 return {image:svg(body,900,505,'Gehaltsschnitt mit beschrifteten Phasenfeldern'),legend:[...legend]};
}
export function curvesChart(state){
 const profiles=state.profiles;
 const minT=state.window[0],maxT=state.window[1],Y=t=>395-330*(t-minT)/(maxT-minT);
 const energies=profiles.map(p=>p.map(s=>s.enthalpy));
 const maxima=energies.map(e=>Math.max(...e.filter(Number.isFinite)));
 const span=Math.max(1,...energies.flatMap((e,i)=>e.filter(Number.isFinite).map(v=>(maxima[i]-v)/1000)));
 const X=q=>65+790*q/span;
 let body=text(65,25,'Abkühlverläufe · entzogene Enthalpie',18);
 body+='<defs><clipPath id="curveClip"><rect x="65" y="55" width="790" height="340"/></clipPath></defs><g clip-path="url(#curveClip)">';
 profiles.forEach((series,k)=>{
  let d='',connected=false;
  series.forEach(s=>{if(!Number.isFinite(s.enthalpy)){connected=false;return}d+=(connected?'L':'M')+X((maxima[k]-s.enthalpy)/1000)+' '+Y(s.temperature);connected=true});
  body+='<path d="'+d+'" fill="none" stroke="'+pointColors[k]+'" stroke-width="2.5"/>';
  const s=series[state.ti];body+='<circle cx="'+X((maxima[k]-s.enthalpy)/1000)+'" cy="'+Y(s.temperature)+'" r="5" fill="'+pointColors[k]+'"/>';
 });
 body+=line(65,Y(state.model.T[state.ti]),855,Y(state.model.T[state.ti]),'#555',1,'5 4')+'</g>';
 for(let i=0;i<=5;i++)body+=text(55,Y(minT+(maxT-minT)*i/5)+4,fmt(minT+(maxT-minT)*i/5,0),13,'end')+text(X(span*i/5),425,fmt(span*i/5,0),13,'middle');
 body+=text(10,47,'T / °C')+text(460,452,'Entzogene molare Enthalpie / kJ mol⁻¹',14,'middle');
 state.points.forEach((_,i)=>body+=text(570+65*i,27,'X'+(i+1),15,'middle',pointColors[i]));
 return svg(body,900,475,'Energetische Abkühlkurven');
}
export function fractionsChart(state){
 const series=state.profiles[state.selected],phases=[...new Set(series.flatMap(s=>s.phases?.map(p=>p.name)||[]))];
 const lo=state.window[0],hi=state.window[1],X=t=>65+790*(t-lo)/(hi-lo),Y=f=>365-f*290;
 let body=text(65,25,'X'+(state.selected+1)+' · Phasenanteile in '+(state.basis==='mass'?'Masse-%':'mol-%'),18);
 for(const phase of phases){
  const points=series.filter(s=>s.temperature>=lo&&s.temperature<=hi).map(s=>[X(s.temperature),Y(s.phases?.filter(p=>p.name===phase).reduce((sum,p)=>sum+(state.basis==='mass'?p.mass:p.fraction),0)||0)]);
  body+='<path d="'+points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('')+'" fill="none" stroke="'+fieldColor(phase).replace('36% 85%','65% 35%')+'" stroke-width="2"/>';
 }
 body+=line(X(state.model.T[state.ti]),75,X(state.model.T[state.ti]),365,'#555',1,'5 4');
 for(let i=0;i<=5;i++)body+=text(55,Y(i/5)+4,String(i*20),13,'end')+text(X(lo+(hi-lo)*i/5),390,fmt(lo+(hi-lo)*i/5,0),13,'middle');
 body+=text(460,418,'Temperatur / °C',14,'middle');
 phases.forEach((p,i)=>body+=text(70+(i%4)*200,446+Math.floor(i/4)*20,p,13,'start',fieldColor(p).replace('36% 85%','65% 35%')));
 return svg(body,900,475+Math.floor(phases.length/4)*20,'Phasenanteile während der Abkühlung');
}

