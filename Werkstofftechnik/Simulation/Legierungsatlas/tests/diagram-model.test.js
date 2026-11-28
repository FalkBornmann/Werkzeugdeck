import {displayedSolidus} from '../solidus-display.js';
import {boundaryFromSeries} from '../boundary.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {diagramSetup,diagramLiquidus,solveDiagram} from '../diagram-model.js';
import {smoothTemperatures} from '../smooth-fields.js';
import {profile,nearest} from '../equilibrium.js';
import {prepareSection} from '../section.js';
const data=JSON.parse(gunzipSync(readFileSync(new URL('../salt-diagram.json.gz',import.meta.url)))),model=diagramSetup(data);
test('salt isotherm model pins published eutectics and marks unsupported apex',()=>{
 for(const r of data.references)assert.ok(Math.abs(diagramLiquidus(model,r.x)-r.t)<1e-5);
 assert.equal(diagramLiquidus(model,[0,0,1]),null);
 assert.equal(solveDiagram(model,[0,0,1],0).unavailable,true);
 assert.ok(data.controls.length>300);
 for(const iso of data.sourceIsotherms)for(const path of iso.paths)for(const x of path){assert.ok(x.every(v=>v>=0));assert.ok(Math.abs(x.reduce((s,v)=>s+v,0)-1)<1e-8)}
});
test('geometric salt states conserve every component and mass and retain monotone melt amount',()=>{
 const xs=[[.3,.3,.4],[.364,.138,.498],[.255,.142,.603],[.1,.25,.65],[1,0,0],[0,1,0],[.5,0,.5],[0,.5,.5]];
 for(const x of xs){
  let previous=0;
  for(const t of [40,80,90,100,130,140,150,200,250,400,600,850]){
   const s=solveDiagram(model,x,nearest(model.T,t));
   assert.ok(!s.unavailable);
   assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.fraction,0)-1)<1e-7);
   assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.mass,0)-1)<1e-7);
   for(let i=0;i<3;i++)assert.ok(Math.abs(s.phases.reduce((v,p)=>v+p.fraction*p.x[i],0)-x[i])<1e-6);
   assert.ok(s.liquid>=previous-2e-4,JSON.stringify({x,t,liquid:s.liquid,previous}));
   previous=s.liquid;
  }
 }
});
test('curvature smoothing removes quantized steps while pinning true junction endpoints',()=>{
 const raw=Array.from({length:81},(_,i)=>Math.round((300-i*.6)/8)*8),fit=smoothTemperatures(raw);
 const rough=a=>a.slice(2).reduce((s,v,i)=>s+(v-2*a[i+1]+a[i])**2,0);
 assert.equal(fit[0],raw[0]);assert.equal(fit.at(-1),raw.at(-1));assert.ok(rough(fit)<rough(raw)*.1);
 assert.deepEqual(smoothTemperatures([100,100,100,100,100]),[100,100,100,100,100]);
});
test('smooth section fields share melting boundaries without overlaps',()=>{
 const m=JSON.parse(gunzipSync(readFileSync(new URL('../pbsnbi-hulls.json.gz',import.meta.url))));
 m.solidusDisplay=JSON.parse(gunzipSync(readFileSync(new URL('../pbsnbi-solidus.json.gz',import.meta.url))));
 const columns=Array.from({length:61},(_,i)=>{const f=i/60,x=[f*.611,f*.389,1-f];return {x,series:profile(m,x)}});
 const out=prepareSection({model:m,columns,binary:false});
 for(const c of out){
  for(let i=0;i<c.bands.length;i++){
   assert.ok(c.bands[i].upper>=c.bands[i].lower);
   if(i)assert.ok(Math.abs(c.bands[i].lower-c.bands[i-1].upper)<1e-8);
  }
  const S=c.boundaries.solidus[0]?.temperature,L=c.boundaries.liquidus[0]?.temperature;
  if(S!==undefined&&L!==undefined)assert.ok(S<=L);
 }
});

for(const [key,tolerance] of [['sac',8],['pbsnbi',2],['bisn',.01],['cusn',1]]){
 test(key+' branch-aware solidus retains independent direct onset references',()=>{
  const m=JSON.parse(gunzipSync(readFileSync(new URL('../'+key+'-hulls.json.gz',import.meta.url))));
  m.solidusDisplay=JSON.parse(gunzipSync(readFileSync(new URL('../'+key+'-solidus.json.gz',import.meta.url))));
  const refs=JSON.parse(readFileSync(new URL('./solidus-reference-'+key+'.json',import.meta.url)));
  for(const q of refs){const p=profile(m,q.x),root=boundaryFromSeries(p,'solidus')[0],value=displayedSolidus(m,q.x,root,p);assert.ok(Math.abs(value-q.direct)<tolerance)}
 });
}