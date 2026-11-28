import { boundaryFromSeries } from './boundary.js';
export function eutecticConstituents(state){
 if(!state.binary||state.current.liquid>1e-7)return null;
 const series=state.profiles[state.selected],j=series.findIndex(s=>s.liquid>1e-7);
 if(j<=0)return null;
 const below=series[j-1],above=series[j],solids=below.phases?.filter(p=>p.raw!=='LIQUID')||[];
 if(solids.length!==2)return null;
 const initial=above.phases.filter(p=>p.raw!=='LIQUID');
 if(initial.length>1)return null;
 // A disappearing or consumed primary phase indicates a peritectic, not an eutectic.
 if(initial.some(p=>(below.phases.find(q=>q.raw===p.raw)?.fraction||0)<p.fraction-1e-4))return null;
 const root=boundaryFromSeries(series,'solidus')[0];if(!root)return null;
 const measure=s=>s.phases.filter(p=>p.raw==='LIQUID').reduce((sum,p)=>sum+(state.basis==='mass'?p.mass:p.fraction),0);
 let eutectic=measure(above);
 const next=series[j+1];
 if(next)eutectic+=(root.temperature-above.temperature)*(measure(next)-eutectic)/(next.temperature-above.temperature);
 eutectic=Math.max(0,Math.min(1,eutectic));
 return {primary:1-eutectic,eutectic,primaryName:initial[0]?.name||solids[0].name,bracket:root.bracket};
}
