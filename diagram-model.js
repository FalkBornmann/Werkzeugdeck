// A geometric overview model. The maximum feasible liquid share is an explicit assumption,
// not a minimization of thermodynamic Gibbs energy.
const caches=new WeakMap(),EPS=1e-8;
const skeleton=[[1,0,0],[0,1,0],[.5,0,.5],[0,.5,.5],[0,0,1]];
const names=['NaCl-reich','KCl-reich','NaAlCl₄','KAlCl₄','AlCl₃'];
const regions=[[0,1,3],[0,2,3],[4,2,3]];
function weights(vertices,x){
 const [a,b,c]=vertices,d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
 const u=((b[1]-c[1])*(x[0]-c[0])+(c[0]-b[0])*(x[1]-c[1]))/d;
 const v=((c[1]-a[1])*(x[0]-c[0])+(a[0]-c[0])*(x[1]-c[1]))/d;
 return [u,v,1-u-v];
}
function setup(model){
 if(caches.has(model))return caches.get(model);
 const surface=model.diagram,bins=Array.from({length:576},()=>[]);
 for(const face of surface.triangles){
  const ns=face.map(i=>surface.nodes[i]);if(ns.some(n=>n.value===null))continue;
  const lo=[0,1].map(k=>Math.max(0,Math.floor(Math.min(...ns.map(n=>n.x[k]))*24)));
  const hi=[0,1].map(k=>Math.min(23,Math.floor(Math.max(...ns.map(n=>n.x[k]))*24)));
  for(let a=lo[0];a<=hi[0];a++)for(let b=lo[1];b<=hi[1];b++)bins[b*24+a].push(ns);
 }
 const state={bins,frames:new Map(),samples:new Map()};caches.set(model,state);return state;
}
export function diagramLiquidus(model,x){
 if(x[2]>model.diagram.maxAl+1e-8)return null;
 const {bins}=setup(model),ns=bins[Math.min(23,Math.floor(x[1]*24))*24+Math.min(23,Math.floor(x[0]*24))]||[];
 for(const nodes of ns){const w=weights(nodes.map(n=>n.x),x);if(Math.min(...w)>=-1e-8)return w.reduce((s,v,i)=>s+v*nodes[i].value,0)}
 return null;
}
function solidGap(t){
 const T=t+273.15,points=[],hull=[];
 for(let i=0;i<=500;i++){
  const x=i/500,y=1-x;
  const g=8.3144626*T*((x?x*Math.log(x):0)+(y?y*Math.log(y):0))+x*y*(14333+3278*x+32.796*T-5.598*T*Math.log(T));
  points.push([x,g]);
 }
 for(const p of points){
  while(hull.length>1){const a=hull.at(-2),b=hull.at(-1);if((b[0]-a[0])*(p[1]-b[1])-(b[1]-a[1])*(p[0]-b[0])>0)break;hull.pop()}
  hull.push(p);
 }
 let gap=[0,0];for(let i=1;i<hull.length;i++)if(hull[i][0]-hull[i-1][0]>gap[1]-gap[0])gap=[hull[i-1][0],hull[i][0]];
 return gap[1]-gap[0]>.01?gap:null;
}
function frame(model,ti){
 const cache=setup(model);if(cache.frames.has(ti))return cache.frames.get(ti);
 const t=model.T[ti],segments=regions.map(()=>[]);
 for(const face of model.diagram.triangles){
  const nodes=face.map(i=>model.diagram.nodes[i]);if(nodes.some(n=>n.value===null))continue;
  const points=[];
  for(let k=0;k<3;k++){const a=nodes[k],b=nodes[(k+1)%3];if((a.value<t)===(b.value<t))continue;const f=(t-a.value)/(b.value-a.value);points.push(a.x.map((v,j)=>v+f*(b.x[j]-v)))}
  if(points.length!==2)continue;
  regions.forEach((ids,r)=>{
   const va=weights(ids.map(i=>skeleton[i]),points[0]),vb=weights(ids.map(i=>skeleton[i]),points[1]);
   let lo=0,hi=1;
   for(let k=0;k<3;k++){const d=vb[k]-va[k];if(Math.abs(d)<1e-12){if(va[k]<-EPS)return}else if(d>0)lo=Math.max(lo,(-EPS-va[k])/d);else hi=Math.min(hi,(-EPS-va[k])/d)}
   if(lo>hi||lo>1||hi<0)return;
   lo=Math.max(0,lo);hi=Math.min(1,hi);
   const a=va.map((v,k)=>Math.max(0,v+lo*(vb[k]-v))),b=va.map((v,k)=>Math.max(0,v+hi*(vb[k]-v)));
   segments[r].push([a,b]);
  });
 }
 const out={segments,gap:solidGap(t)};cache.frames.set(ti,out);return out;
}
export function diagramSetup(diagram){
 const temps=new Set();for(let t=40;t<=850;t+=5)temps.add(t);
 for(const t of [91.4,108.7,130.1,132.1,133.2,156.7,241.47,257.3])for(const d of [-.02,0,.02])temps.add(Number((t+d).toFixed(2)));
 return {system:'salt',diagramModel:true,components:diagram.components,masses:diagram.masses,T:[...temps].sort((a,b)=>a-b),pressure:100000,diagram,phases:['LIQUID','ALKALI','NaAlCl₄','KAlCl₄','AlCl₃']};
}
export function solveDiagram(model,x,ti){
 const t=model.T[ti],key=ti+':'+x.map(v=>v.toFixed(8)).join(','),cache=setup(model);
 if(cache.samples.has(key))return cache.samples.get(key);
 const TL=diagramLiquidus(model,x);
 if(TL===null)return {phases:[],liquid:null,enthalpy:NaN,signature:'Nicht durch Projektion abgedeckt',unavailable:true};
 let list=[],fraction=0,liquidX=x;
 if(t>=TL-1e-7){list=[{raw:'LIQUID',name:'L',fraction:1,x:x.slice()}];fraction=1}
 else{
  const f=frame(model,ti),possibilities=[];
  regions.forEach((ids,r)=>{
   const bulk=weights(ids.map(i=>skeleton[i]),x);if(Math.min(...bulk)<-EPS)return;
   let best=0,solution=null;
   for(const [a,b] of f.segments[r]){
    const positions=[0,1];
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
     const d=bulk[i]*(b[j]-a[j])-bulk[j]*(b[i]-a[i]);
     if(Math.abs(d)>1e-12){const u=(bulk[j]*a[i]-bulk[i]*a[j])/d;if(u>0&&u<1)positions.push(u)}
    }
    for(const u of positions){
     const l=a.map((v,i)=>v+u*(b[i]-v)),share=Math.max(0,Math.min(1,...l.map((v,i)=>v>1e-7?Math.max(0,bulk[i])/v:1)));
     if(share>best){best=share;solution=l}
    }
   }
   const liq=solution?ids.map(i=>skeleton[i]).reduce((v,p,i)=>v.map((q,k)=>q+p[k]*solution[i]),[0,0,0]):x;
   const phases=ids.map((id,i)=>({raw:names[id],name:names[id],fraction:Math.max(0,bulk[i]-best*(solution?.[i]||0)),x:skeleton[id]}));
   if(best>EPS)phases.push({raw:'LIQUID',name:'L',fraction:best,x:liq});
   possibilities.push({best,phases,liq});
  });
  const best=possibilities.sort((a,b)=>b.best-a.best)[0];
  if(!best)return {phases:[],liquid:null,enthalpy:NaN,signature:'Nicht konstruierbar',unavailable:true};
  list=best.phases;fraction=best.best;liquidX=best.liq;
  const salts=list.filter(p=>p.raw==='NaCl-reich'||p.raw==='KCl-reich'),total=salts.reduce((s,p)=>s+p.fraction,0);
  if(total>EPS){
   const ratio=salts.reduce((s,p)=>s+p.fraction*p.x[0],0)/total;
   list=list.filter(p=>!salts.includes(p));
   if(f.gap&&ratio>f.gap[0]+EPS&&ratio<f.gap[1]-EPS){
    const share=(ratio-f.gap[0])/(f.gap[1]-f.gap[0]);
    list.push({raw:'ALKALI',name:'NaCl-reicher MK',fraction:total*share,x:[f.gap[1],1-f.gap[1],0]},
     {raw:'ALKALI',name:'KCl-reicher MK',fraction:total*(1-share),x:[f.gap[0],1-f.gap[0],0]});
   }else list.push({raw:'ALKALI',name:'NaCl–KCl-MK',fraction:total,x:[ratio,1-ratio,0]});
  }
 }
 list=list.filter(p=>p.fraction>EPS);
 const sum=list.reduce((s,p)=>s+p.fraction,0);list.forEach(p=>p.fraction/=sum);
 const totalMass=list.reduce((s,p)=>s+p.fraction*p.x.reduce((q,v,i)=>q+v*model.masses[i],0),0);
 list.forEach(p=>{p.liquid=p.raw==='LIQUID';p.mass=p.fraction*p.x.reduce((s,v,i)=>s+v*model.masses[i],0)/totalMass});
 const visibleAlkali=list.filter(p=>p.raw==='ALKALI'&&p.fraction>.003);
 if(visibleAlkali.length===1)visibleAlkali[0].name='NaCl–KCl-MK';
 const result={phases:list,liquid:fraction,enthalpy:1000*((t-model.T[0])/(model.T.at(-1)-model.T[0])+.6*fraction),signature:list.filter(p=>p.fraction>.003).map(p=>p.name).sort().join(' + '),diagramModel:true};
 if(cache.samples.size>80000)cache.samples.clear();cache.samples.set(key,result);return result;
}