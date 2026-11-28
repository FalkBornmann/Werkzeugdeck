import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{solve,profile,nearest,toMass,toMoles,thresholds}from'../equilibrium.js';
import{displayedSolidus,displayedBinaryLiquidus}from'../solidus-display.js';
import{boundaryFromSeries}from'../boundary.js';import{diagramSetup,diagramLiquidus,solveDiagram}from'../diagram-model.js';import{reactionReferences}from'../reaction-data.js';
const read=f=>JSON.parse(gunzipSync(readFileSync(new URL('../'+f,import.meta.url))));
const refs=JSON.parse(readFileSync(new URL('./reference-materials.json',import.meta.url)));
for(const data of refs)test(data.system+' agrees with direct independent phase and boundary calculations',()=>{
 const m=read(data.system+'-hulls.json.gz');m.system=data.system;m.solidusDisplay=read(data.system+'-solidus.json.gz');let maxPhase=0,maxS=0,maxL=0;
 for(const r of data.cases){
  const s=solve(m,r.x,nearest(m.T,r.t));assert.ok(s);
  assert.ok(Math.abs(s.phases.reduce((a,p)=>a+p.fraction,0)-1)<1e-8);
  assert.ok(Math.abs(s.phases.reduce((a,p)=>a+p.mass,0)-1)<1e-8);
  for(let i=0;i<2;i++)assert.ok(Math.abs(s.phases.reduce((a,p)=>a+p.fraction*p.x[i],0)-r.x[i])<1e-7);
  for(const raw of new Set([...Object.keys(r.amounts),...s.phases.map(p=>p.raw)])){
   const actual=s.phases.filter(p=>p.raw===raw).reduce((a,p)=>a+p.fraction,0);maxPhase=Math.max(maxPhase,Math.abs(actual-(r.amounts[raw]||0)));
  }
 }
 for(const r of data.boundaries){
  const p=profile(m,r.x),s=displayedSolidus(m,r.x,boundaryFromSeries(p,'solidus')[0],p),l=displayedBinaryLiquidus(m,r.x);
  maxS=Math.max(maxS,Math.abs(s-r.solidus));maxL=Math.max(maxL,Math.abs(l-r.liquidus));
  assert.ok(s<=l+.01);
 }
 console.log(data.system,{maxPhasePercentagePoints:maxPhase*100,maxSolidusK:maxS,maxLiquidusK:maxL});
 assert.ok(maxPhase<.015);assert.ok(maxS<5);assert.ok(maxL<5);
 for(const x of [[1,0],[0,1]]){const roots=thresholds(profile(m,x));assert.deepEqual(roots.solidus,roots.liquidus);assert.ok(roots.liquidus)}
 if(data.system==='cuni')assert.equal(reactionReferences(m).length,0);
 if(data.system==='alcu'){assert.ok(!m.phases.includes('AL2CU_PRIME'));assert.ok(m.phases.includes('AL2CU_C16'))}
});
const d=read('nakmg-diagram.json.gz'),m=diagramSetup(d);
test('Mg-chloride reconstruction preserves source anchors and independent DSC comparison records',()=>{
 assert.equal(m.system,'nakmg');assert.ok(d.controls.length>2000);assert.equal(d.specialPoints.filter(p=>p.name.startsWith('DSC ')).length,5);
 for(const r of d.references)assert.ok(Math.abs(diagramLiquidus(m,r.x)-r.t)<.001);
 assert.ok(Math.abs(diagramLiquidus(m,[1,0,0])-800.7)<.001);assert.equal(diagramLiquidus(m,[0,0,1]),714);
 assert.ok(d.reactionSegments&&Object.keys(d.reactionSegments).length===4);
 for(let i=0;i<=100;i++)assert.ok(diagramLiquidus(m,[i/100,1-i/100,0])>=656.3);
 assert.ok(d.note.includes('DSC'));assert.ok(d.note.includes('Fehlergrenze'));
});
test('Mg-chloride geometry conserves mole/mass balance and retains monotonic melting throughout the triangle',()=>{
 for(let a=0;a<8;a++)for(let b=0;b<8-a;b++){
  const x=[(a+.37)/8,(b+.21)/8,1-(a+b+.58)/8];let previous=0;
  const roundTrip=toMoles(toMass(x,m.masses),m.masses);assert.ok(x.every((v,i)=>Math.abs(v-roundTrip[i])<1e-12));
  for(const t of [350,370,385,390,400,420,450,500,550,600,700,800,850]){
   const s=solveDiagram(m,x,nearest(m.T,t));assert.ok(!s.unavailable);
   assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.fraction,0)-1)<1e-7);
   assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.mass,0)-1)<1e-7);
   for(let i=0;i<3;i++)assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.fraction*p.x[i],0)-x[i])<1e-6);
   assert.ok(!/AlCl|NaAl|KAl/.test(s.signature));
   assert.ok(s.liquid>=previous-1e-5);previous=s.liquid;
  }
 }
});
