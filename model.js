import {mesh,rectangleMesh,heatStep,heatStep2D} from './thermal.js';
import {MATERIAL,KEYS,blankState,advance,index,validate,VERSION} from './materials.js';
export function run(p,{n=12}={}){
 const total=validate(p);if(!Number.isInteger(n)||n<4||n>40)throw Error('Netz: 4 bis 40 Zellen.');
 const nx=n,ny=p.shape==='plate'?n:1,grid=ny>1?rectangleMesh(p.size,p.height,n,n):mesh(p.size,'rod',n).map((g,ix)=>({...g,ix,iy:0,y:0}));
 let temps=grid.map(()=>20),states=grid.map(()=>blankState(p.initial)),time=0,bath=20;
 const frames=[],weights=grid.map(g=>g.volume),volume=weights.reduce((a,b)=>a+b,0);
 const mean=values=>values.reduce((sum,v,i)=>sum+v*weights[i],0)/volume;
 function save(label,stageIndex){const avg=Object.fromEntries(KEYS.map(k=>[k,mean(states.map(s=>s[k]))]));frames.push({time,bath,label,stageIndex,temps:[...temps],states:states.map(s=>({...s})),mean:avg,meanT:mean(temps),meanIndex:mean(states.map(index))});}
 save('Ausgangszustand',-1);
 for(const [stageIndex,stage] of p.stages.entries()){
  const startBath=bath;let elapsed=0,nextSave=0;
  while(elapsed<stage.duration-1e-8){
   const difference=Math.max(...temps.map(T=>Math.abs(T-bath)));
   const fast=stage.target<startBath&&stage.h>300;
   const dt=Math.min(stage.duration-elapsed,fast&&difference>2? .5:difference>5?5:stage.mode==='ramp'?10:120);
   elapsed+=dt;time+=dt;bath=stage.mode==='step'?stage.target:startBath+(stage.target-startBath)*elapsed/stage.duration;
   temps=ny>1?heatStep2D(temps,grid,MATERIAL,bath,stage.h,dt,n,n):heatStep(temps,grid,MATERIAL,bath,stage.h,dt);
   for(let i=0;i<states.length;i++)advance(states[i],temps[i],dt);
   if(elapsed>=nextSave||elapsed>=stage.duration-1e-8){save(stage.label,stageIndex);nextSave=elapsed+Math.max(fast?2:60,stage.duration/70);}
  }
 }
 return {version:VERSION,parameters:p,nx,ny,grid,frames,total,material:MATERIAL};
}
export function probeIndex(result,x=.5,y=.5){const ix=Math.round(Math.max(0,Math.min(1,x))*(result.nx-1)),iy=Math.round(Math.max(0,Math.min(1,y))*(result.ny-1));return iy*result.nx+ix;}
