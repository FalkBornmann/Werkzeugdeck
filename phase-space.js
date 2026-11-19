import { svg, text, line, fieldColor, display, fmt, pointColors } from './render.js';
import { elementSymbol } from './symbols.js';
export function phaseSpaceChart(state){
 const surface=state.surface;
 if(!surface)return svg(text(40,55,'Liquidusfläche wird lokal berechnet …',18),900,560);
 const low=state.model.T[0],high=state.model.T.at(-1),yaw=(state.camera?.yaw||0)*Math.PI/180,pitch=(state.camera?.pitch||28)*Math.PI/180;
 const rawProject=(x,t)=>{
  const d=display(x,state),u=(d[1]+d[2]*.5-.5)*600,v=(d[2]-.333)*520,z=(t-low)/(high-low)*320;
  const rx=u*Math.cos(yaw)-v*Math.sin(yaw),ry=u*Math.sin(yaw)+v*Math.cos(yaw);
  return [rx,ry*Math.sin(pitch)-z*Math.cos(pitch),ry*Math.cos(pitch)+z*Math.sin(pitch)];
 };
 const vertices=[[1,0,0],[0,1,0],[0,0,1]];
 const bounds=vertices.flatMap(x=>[rawProject(x,low),rawProject(x,high)]);
 const minX=Math.min(...bounds.map(p=>p[0])),maxX=Math.max(...bounds.map(p=>p[0])),minY=Math.min(...bounds.map(p=>p[1])),maxY=Math.max(...bounds.map(p=>p[1]));
 const scale=Math.min(650/(maxX-minX),370/(maxY-minY));
 const project=(x,t)=>{const p=rawProject(x,t);return [450+scale*(p[0]-(minX+maxX)/2),280+scale*(p[1]-(minY+maxY)/2),p[2]]};
 const base=vertices.map(x=>project(x,low)),top=vertices.map(x=>project(x,high));
 let body=text(30,28,'Liquidusfläche im ternären Temperaturprisma',18);
 body+=text(30,51,'Ziehen zum Drehen · Pfeiltasten drehen die Ansicht · T / °C',12);
 // Mesh is drawn back to front. Every facet belongs to the same scalar surface as the contours.
 const faces=(surface.drawTriangles||surface.triangles).map(face=>{
  const nodes=face.map(i=>surface.nodes[i]);
  if(nodes.some(n=>n.value===null))return null;
  const p=nodes.map(n=>project(n.x,n.value));
  return {p,depth:p.reduce((s,q)=>s+q[2],0)/3,color:fieldColor(nodes[0].primary)};
 }).filter(Boolean).sort((a,b)=>b.depth-a.depth);
 for(const face of faces)body+='<path data-surface-face d="'+face.p.map((p,i)=>(i?'L':'M')+p.slice(0,2).join(' ')).join('')+'Z" fill="'+face.color+'" stroke="'+face.color+'" stroke-width=".45"/>';
 for(let i=0;i<3;i++){
  body+=line(...base[i].slice(0,2),...base[(i+1)%3].slice(0,2),'#726555',1.2);
  body+=line(...top[i].slice(0,2),...top[(i+1)%3].slice(0,2),'#a69683',1,'4 4');
  body+=line(...base[i].slice(0,2),...top[i].slice(0,2),'#726555',1);
  body+=text(base[i][0],base[i][1]+24,elementSymbol(state.model.components[i]),15,'middle');
 }
 for(let k=0;k<=4;k++){
  const t=low+(high-low)*k/4,p=project(vertices[0],t);
  body+=text(p[0]-9,p[1]+4,fmt(t,0),11,'end');
 }
 // Highlight the binary borders at which one component is absent.
 for(let component=0;component<3;component++){
  const points=surface.nodes.filter(n=>n.value!==null&&n.x[component]<1e-8).sort((a,b)=>a.x[(component+1)%3]-b.x[(component+1)%3]);
  body+='<path data-binary-edge="'+component+'" d="'+points.map((n,i)=>(i?'L':'M')+project(n.x,n.value).slice(0,2).join(' ')).join('')+'" fill="none" stroke="#63412d" stroke-width="2.8"/>';
 }
 const a0=project(state.a,low),b0=project(state.b,low),a1=project(state.a,high),b1=project(state.b,high);
 body+='<path d="M'+a0.slice(0,2).join(' ')+'L'+b0.slice(0,2).join(' ')+'L'+b1.slice(0,2).join(' ')+'L'+a1.slice(0,2).join(' ')+'Z" fill="#347aa0" fill-opacity=".10" stroke="#26627e" stroke-width="1" stroke-dasharray="5 4"/>';
 state.points.forEach((x,i)=>{if(state.shown&&!state.shown.includes(i))return;const p=project(x,state.model.T[state.ti]);body+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="'+pointColors[i]+'"/>'+text(p[0]+7,p[1]-6,state.labels?.[i]||'X'+(i+1),12)});
 body+=text(450,530,'Liquidus: vollständig flüssig oberhalb der Fläche · Schnittfläche S₁–S₂ blau',13,'middle');
 body+=text(450,552,'Farben kennzeichnen die näherungsweise Primärphase; keine vollständigen Phasenvolumina.',11,'middle');
 return svg(body,900,575,'Drehbare Liquidusfläche mit binären Randkurven');
}
