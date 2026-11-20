import { transitionEstimate } from './geometry.js';
import { profile, EPS } from './equilibrium.js';
export function boundaryFromSeries(series,kind='liquidus'){
 const predicate=s=>s?.phases&&(kind==='liquidus'?s.liquid>1-EPS:s.liquid>EPS);
 const roots=[];
 for(let i=1;i<series.length;i++)if(!!predicate(series[i])!==!!predicate(series[i-1])){
  const lower=series[i-1].temperature,upper=series[i].temperature;
  const amount=s=>kind==='liquidus'?1-s.liquid:s.liquid;
  const inside=amount(series[i-1])>1e-7?i-1:i,neighbor=inside===i-1?inside-1:inside+1;
  let temperature=(lower+upper)/2;
  if(neighbor>=0&&neighbor<series.length){
   const a=amount(series[inside]),n=amount(series[neighbor]);
   if(n>a+1e-9)temperature=series[inside].temperature-a*(series[neighbor].temperature-series[inside].temperature)/(n-a);
  }
  temperature=Math.max(lower,Math.min(upper,temperature));
  roots.push({temperature,bracket:[lower,upper],index:i});
 }
 return roots;
}
export function boundaryAt(model,x,kind='liquidus'){return boundaryFromSeries(profile(model,x),kind)}
// No free smoothing of individual isotherms: they are contours of one scalar surface.
export function surfaceTemperature(surface,x){
 if(!surface)return null;
 const {nodes,triangles,n}=surface;
 if(n){
  const u=Math.max(0,Math.min(n,x[1]*n)),v=Math.max(0,Math.min(n,x[2]*n));
  const i=Math.min(n-1,Math.floor(u)),j=Math.min(n-1-i,Math.floor(v)),f=u-i,g=v-j;
  const at=(a,b)=>nodes[b*(n+1)-b*(b-1)/2+a].value;
  if(f+g<=1+1e-9)return (1-f-g)*at(i,j)+f*at(i+1,j)+g*at(i,j+1);
  return (1-g)*at(i+1,j)+(f+g-1)*at(i+1,j+1)+(1-f)*at(i,j+1);
 }
 for(const face of triangles){
  const p=face.map(i=>nodes[i]),a=p[0].x,b=p[1].x,c=p[2].x;
  if(p.some(n=>n.value===null))continue;
  if(x[0]<Math.min(a[0],b[0],c[0])-1e-9||x[0]>Math.max(a[0],b[0],c[0])+1e-9||x[1]<Math.min(a[1],b[1],c[1])-1e-9||x[1]>Math.max(a[1],b[1],c[1])+1e-9)continue;
  const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(d)<1e-14)continue;
  const u=((b[1]-c[1])*(x[0]-c[0])+(c[0]-b[0])*(x[1]-c[1]))/d;
  const v=((c[1]-a[1])*(x[0]-c[0])+(a[0]-c[0])*(x[1]-c[1]))/d,w=1-u-v;
  if(Math.min(u,v,w)>=-1e-8)return u*p[0].value+v*p[1].value+w*p[2].value;
 }
 return null;
}
export function residualPath(series){
 const points=series.slice().reverse().map(s=>({temperature:s.temperature,phase:s.phases?.find(p=>p.raw==='LIQUID')})).filter(s=>s.phase);
 if(!points.length)return [];
 const last=points.at(-1),before=points.at(-2);
 if(before&&last.phase.fraction>1e-7&&before.phase.fraction>last.phase.fraction+1e-7){
  const f=last.phase.fraction/(before.phase.fraction-last.phase.fraction);
  const limit=last.phase.x.map((v,i)=>v+f*(v-before.phase.x[i]));
  if(limit.every(v=>v>=-1e-6&&v<=1+1e-6)&&Math.max(...limit.map((v,i)=>Math.abs(v-last.phase.x[i])))<.03)
   points.push({temperature:last.temperature,phase:{x:limit.map(v=>Math.max(0,v)),fraction:0},limit:true});
 }
 return points;
}


