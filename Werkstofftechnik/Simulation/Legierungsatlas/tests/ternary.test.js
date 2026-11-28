import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {solve,profile,nearest,toMoles,thresholds} from '../equilibrium.js';
import {boundaryFromSeries,residualPath} from '../boundary.js';
const load=k=>JSON.parse(gunzipSync(readFileSync(new URL('../'+k+'-hulls.json.gz',import.meta.url))));
const models={sac:load('sac'),pbsnbi:load('pbsnbi')};
const refs=JSON.parse(readFileSync(new URL('reference-v3.json',import.meta.url)));
test('ternary phases agree with 26 direct Gibbs equilibrium reference states',()=>{
 let maximum=0;
 for(const ref of refs){
  const model=models[ref.system],ti=nearest(model.T,ref.t);
  assert.equal(model.T[ti],ref.t);
  const s=solve(model,ref.x,ti);assert.ok(s);
  for(const raw of new Set([...s.phases.map(p=>p.raw),...Object.keys(ref.amounts)])){
   const actual=s.phases.filter(p=>p.raw===raw).reduce((a,p)=>a+p.fraction,0);
   const error=Math.abs(actual-(ref.amounts[raw]||0));maximum=Math.max(maximum,error);
   assert.ok(error<.015,JSON.stringify({system:ref.system,x:ref.x,t:ref.t,raw,actual,reference:ref.amounts[raw]||0,error}));
  }
 }
 console.log('Maximum absolute phase-fraction deviation from direct equilibrium: '+(100*maximum).toFixed(3)+' percentage points.');
});
test('homogeneous Ag-Cu-Sn liquid remains one phase while solid Ag/Cu demixing survives',()=>{
 const model=models.sac,x=[.5,.48,.02];
 for(const t of [900,1000,1030,1100]){
  const s=solve(model,x,nearest(model.T,t));assert.equal(s.signature,'L');assert.equal(s.phases.length,1);
 }
 const solids=solve(model,x,nearest(model.T,100));
 assert.equal(solids.phases.filter(p=>p.raw==='FCC_A1').length,2);
});
test('simpler ternary has all pure endpoints and reproduces NIST invariant temperature range',()=>{
 const model=models.pbsnbi;
 for(const [x,t] of [[[1,0,0],271.4],[[0,1,0],327.5],[[0,0,1],231.93]]){
  const limits=thresholds(profile(model,x));
  assert.deepEqual(limits.liquidus,limits.solidus);assert.ok(limits.liquidus[0]<=t&&limits.liquidus[1]>=t);
 }
 const x=toMoles([.5159,.3259,.1582],model.masses),limit=thresholds(profile(model,x)).solidus;
 assert.ok(limit[0]>=94&&limit[1]<=102,JSON.stringify(limit));
});
test('liquidus roots and residual-liquid endpoints are bounded and keep absent components absent',()=>{
 for(const model of Object.values(models))for(const x of [[.2,.4,.4],[.5,.48,.02],[.5,0,.5]]){
  const series=profile(model,x);
  for(const root of boundaryFromSeries(series))assert.ok(root.temperature>=root.bracket[0]&&root.temperature<=root.bracket[1]);
  const path=residualPath(series);
  for(const point of path){
   assert.ok(point.phase.x.every(v=>v>=-1e-7&&v<=1+1e-7));
   assert.ok(Math.abs(point.phase.x.reduce((a,b)=>a+b,0)-1)<1e-6);
   if(x[1]===0)assert.ok(point.phase.x[1]<1e-6);
  }
 }
});


test('liquidus estimates use total solid fraction even if a solution changes its display name',()=>{
 const series=[
  {temperature:80,liquid:.6,phases:[{name:'L',fraction:.6},{name:'α (Ag)',fraction:.4}]},
  {temperature:90,liquid:.8,phases:[{name:'L',fraction:.8},{name:'α',fraction:.2}]},
  {temperature:100,liquid:1,phases:[{name:'L',fraction:1}]},
  {temperature:110,liquid:1,phases:[{name:'L',fraction:1}]}
 ];
 assert.ok(Math.abs(boundaryFromSeries(series)[0].temperature-100)<1e-8);
});
