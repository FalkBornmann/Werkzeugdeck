import {makeBinaryEdge} from './binary-edges.js';
import {reactionReferences} from './reaction-data.js';
import {elementSymbol} from './symbols.js';
import {systems} from './systems.js';
import {diagramSetup,diagramLiquidus,solveDiagram} from './diagram-model.js';
import { transitionEstimate } from './geometry.js';
import { boundaryFromSeries } from './boundary.js';
import {solve,profile,interpolate,toMoles,toMass,phaseName} from './equilibrium.js';
let model,atlas,latestLoad=0,surfaceCache=null,parentCache=null;
function boundary(x){
 let lo=0,hi=model.T.length-1;
 const test=i=>{const s=solve(model,x,i);return s&&s.liquid>1-1e-7};
 if(!test(hi)||test(0))return null;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(test(mid))hi=mid;else lo=mid}
 const indices=[Math.max(0,lo-1),lo,hi,Math.min(model.T.length-1,hi+1)];
 const samples=indices.map(i=>({temperature:model.T[i],...solve(model,x,i)}));
 const root=boundaryFromSeries(samples,'liquidus')[0];
 const solids=solve(model,x,lo)?.phases.filter(p=>p.raw!=='LIQUID').sort((a,b)=>b.fraction-a.fraction);
 return {value:root?.temperature??(model.T[lo]+model.T[hi])/2,bracket:[model.T[lo],model.T[hi]],primary:solids?.[0]?.name||''};
}
function makeSurface(){
 if(model.diagramModel){
  const surface=model.diagram;
  if(!surface.nodes.some(n=>n.primary))for(const node of surface.nodes){if(node.value===null)continue;const ti=Math.max(0,model.T.findLastIndex(t=>t<node.value-.5));const sample=solveDiagram(model,node.x,ti);node.primary=sample.phases.filter(p=>p.raw!=='LIQUID').sort((a,b)=>b.fraction-a.fraction)[0]?.name||'Modellprimärfeld'}
  return {...surface,edges:makeEdges()};
 }

 const {n}=atlas,nodes=[],triangles=[],drawTriangles=[],map=new Map();
 let k=0;
 for(let j=0;j<=n;j++)for(let i=0;i<=n-j;i++){
  const [value,branch]=atlas.nodes[k],id=atlas.branches[branch],raw=id.split('#')[0];
  const primary=phaseName(raw,model)+(raw==='FCC_A1'?' ('+elementSymbol(id.split('#')[1]||'')+')':'');
  map.set(i+','+j,k++);nodes.push({x:[1-(i+j)/n,i/n,j/n],value,primary});
 }
 const mesh=(step,target)=>{for(let j=0;j<n;j+=step)for(let i=0;i<n-j;i+=step){
  target.push([map.get(i+','+j),map.get((i+step)+','+j),map.get(i+','+(j+step))]);
  if(i+j<n-step)target.push([map.get((i+step)+','+j),map.get((i+step)+','+(j+step)),map.get(i+','+(j+step))]);
 }};
 mesh(1,triangles);mesh(4,drawTriangles);
 const edges=makeEdges();
 return {nodes,triangles,drawTriangles,n,reactionSegments:atlas.reactionSegments,edges,method:atlas.method};
}
function makeEdges(){
 const edges=[];
 for(const [a,b] of [[0,1],[1,2],[2,0]]){
  const columns=[];
  for(let i=0;i<=80;i++){const x=[0,0,0];x[a]=1-i/80;x[b]=i/80;columns.push({x,series:profile(model,x)})}
  edges.push({a,b,columns});
 }
 return edges;
}
self.onmessage=async({data:message})=>{
 try{
  if(message.type==='load'){
   latestLoad=message.id;
   const read=async name=>{const r=await fetch(name);if(!r.ok)throw Error('Modelldatei konnte nicht geladen werden: '+name);return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json()};
   const selected=systems.find(s=>s.id===message.key),key=selected.edge?.parent||message.key;
   const definition=systems.find(s=>s.id===key);
   let loaded,loadedAtlas=null;
   if(parentCache?.key===key){loaded=parentCache.model;loadedAtlas=parentCache.atlas}
   else{
    const diagramFile=definition?.diagramFile;
    if(key==='salt'||diagramFile)loaded=diagramSetup(await read(diagramFile||'salt-diagram.json.gz'));
    else{
     const indexFile=definition?.hullIndex;
     if(indexFile){
      const response=await fetch(indexFile);if(!response.ok)throw Error('Modellindex konnte nicht geladen werden: '+indexFile);
      const index=await response.json();loaded={...index.model,frames:[]};
      for(const file of index.parts){const part=await read(file);loaded.frames.push(...part.frames)}
     }else loaded=await read(key+'-hulls.json.gz');
     loaded.system=key;
     loaded.solidusDisplay=await read(key+'-solidus.json.gz');
     if(loaded.components.length===3)loadedAtlas=await read(key+'-liquidus.json.gz');
    }
    parentCache={key,model:loaded,atlas:loadedAtlas};
   }
   if(selected.edge){
    const surface=loadedAtlas?{n:loadedAtlas.n,nodes:loadedAtlas.nodes.map(p=>({value:p[0]}))}:null;
    loaded=makeBinaryEdge(loaded,selected,surface,reactionReferences(loaded));loadedAtlas=null;
   }
   if(message.id!==latestLoad)return;
   model=loaded;atlas=loadedAtlas;surfaceCache=null;postMessage({type:'loaded',id:message.id,model});
  }
  if(message.type==='section'){
   const columns=[];
   for(let i=0;i<=200;i++){
    const x=message.basis==='mass'?toMoles(interpolate(toMass(message.a,model.masses),toMass(message.b,model.masses),i/200),model.masses):interpolate(message.a,message.b,i/200);
    columns.push({x,series:profile(model,x)});
   }
   postMessage({type:'section',id:message.id,columns});
  }
  if(message.type==='surface'){
   surfaceCache??=makeSurface();
   postMessage({type:'surface',id:message.id,...surfaceCache});
  }
 }catch(error){postMessage({type:'error',id:message.id,message:error.message})}
};