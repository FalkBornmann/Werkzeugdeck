import {boundaryFromSeries} from './boundary.js';
const eps=1e-6;
const amount=(s,raw,basis)=>s.phases?.filter(p=>p.raw===raw).reduce((n,p)=>n+(basis==='mass'?p.mass:p.fraction),0)||0;
export function solidificationHistory(state){
 const series=state.profiles[state.selected],stages=[];
 const solids=s=>s.phases?.filter(p=>p.raw!=='LIQUID')||[];
 let peritectic=null;
 for(let i=series.length-1;i>=0;i--){
  const s=series[i];if(!s.phases)continue;
  const above=series[i+1],ss=solids(s),newPhases=above?ss.filter(p=>!solids(above).some(q=>q.raw===p.raw)):[];
  const consumed=above&&s.liquid<(above.liquid||0)-eps?solids(above).filter(p=>amount(s,p.raw)<p.fraction-1e-4):[];
  if(newPhases.length&&consumed.length)peritectic={t:[s.temperature,above.temperature],core:consumed[0].raw,product:newPhases[0].raw};
  let kind=s.liquid>1-eps?'Schmelze':s.liquid>eps?(ss.length===1?'Primärerstarrung':ss.length===2?'Gemeinsames Wachstum':'Mehrphasenreaktion'):'Festes Gefüge';
  if(newPhases.length&&consumed.length)kind='Peritektische / Übergangsreaktion';
  const last=stages.at(-1);
  if(last?.signature===s.signature&&last.kind===kind)last.low=s.temperature;
  else stages.push({high:s.temperature,low:s.temperature,signature:s.signature,kind});
 }
 const j=series.findIndex(s=>s.liquid>eps),below=series[j-1],above=series[j];
 let constituent=null;
 if(j>0&&below.phases&&solids(below).length>=2){
  const initial=solids(above),consumed=initial.some(p=>amount(below,p.raw)<p.fraction-1e-4);
  const root=boundaryFromSeries(series,'solidus')[0];
  const added=solids(below).some(p=>!initial.some(q=>q.raw===p.raw));
  if(!consumed&&added&&root){
   let eutectic=amount(above,'LIQUID',state.basis),next=series[j+1];
   if(next)eutectic+=(root.temperature-above.temperature)*(amount(next,'LIQUID',state.basis)-eutectic)/(next.temperature-above.temperature);
   eutectic=Math.max(0,Math.min(1,eutectic));
   constituent={eutectic,primary:1-eutectic,primaryName:initial.length===1?initial[0].name:null,precursorNames:initial.map(p=>p.name),bracket:root.bracket,terminalNames:solids(below).map(p=>p.name)};
  }
 }
 const first=series.slice().reverse().find(s=>s.liquid>eps&&s.liquid<1-eps);
 const retainedCore=peritectic&&state.current.phases.some(p=>p.raw===peritectic.core);
 const retainedProduct=peritectic&&state.current.phases.some(p=>p.raw===peritectic.product);
 return {stages,firstPrimary:solids(first||{}).map(p=>p.name),constituent,peritectic:retainedCore&&retainedProduct?peritectic:null};
}

