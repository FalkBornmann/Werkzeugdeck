import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {solve,profile,nearest,toMoles,thresholds} from '../equilibrium.js';
import {reactionReferences} from '../reaction-data.js';
import {systems,filterSystems,futureSystems} from '../systems.js';
import {surfaceTemperature,boundaryFromSeries} from '../boundary.js';
import {displayedSolidus} from '../solidus-display.js';
const keys=['agcu','agsn','pbsn','bipb','agbisn','bicusn'];
const load=file=>JSON.parse(gunzipSync(readFileSync(new URL('../'+file,import.meta.url))));
const models=Object.fromEntries(keys.map(k=>{
 const config=systems.find(s=>s.id===k);let m;
 if(config.hullIndex){const index=JSON.parse(readFileSync(new URL('../'+config.hullIndex,import.meta.url)));m={...index.model,frames:index.parts.flatMap(p=>load(p).frames)}}
 else m=load(k+'-hulls.json.gz');m.system=k;m.solidusDisplay=load(k+'-solidus.json.gz');return[k,m]}));
const refs=JSON.parse(readFileSync(new URL('./reference-additions.json',import.meta.url)));
test('six additions agree with independently solved Gibbs equilibrium and conserve every component',()=>{
 let max=0,worst;
 for(const r of refs){
  const m=models[r.system],s=solve(m,r.x,nearest(m.T,r.t));assert.ok(s);
  assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.fraction,0)-1)<1e-8);
  assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.mass,0)-1)<1e-8);
  r.x.forEach((x,i)=>assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.fraction*p.x[i],0)-x)<1e-7));
  for(const name of new Set([...Object.keys(r.amounts),...s.phases.map(p=>p.raw)])){
   const actual=s.phases.filter(p=>p.raw===name).reduce((v,p)=>v+p.fraction,0),error=Math.abs(actual-(r.amounts[name]||0));
   if(error>max){max=error;worst={...r,name,actual,error}}
  }
 }
 console.log('Expanded library: max phase deviation / percentage points',max*100,JSON.stringify(worst));
 assert.ok(max<.02,'phase fractions differ by more than 2 percentage points');
});
for(const key of keys)test(key+' includes pure endpoints, finite states and matching reaction targets',()=>{
 const m=models[key];
 for(let c=0;c<m.components.length;c++){
  const x=m.components.map((_,i)=>i===c?1:0),p=profile(m,x),limits=thresholds(p);
  assert.deepEqual(limits.solidus,limits.liquidus);assert.ok(limits.liquidus);
  assert.ok(p.at(-1).liquid>.999999);assert.ok(p[0].liquid<1e-7);
 }
 for(const r of reactionReferences(m)){
  assert.equal(r.x.length,m.components.length);
  assert.ok(Math.abs(r.x.reduce((a,b)=>a+b,0)-1)<1e-9);
  assert.ok(r.t>m.T[0]&&r.t<m.T.at(-1));
 }
 assert.ok(!reactionReferences(m).some(r=>r.reaction.includes('Cu'))||m.components.includes('CU'));
 const samples=JSON.parse(readFileSync(new URL('./solidus-reference-'+key+'.json',import.meta.url)));
 const checked=samples.map(r=>{const p=profile(m,r.x),root=boundaryFromSeries(p,'solidus')[0],t=displayedSolidus(m,r.x,root,p);return{t,error:Math.abs(t-r.direct)}});
 assert.equal(samples.length,24);assert.ok(checked.every(r=>Number.isFinite(r.t)&&r.error<7));
 console.log(key+' solidus hold-out max / K',Math.max(...checked.map(r=>r.error)));
});
for(const key of ['agbisn','bicusn'])test(key+' smooth liquidus agrees with independent equilibrium holdouts',()=>{
 const a=load(key+'-liquidus.json.gz'),surface={n:a.n,nodes:a.nodes.map(p=>({value:p[0]}))};
 const points=JSON.parse(readFileSync(new URL('./liquidus-reference-'+key+'.json',import.meta.url)));
 const max=Math.max(...points.map(r=>Math.abs(surfaceTemperature(surface,r.x)-r.direct)));
 console.log(key+' liquidus hold-out max / K',max);assert.ok(max<4);assert.ok(a.sampleCount>2000);
 assert.ok(a.nodes.every(p=>p[0]>=models[key].T[0]&&p[0]<=models[key].T.at(-1)));
});
test('new binary eutectic onset matches its published reference within 3 K',()=>{
 for(const key of ['agcu','agsn','pbsn','bipb']){
  const m=models[key],r=reactionReferences(m).find(r=>r.kind==='E'),p=profile(m,r.x),root=boundaryFromSeries(p,'solidus')[0];
  assert.ok(Math.abs(displayedSolidus(m,r.x,root,p)-r.t)<3,key);
 }
});
test('library filters search technical uses and keep future systems out of the calculator',()=>{
 assert.equal(systems.length,19);assert.equal(systems.filter(s=>s.kind==='binary').length,9);
 assert.ok(filterSystems({query:'Hartlot'}).some(s=>s.id==='agcu'));
 assert.ok(filterSystems({query:'Bismut',kind:'ternary'}).some(s=>s.id==='agbisn'));
 assert.deepEqual(filterSystems({family:'salt'}).map(s=>s.id).sort(),['nakmg','salt']);
 assert.equal(futureSystems.length,2);
 assert.deepEqual(filterSystems({query:'Bismut Blei'}).map(s=>s.id).sort(),['bipb','pbsnbi']);
 assert.ok(filterSystems({query:'Bi'}).every(s=>s.label.includes('Bi')));
 assert.equal(filterSystems({query:'AlCl3'})[0].id,'salt');
 assert.equal(reactionReferences({system:'unknown',components:['AG','SN'],masses:[107.87,118.69]}).length,0);
});
