// Extract the existing ternary hull boundary without a new thermodynamic fit.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {systems} from './systems.js';
import {composition,profile} from './equilibrium.js';
import {makeBinaryEdge} from './binary-edges.js';
import {reactionReferences} from './reaction-data.js';
import {displayedSolidus,displayedBinaryLiquidus} from './solidus-display.js';
import {boundaryFromSeries} from './boundary.js';
const read=name=>JSON.parse(gunzipSync(readFileSync(new URL(name,import.meta.url))));
const write=(name,data)=>writeFileSync(new URL(name,import.meta.url),gzipSync(JSON.stringify(data),{level:9}));
let cachedKey,cached;
for(const definition of systems.filter(s=>s.edge&&s.family==='metal')){
 const parent=systems.find(s=>s.id===definition.edge.parent);
 if(cachedKey!==parent.id){
  if(parent.hullIndex){const index=JSON.parse(readFileSync(new URL(parent.hullIndex,import.meta.url)));cached={...index.model,frames:index.parts.flatMap(f=>read(f).frames)}}
  else cached=read(parent.id+'-hulls.json.gz');
  cached.system=parent.id;cached.solidusDisplay=read(parent.id+'-solidus.json.gz');cachedKey=parent.id;
 }
 const m=cached,atlas=read(parent.id+'-liquidus.json.gz'),surface={n:atlas.n,nodes:atlas.nodes.map(p=>({value:p[0]}))};
 const {indices}=definition.edge,missing=[0,1,2].find(i=>!indices.includes(i));
 const frames=m.frames.map(frame=>{
  const vertices=[],faces=[],groups=[],map=new Map(),seen=new Set();
  const transfer=id=>{if(map.has(id))return map.get(id);const v=frame.vertices[id],x=composition(m,v),sum=x[indices[0]]+x[indices[1]],index=vertices.length;vertices.push([v[0],x[indices[0]]/sum,v.at(-1)]);map.set(id,index);return index};
  frame.faces.forEach((face,fi)=>{
   const positions=face.map((id,i)=>({id,i,x:composition(m,frame.vertices[id])})).filter(p=>Math.abs(p.x[missing])<1e-9);
   if(positions.length!==2||Math.abs(positions[0].x[indices[0]]-positions[1].x[indices[0]])<1e-14)return;
   const key=positions.map(p=>p.id).sort((a,b)=>a-b).join(',');
   if(seen.has(key))return;seen.add(key);faces.push(positions.map(p=>transfer(p.id)));
   if(frame.groups)groups.push(positions.map(p=>frame.groups[fi][p.i]));
  });
  if(!faces.length)throw Error(definition.id+' has no boundary faces');
  return {vertices,faces,...(frame.groups?{groups}:{})};
 });
 const {frames:ignored,solidusDisplay:ignoredBoundary,...metadata}=m;
 const model={...metadata,system:definition.id,components:indices.map(i=>m.components[i]),masses:indices.map(i=>m.masses[i]),frames,
  sourceEdge:definition.edge,method:'Exact boundary edges of the existing ternary Gibbs lower hull; no new thermodynamic fit'};
 write(definition.id+'-hulls.json.gz',model);
 const view=makeBinaryEdge(m,definition,surface,reactionReferences(m)),n=atlas.n*4,nodes=[],liquidusNodes=[];
 for(let i=0;i<=n;i++){
  const x=[i/n,1-i/n],series=profile(view,x),root=boundaryFromSeries(series,'solidus')[0];
  nodes.push(root?displayedSolidus(view,x,root,series):null);liquidusNodes.push(displayedBinaryLiquidus(view,x));
 }
 write(definition.id+'-solidus.json.gz',{version:1,n,components:model.components,nodes,liquidusNodes,sourceEdge:definition.edge,method:'Boundary reconstruction sampled from the same ternary display model'});
 console.log(definition.id,'compact hull',readFileSync(new URL(definition.id+'-hulls.json.gz',import.meta.url)).length,'bytes');
}

