import {surfaceTemperature} from './boundary.js';
const cache=new WeakMap();
export function solidSignature(sample,model){
 return (sample.phases||[]).filter(p=>p.raw!=='LIQUID'&&p.fraction>1e-6).map(p=>p.raw+(['FCC_A1','BCC_A2','HCP_A3','BCT_A5'].includes(p.raw)?'#'+model.components[p.x.indexOf(Math.max(...p.x))]:'' )).sort().join('|');
}
export function displayedSolidus(model,x,root,series){
 const data=model.solidusDisplay;if(!data||!root)return null;
 if(model.components.length===2){
  const p=x[0]*data.n,i=Math.min(data.n-1,Math.floor(p)),f=p-i;return data.nodes[i]*(1-f)+data.nodes[i+1]*f;
 }
 const key=solidSignature(series[root.index-1],model),values=data.branches?.[key]||data.nodes;
 let surfaces=cache.get(data);if(!surfaces){surfaces=new Map();cache.set(data,surfaces)}
 if(!surfaces.has(key))surfaces.set(key,{n:data.n,nodes:values.map(value=>({value}))});
 const s=surfaces.get(key);let t=surfaceTemperature(s,x);
 const fit=model.directBoundaries&&data.directFits?.[key];
 if(fit){
  if(Number.isFinite(fit.constant))t=fit.constant;
  else if(Math.min(...fit.centers.map(c=>Math.hypot(c[0]-x[0],c[1]-x[1])))<.18){
   t=fit.poly[0]+fit.poly[1]*(x[0]-fit.shift[0])/fit.scale[0]+fit.poly[2]*(x[1]-fit.shift[1])/fit.scale[1];
   fit.centers.forEach((c,i)=>{const r=Math.hypot(c[0]-x[0],c[1]-x[1]);if(r>0)t+=fit.weights[i]*r*r*Math.log(r)});
   t=Math.max(fit.low,Math.min(fit.high,t));
  }
  if(Number.isFinite(t))return t;
 }
 // A branch interpolation cannot override evidence of a different local onset interval.
 return Number.isFinite(t)&&t>=root.bracket[0]-3&&t<=root.bracket[1]+3?t:root.temperature;
}
export function displayedBinaryLiquidus(model,x){
 const data=model.solidusDisplay,values=data?.liquidusNodes;
 if(model.components.length!==2||!values)return null;
 const p=Math.max(0,Math.min(1,x[0]))*data.n,i=Math.min(data.n-1,Math.floor(p)),f=p-i;
 return values[i]*(1-f)+values[i+1]*f;
}
