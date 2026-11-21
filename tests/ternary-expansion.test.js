import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{solve,profile,nearest,toMass,toMoles,thresholds}from'../equilibrium.js';import{displayedSolidus}from'../solidus-display.js';import{surfaceTemperature,boundaryFromSeries}from'../boundary.js';import{systems,filterSystems}from'../systems.js';import{reactionReferences}from'../reaction-data.js';
const read=f=>JSON.parse(gunzipSync(readFileSync(new URL('../'+f,import.meta.url))));
const refs=JSON.parse(readFileSync(new URL('./reference-ternary-expansion.json',import.meta.url)));
for(const r of refs)test(r.system+' ternary phase balance and independent boundary holdouts',()=>{
 const index=JSON.parse(readFileSync(new URL('../'+r.system+'-hulls-index.json',import.meta.url))),m={...index.model,frames:index.parts.flatMap(p=>read(p).frames),system:r.system,solidusDisplay:read(r.system+'-solidus.json.gz')};
 const atlas=read(r.system+'-liquidus.json.gz'),surface={n:atlas.n,nodes:atlas.nodes.map(p=>({value:p[0]}))};let maxPhase=0,maxS=0,maxL=0;
 for(const q of r.cases){const s=solve(m,q.x,nearest(m.T,q.t));assert.ok(s);
  assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.fraction,0)-1)<1e-8);assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.mass,0)-1)<1e-8);
  q.x.forEach((v,i)=>assert.ok(Math.abs(s.phases.reduce((a,p)=>a+p.fraction*p.x[i],0)-v)<1e-7));
  for(const phase of new Set([...Object.keys(q.amounts),...s.phases.map(p=>p.raw)]))maxPhase=Math.max(maxPhase,Math.abs(s.phases.filter(p=>p.raw===phase).reduce((a,p)=>a+p.fraction,0)-(q.amounts[phase]||0)));
 }
 for(const q of r.boundaries){const p=profile(m,q.x),s=displayedSolidus(m,q.x,boundaryFromSeries(p,'solidus')[0],p),l=surfaceTemperature(surface,q.x);
  maxS=Math.max(maxS,Math.abs(s-q.solidus));maxL=Math.max(maxL,Math.abs(l-q.liquidus));assert.ok(s<=l+1);
 }
 console.log(r.system,{maxPhasePercentagePoints:maxPhase*100,maxSolidusK:maxS,maxLiquidusK:maxL});assert.ok(maxPhase<.05);assert.ok(maxS<7);assert.ok(maxL<5);
 for(let i=0;i<3;i++){const x=[0,0,0];x[i]=1;const p=profile(m,x),limits=thresholds(p);assert.ok(limits.solidus);assert.deepEqual(limits.solidus,limits.liquidus);assert.equal(p.at(-1).liquid,1)}
 assert.ok(!m.activePhases.includes('GAS'));assert.ok(!m.activePhases.includes('ALCU_PRIME'));
 for(const part of index.parts)assert.ok(readFileSync(new URL('../'+part,import.meta.url)).length<25*1024*1024);
 const x=[.17,.29,.54],round=toMoles(toMass(x,m.masses),m.masses);assert.ok(x.every((v,i)=>Math.abs(v-round[i])<1e-12));
 if(r.system==='almgsi')assert.ok(m.phases.includes('MG2SI'));
 if(r.system==='alcumg')assert.ok(m.phases.includes('SPHASE'));
 if(r.system==='agpbsn')assert.ok(reactionReferences(m).some(r=>r.kind==='E'&&r.t===177.3));
});
test('new ternary library exposes technical examples and no future duplicates',()=>{
 assert.equal(systems.length,19);assert.equal(systems.filter(s=>s.kind==='ternary').length,10);
 assert.deepEqual(filterSystems({query:'Magnesium',kind:'ternary'}).map(s=>s.id).sort(),['alcumg','almgsi']);
 assert.equal(systems.find(s=>s.id==='almgsi').specialPoints[0].name,'Mg₂Si · Verbindung');
 assert.ok(systems.find(s=>s.id==='alcusi').status.includes('extrapoliert'));
});


test('dilute Ag-Pb-Sn numerical traces preserve balance without a false early melting field',()=>{
 const index=JSON.parse(readFileSync(new URL('../agpbsn-hulls-index.json',import.meta.url))),m={...index.model,frames:index.parts.flatMap(p=>read(p).frames),solidusDisplay:read('agpbsn-solidus.json.gz')};
 const x=[.985,.009,.006],s=solve(m,x,nearest(m.T,312)),p=profile(m,x),root=boundaryFromSeries(p,'solidus')[0];
 assert.ok(!s.signature.split(' + ').includes('L'));assert.ok(root.temperature>800);
 assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.fraction,0)-1)<1e-9);
 x.forEach((v,i)=>assert.ok(Math.abs(s.phases.reduce((a,p)=>a+p.fraction*p.x[i],0)-v)<1e-8));
 const t=displayedSolidus(m,x,root,p);assert.ok(t>860&&t<867);
});
