import {surfaceTemperature,boundaryFromSeries} from './boundary.js';
import {svg,text,line,fieldColor,display,fmt,pointColors} from './render.js';
import {elementSymbol} from './symbols.js';
import {phaseBands,bandTracks,ribbonPath,smoothGraph} from './geometry.js';
import {liquidusGeometry} from './liquidus-geometry.js';
const edgeCache=new WeakMap();
function binaryFields(edge){
 if(edgeCache.has(edge))return edgeCache.get(edge);
 const fields=bandTracks(edge.columns.map(c=>({...c,bands:phaseBands(c.series)})));
 edgeCache.set(edge,fields);return fields;
}
export function phaseSpaceChart(state){
 const surface=state.surface;
 if(!surface)return svg(text(40,55,'Liquidusfläche wird lokal geladen …',18),900,560);
 const low=state.model.T[0],high=state.model.T.at(-1),yaw=(state.camera?.yaw||0)*Math.PI/180,pitch=(state.camera?.pitch||28)*Math.PI/180;
 const rawProject=(x,t)=>{
  const d=display(x,state),u=(d[1]+d[2]*.5-.5)*600,v=(d[2]-1/3)*300*Math.sqrt(3),z=(t-low)/(high-low)*320;
  const rx=u*Math.cos(yaw)-v*Math.sin(yaw),ry=u*Math.sin(yaw)+v*Math.cos(yaw);
  return [rx,-ry*Math.sin(pitch)-z*Math.cos(pitch),ry*Math.cos(pitch)-z*Math.sin(pitch)];
 };
 const vertices=[[1,0,0],[0,1,0],[0,0,1]],bounds=vertices.flatMap(x=>[rawProject(x,low),rawProject(x,high)]);
 const minX=Math.min(...bounds.map(p=>p[0])),maxX=Math.max(...bounds.map(p=>p[0])),minY=Math.min(...bounds.map(p=>p[1])),maxY=Math.max(...bounds.map(p=>p[1]));
 const scale=Math.min(650/(maxX-minX),370/(maxY-minY));
 const project=(x,t)=>{const p=rawProject(x,t);return [450+scale*(p[0]-(minX+maxX)/2),280+scale*(p[1]-(minY+maxY)/2),p[2]]};
 const base=vertices.map(x=>project(x,low)),top=vertices.map(x=>project(x,high)),scene=[];
 const addPolygon=(p,color,attr='',opacity=1)=>scene.push({depth:p.reduce((s,q)=>s+q[2],0)/p.length,html:'<path '+attr+' d="'+p.map((q,i)=>(i?'L':'M')+q.slice(0,2).join(' ')).join('')+'Z" fill="'+color+'" fill-opacity="'+opacity+'" stroke="'+color+'" stroke-width=".35"/>'});
 const addLine=(a,b,color,width,attr='',dash='')=>scene.push({depth:(a[2]+b[2])/2-(attr.includes('isotherm-3d')||attr.includes('reaction-3d')?10:.15),html:'<path '+attr+' d="M'+a.slice(0,2).join(' ')+'L'+b.slice(0,2).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="'+width+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>'});
 const edgeDepth=(surface.edges||[]).map(e=>({e,depth:(base[e.a][2]+base[e.b][2])/2})).sort((a,b)=>a.depth-b.depth);
 const frontEdge=edgeDepth[0]?.e;
 for(const edge of state.binaryFields===false?[]:surface.edges||[]){
  const at=(f,t)=>{const x=[0,0,0];x[edge.a]=1-f;x[edge.b]=f;return project(x,t)};
  const origin=at(0,0),unitX=at(1,0),unitY=at(0,1);
  const transform='matrix('+[unitX[0]-origin[0],unitX[1]-origin[1],unitY[0]-origin[0],unitY[1]-origin[1],origin[0],origin[1]].join(' ')+')';
  const fraction=f=>display(edge.columns[Math.round(f*80)].x,state)[edge.b];
  const labels=new Map();
  for(const track of binaryFields(edge)){
   if(track[0].allLiquid)continue;
   const points=track.map(b=>[fraction(b.position),b.upper,b.lower]);
   const depth=track.reduce((s,b)=>s+at(b.position,(b.lower+b.upper)/2)[2],0)/track.length;
   if(track.length>1)scene.push({depth,html:'<path data-binary-field="'+edge.a+'-'+edge.b+'" d="'+ribbonPath(points)+'" transform="'+transform+'" fill="'+fieldColor(track[0].signature)+'" fill-opacity=".90" stroke="#ab9b88" stroke-width=".7" vector-effect="non-scaling-stroke"/>'});
   if(edge===frontEdge&&track.length>5){
    const best=track.reduce((a,b)=>b.upper-b.lower>a.upper-a.lower?b:a);
    const area=(best.upper-best.lower)*track.length;
    const name=track[0].signature;
    if(best.upper-best.lower>(high-low)*.04&&(!labels.has(name)||area>labels.get(name).area))labels.set(name,{area,best});
   }
  }
  for(const [name,{best}] of labels){const p=at(best.position,(best.lower+best.upper)/2);scene.push({depth:p[2]-.5,html:'<g data-binary-label style="paint-order:stroke;stroke:white;stroke-width:3px">'+text(p[0],p[1],name,12,'middle')+'</g>'})}
 }
 for(const face of surface.drawTriangles||surface.triangles){
  const nodes=face.map(i=>surface.nodes[i]);if(nodes.some(n=>n.value===null))continue;
  addPolygon(nodes.map(n=>project(n.x,n.value)),fieldColor(nodes[0].primary),'data-surface-face');
 }
 for(const {t,paths} of liquidusGeometry(surface,Number(state.interval)).isotherms){
  for(const path of paths)for(let i=2;i<path.length;i+=2)addLine(project(path[i-2],t+.08),project(path[i],t+.08),'#5b5144',1,'data-isotherm-3d="'+t+'"');
 }
 if(state.reactionLines)for(const {path} of liquidusGeometry(surface,Number(state.interval)).reactions)
  for(let i=1;i<path.length;i++)addLine(project(path[i-1].x,path[i-1].t+.1),project(path[i].x,path[i].t+.1),'#30261e',1.7,'data-reaction-3d');
 for(let component=0;component<3;component++){
  const points=surface.nodes.filter(n=>n.value!==null&&n.x[component]<1e-8).sort((a,b)=>a.x[(component+1)%3]-b.x[(component+1)%3]);
  for(let i=1;i<points.length;i++)addLine(project(points[i-1].x,points[i-1].value),project(points[i].x,points[i].value),'#63412d',2.8,'data-binary-edge="'+component+'"');
 }
 let body=text(30,28,'Liquidusfläche und binäre Randdiagramme',18)+text(30,51,'Ziehen / Pfeiltasten: drehen · Isothermenabstand '+fmt(Number(state.interval))+' °C',12);
 body+=scene.sort((a,b)=>b.depth-a.depth).map(s=>s.html).join('');
 for(let i=0;i<3;i++){
  body+=line(...base[i].slice(0,2),...base[(i+1)%3].slice(0,2),'#726555',1.2);
  body+=line(...top[i].slice(0,2),...top[(i+1)%3].slice(0,2),'#a69683',1,'4 4');
  body+=line(...base[i].slice(0,2),...top[i].slice(0,2),'#726555',1);
  body+='<g data-vertex="'+i+'" data-depth="'+base[i][2]+'">'+text(base[i][0],base[i][1]+24,elementSymbol(state.model.components[i]),15,'middle')+'</g>';
 }
 // Put temperature ticks on the front-most vertical edge, visible in every side view.
 const front=base.reduce((best,p,i)=>p[2]<base[best][2]?i:best,0);
 for(let k=0;k<=5;k++){const t=low+(high-low)*k/5,p=project(vertices[front],t);body+=text(p[0]-9,p[1]+4,fmt(t,0),11,'end')}
 if(state.sectionPlane!==false){
 const a0=project(state.a,low),b0=project(state.b,low),a1=project(state.a,high),b1=project(state.b,high);
 body+='<path data-section-plane d="M'+a0.slice(0,2).join(' ')+'L'+b0.slice(0,2).join(' ')+'L'+b1.slice(0,2).join(' ')+'L'+a1.slice(0,2).join(' ')+'Z" fill="#347aa0" fill-opacity=".06" stroke="#26627e" stroke-width="1" stroke-dasharray="5 4"/>';
 // Liquidus intersection of the selected vertical section and the common surface.
 let cut='',connected=false;
 for(const column of state.columns||[]){
  const t=surfaceTemperature(surface,column.x);
  if(t===null||!Number.isFinite(t)){connected=false;continue}
  const q=project(column.x,t);cut+=(connected?'L':'M')+q.slice(0,2).join(' ');connected=true;
 }
 if(cut)body+='<path data-cut-liquidus d="'+cut+'" fill="none" stroke="white" stroke-width="5"/><path data-cut-liquidus d="'+cut+'" fill="none" stroke="#b62c32" stroke-width="3"><title>Liquiduslinie des gewählten Schnitts S₁–S₂</title></path>';
 }
 state.points.forEach((x,i)=>{if(state.shown&&!state.shown.includes(i))return;const p=project(x,state.model.T[state.ti]);body+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="'+pointColors[i]+'"/>'+text(p[0]+7,p[1]-6,state.labels?.[i]||'X'+(i+1),12)});
 body+=text(450,530,'T / °C · Oberhalb der Liquidusfläche ist das System vollständig flüssig.',13,'middle');
 body+=text(450,553,'Randdiagramme: berechnete Phasenfelder · Schnittebene blau · Schnittliquidus rot · keine Phasenvolumina',11,'middle');
 return svg(body,900,575,'Drehbare Liquidusfläche mit Isothermen und binären Phasenfeldflächen');
}