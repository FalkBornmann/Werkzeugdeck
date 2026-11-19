import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {toMass,toMoles,solve,profile,thresholds,interpolate} from '../equilibrium.js';
const load=key=>JSON.parse(gunzipSync(readFileSync(new URL('../'+key+'-hulls.json.gz',import.meta.url))));
const binary=load('bisn'),copper=load('cusn'),ternary=load('sac');
test('basis conversion preserves composition, including pure endpoints',()=>{
 for(const x of [[1,0,0],[0,1,0],[0,0,1],[.02,.013,.967]]) {
  const result=toMoles(toMass(x,ternary.masses),ternary.masses);
  result.forEach((v,i)=>assert.ok(Math.abs(v-x[i])<1e-12));
 }
});
test('both binary pure endpoints have solidus equal to liquidus',()=>{
 for(const model of [binary,copper])for(const x of [[1,0],[0,1]]){
  const p=thresholds(profile(model,x));assert.deepEqual(p.solidus,p.liquidus);
  assert.ok(p.solidus[1]>200);
 }
});
test('Sn, Bi and Cu melting intervals bracket reference temperatures',()=>{
 for(const [model,x,t] of [[binary,[1,0],231.93],[binary,[0,1],271.4],[copper,[0,1],1084.87]]){
  const p=thresholds(profile(model,x)).liquidus;
  assert.ok(p[0]<=t&&p[1]>=t,JSON.stringify(p));
 }
});
test('free ternary compositions satisfy component and mass balances',()=>{
 for(let i=0;i<30;i++){
  const x= i%3===0?interpolate([0,0,1],[.23,.61,.16],i/30):[.01+i*.015,.02+i*.004,.97-i*.019];
  const ti=Math.floor((i+.5)*ternary.T.length/30),s=solve(ternary,x,ti);
  assert.ok(s,'missing equilibrium at '+x);
  assert.ok(Math.abs(s.phases.reduce((a,p)=>a+p.fraction,0)-1)<1e-7);
  assert.ok(Math.abs(s.phases.reduce((a,p)=>a+p.mass,0)-1)<1e-7);
  for(let j=0;j<3;j++)assert.ok(Math.abs(s.phases.reduce((a,p)=>a+p.fraction*p.x[j],0)-x[j])<1e-7);
 }
});
test('a free section includes exactly both endpoints',()=>{
 const a=[.1,.4,.5],b=[.8,.05,.15];
 assert.deepEqual(interpolate(a,b,0),a);assert.deepEqual(interpolate(a,b,1),b);
});
test('eutectic mixtures retain two solid phases below melting',()=>{
 const x=toMoles([.4303,.5697],binary.masses);
 const s=solve(binary,x,binary.T.indexOf(120));
 assert.equal(s.phases.length,2);assert.equal(s.liquid,0);
 const boundary=thresholds(profile(binary,x)).solidus;
 assert.ok(boundary[0]>=136&&boundary[1]<=142);
});
test('reinstoff ternary vertices are queryable without excluding 0 or 100 percent',()=>{
 for(const x of [[1,0,0],[0,1,0],[0,0,1]])for(const ti of [0,50,118]){
  assert.ok(solve(ternary,x,ti));
 }
});

test('sampled hull agrees with independent pycalphad reference states',()=>{
 const cases=[
  {x:[.04,.015,.945],t:220,amounts:{LIQUID:1}},
  {x:[.2,.4,.4],t:400,amounts:{EPSILON:.1078877912,CU3SN:.4603471236,LIQUID:.4317650853}},
  {x:[.7,.2,.1],t:800,amounts:{LIQUID:1}},
  {x:[.04,.01,.95],t:230,amounts:{LIQUID:1}}
 ];
 for(const c of cases){
  const ti=ternary.T.indexOf(c.t);assert.ok(ti>=0);
  const s=solve(ternary,c.x,ti);
  for(const [phase,f] of Object.entries(c.amounts)){
   const actual=s.phases.filter(p=>p.raw===phase).reduce((sum,p)=>sum+p.fraction,0);
   assert.ok(Math.abs(actual-f)<.007,phase+' '+actual+' vs '+f);
  }
 }
});

