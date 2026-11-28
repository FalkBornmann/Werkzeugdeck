import {clamp,index,KEYS,validate} from './materials.js';
import {probeIndex} from './model.js';
export const METRICS={
 temperature:{label:'Temperatur',unit:'°C',max:600},
 index:{label:'Aushärtungsindex',unit:'0–100',max:100},
 solute:{label:'Gelöstes Reservoir',unit:'%',max:100},
 clusters:{label:'Cluster / Vorstufen',unit:'%',max:100},
 fine:{label:'Feine Ausscheidungen',unit:'%',max:100},
 coarse:{label:'Grobe Ausscheidungen',unit:'%',max:100}
};
export const RUN_COLORS=['#3c7497','#ad563f','#6e5596','#397d57'];
export function geometry(p){
 if(p.shape==='rod')return {shape:'rod',cx:410,cy:290,radius:180};
 const ratio=p.size/p.height,w=Math.min(640,330*ratio),h=w/ratio;
 return {shape:'plate',left:410-w/2,top:290-h/2,w,h,cx:410,cy:290};
}
export function pickField(r,px,py){
 const g=geometry(r.parameters);
 if(g.shape==='rod'){const radius=Math.hypot(px-g.cx,py-g.cy);return radius<=g.radius?{x:clamp(radius/g.radius),y:0}:null;}
 if(px<g.left||px>g.left+g.w||py<g.top||py>g.top+g.h)return null;
 return {x:clamp(Math.abs(px-g.cx)/(g.w/2)),y:clamp(Math.abs(py-g.cy)/(g.h/2))};
}
export function probe(r,x=0,y=0){
 const i=probeIndex(r,x,y),g=r.grid[i];
 return {i,ix:g.ix,iy:g.iy,xMM:g.x*1000,yMM:(g.y||0)*1000,x:(g.ix+.5)/r.nx,y:r.ny>1?(g.iy+.5)/r.ny:0};
}
export function metricValue(r,f,metric='index',location='probe',options={}){
 if(!METRICS[metric])throw Error('Unbekannte Darstellungsgröße.');
 if(location==='mean')return metric==='temperature'?f.meanT:metric==='index'?f.meanIndex:100*f.mean[metric];
 const i=location==='core'?0:location==='edge'?r.grid.length-1:probeIndex(r,options.x||0,options.y||0);
 return metric==='temperature'?f.temps[i]:metric==='index'?index(f.states[i]):100*f.states[i][metric];
}
export function atTime(r,t,metric,location,options={}){
 if(!Number.isFinite(t)||t<0||t>r.total+1e-7)return null;
 const frames=r.frames;
 let lo=0,hi=frames.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(frames[mid].time<t)lo=mid+1;else hi=mid;}
 const b=frames[lo];if(lo===0||b.time===t)return metricValue(r,b,metric,location,options);
 const a=frames[lo-1],z=(t-a.time)/(b.time-a.time);
 return metricValue(r,a,metric,location,options)*(1-z)+metricValue(r,b,metric,location,options)*z;
}
export function profile(r,f,y=0,metric='temperature'){
 const iy=r.ny>1?Math.min(r.ny-1,Math.floor(clamp(y)*r.ny)):0;
 return Array.from({length:r.nx},(_,ix)=>{
  const i=iy*r.nx+ix;
  return {x:r.grid[i].x*1000,value:metricValue(r,f,metric,'probe',{x:(ix+.5)/r.nx,y:r.ny>1?(iy+.5)/r.ny:0}),i};
 });
}
export function compareSeries(current,saved,options={}){
 const metric=options.compareMetric||'index',location=options.compareLocation||'mean',relative=options.compareAxis==='relative';
 return [...saved.map((entry,i)=>({...entry,color:RUN_COLORS[i],dash:[[],[9,3],[2,3],[10,3,2,3]][i]})),...(current?[{name:'Aktuell',result:current,color:'#302b25',dash:[7,4]}]:[])].map(entry=>({
  name:entry.name,result:entry.result,color:entry.color,dash:entry.dash||[],
  values:entry.result.frames.map(f=>[relative?100*f.time/entry.result.total:f.time/3600,metricValue(entry.result,f,metric,location,options)])
 }));
}
export function projectParameters(data){
 if(!data||![1,2].includes(data.schema))throw Error('Unbekanntes Projektformat.');
 validate(data.parameters);
 const comparisons=data.schema===2?data.comparisons||[]:[];
 if(!Array.isArray(comparisons)||comparisons.length>4)throw Error('Höchstens vier Vergleichsprozesse.');
 return {parameters:structuredClone(data.parameters),comparisons:comparisons.map((e,i)=>{
  if(!e||typeof e!=='object')throw Error('Ungültiger Vergleichsprozess.');
  validate(e.parameters);return {name:typeof e.name==='string'?e.name.slice(0,60):'Vergleich '+(i+1),parameters:structuredClone(e.parameters)};
 })};
}
