import { transitionEstimate } from './geometry.js';
import { boundaryFromSeries } from './boundary.js';
import {solve,profile,interpolate,toMoles,toMass} from './equilibrium.js';
let model,latestLoad=0,surfaceCache=null;
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
 const nodes=[],triangles=[],drawTriangles=[],map=new Map(),n=120;
 for(let j=0;j<=n;j++)for(let i=0;i<=n-j;i++){
  const x=[1-(i+j)/n,i/n,j/n],b=boundary(x);
  map.set(i+','+j,nodes.length);nodes.push({x,value:b?.value??null,rawValue:b?.value??null,bracket:b?.bracket,primary:b?.primary||''});
 }
 for(let j=0;j<n;j++)for(let i=0;i<n-j;i++){
  triangles.push([map.get(i+','+j),map.get((i+1)+','+j),map.get(i+','+(j+1))]);
  if(i+j<n-1)triangles.push([map.get((i+1)+','+j),map.get((i+1)+','+(j+1)),map.get(i+','+(j+1))]);
 }
 const links=nodes.map(()=>new Set());
 for(const f of triangles)for(const i of f)for(const j of f)if(i!==j)links[i].add(j);
 // Relax discretization noise only inside one primary field and the original
 // temperature bracket. Physical field changes, binary edges and vertices stay fixed.
 for(let pass=0;pass<3;pass++){
  const next=nodes.map((node,i)=>{
   if(node.value===null||node.x.some(v=>v<1e-9))return node.value;
   const neighbors=[...links[i]].map(j=>nodes[j]);
   if(neighbors.some(p=>p.value===null||p.primary!==node.primary))return node.value;
   const mean=neighbors.reduce((s,p)=>s+p.value,0)/neighbors.length;
   return Math.max(node.bracket[0],Math.min(node.bracket[1],.35*node.value+.65*mean));
  });
  nodes.forEach((node,i)=>node.value=next[i]);
 }
 // Coarser rendering mesh for the interactive 3D view; numerical contours use all nodes.
 for(let j=0;j<n;j+=2)for(let i=0;i<n-j;i+=2){
  drawTriangles.push([map.get(i+','+j),map.get((i+2)+','+j),map.get(i+','+(j+2))]);
  if(i+j<n-2)drawTriangles.push([map.get((i+2)+','+j),map.get((i+2)+','+(j+2)),map.get(i+','+(j+2))]);
 }
 return {nodes,triangles,drawTriangles,n};
}
self.onmessage=async({data:message})=>{
 try{
  if(message.type==='load'){
   latestLoad=message.id;
   const response=await fetch(message.key+'-hulls.json.gz');
   if(!response.ok)throw Error('Modelldatei konnte nicht geladen werden');
   const loaded=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
   if(message.id!==latestLoad)return;
   model=loaded;surfaceCache=null;postMessage({type:'loaded',id:message.id,model});
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
