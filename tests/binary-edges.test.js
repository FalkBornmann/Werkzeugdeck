import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {systems,binaryEdgesFor,filterSystems} from '../systems.js';
import {makeBinaryEdge,liftEdge,projectEdgeSample} from '../binary-edges.js';
import {solve,nearest,profile} from '../equilibrium.js';
import {diagramSetup} from '../diagram-model.js';
import {reactionReferences} from '../reaction-data.js';
import {displayedBinaryLiquidus,displayedSolidus} from '../solidus-display.js';
import {boundaryFromSeries} from '../boundary.js';
const root=new URL('../',import.meta.url),json=name=>JSON.parse(readFileSync(new URL(name,root))),gz=name=>JSON.parse(gunzipSync(readFileSync(new URL(name,root))));
function load(s){
 if(s.id==='salt'||s.diagramFile)return {m:diagramSetup(gz(s.diagramFile||'salt-diagram.json.gz')),surface:null};
 let m;if(s.hullIndex){const index=json(s.hullIndex);m={...index.model,frames:index.parts.flatMap(f=>gz(f).frames)}}else m=gz(s.id+'-hulls.json.gz');
 m.system=s.id;m.solidusDisplay=gz(s.id+'-solidus.json.gz');
 const atlas=gz(s.id+'-liquidus.json.gz');return {m,surface:{n:atlas.n,nodes:atlas.nodes.map(p=>({value:p[0]}))}};
}
test('all ternary triangles have three unique selectable binary pairs',()=>{
 assert.equal(systems.length,31);assert.equal(systems.filter(s=>s.kind==='binary').length,21);
 for(const s of systems.filter(s=>s.kind==='ternary'))assert.equal(new Set(binaryEdgesFor(s).map(b=>b.id)).size,3,s.id);
 assert.equal(systems.filter(s=>s.edge).length,12);
 assert.ok(filterSystems({kind:'binary',family:'salt'}).length===5);
});
for(const parent of systems.filter(s=>systems.some(b=>b.edge?.parent===s.id))){
 test(parent.id+' derived binary states retain parent phase amounts and component balance',()=>{
  const {m,surface}=load(parent);
  for(const definition of systems.filter(s=>s.edge?.parent===parent.id)){
   const edge=makeBinaryEdge(m,definition,surface,reactionReferences(m));
   const compact=definition.edge.compact?gz(definition.id+'-hulls.json.gz'):null;
   if(compact)compact.solidusDisplay=gz(definition.id+'-solidus.json.gz');
   assert.equal(edge.components.length,2);
   let covered=0;
   for(const f of [0,.03,.25,.5,.73,.97,1])for(const t of [m.T[0],100,250,550,800,m.T.at(-1)]){
    const x=[f,1-f],ti=nearest(m.T,t),original=solve(m,liftEdge(x,definition.edge.indices),ti),sample=solve(edge,x,ti);
    if(original.unavailable){assert.ok(sample.unavailable);continue}
    assert.ok(!sample.unavailable,definition.id+' '+f+' '+t);covered++;
    assert.ok(Math.abs(sample.liquid-original.liquid)<1e-12);
    if(compact){const actual=solve(compact,x,ti);assert.ok(actual,definition.id+' compact coverage');assert.equal(actual.signature,sample.signature);for(const raw of new Set(sample.phases.map(p=>p.raw))){const amount=s=>s.phases.filter(p=>p.raw===raw).reduce((n,p)=>n+p.fraction,0);assert.ok(Math.abs(amount(actual)-amount(sample))<2e-5,definition.id+' '+raw)}assert.ok(Math.abs(actual.enthalpy-sample.enthalpy)<.02);}
    assert.equal(sample.signature,original.signature);assert.equal(sample.phases.length,original.phases.length);
    for(let k=0;k<2;k++){
     const total=sample.phases.reduce((n,p)=>n+p.fraction*p.x[k],0);
     assert.ok(Math.abs(total-x[k])<2e-5,definition.id+' '+total+' != '+x[k]);
    }
    assert.ok(Math.abs(sample.phases.reduce((n,p)=>n+p.mass,0)-1)<1e-8);
    sample.phases.forEach((p,i)=>{assert.equal(p.fraction,original.phases[i].fraction);assert.equal(p.mass,original.phases[i].mass)});
   }
   assert.ok(covered>=24,definition.id);
   const x=[.5,.5],series=profile(edge,x),root=boundaryFromSeries(series,'solidus')[0],tl=displayedBinaryLiquidus(edge,x);
   assert.ok(Number.isFinite(tl),definition.id+' liquidus');
   if(compact)assert.ok(Math.abs(displayedBinaryLiquidus(compact,x)-tl)<1e-5,definition.id+' compact liquidus');
   if(root&&edge.solidusDisplay)assert.ok(Number.isFinite(displayedSolidus(edge,x,root,series)),definition.id+' solidus');
   assert.ok(reactionReferences(edge).every(r=>r.x.length===2));
  }
 });
}

test('an unresolved pure third-component trace cannot become a NaN binary phase',()=>{
 const sample={phases:[{fraction:5e-7,x:[0,0,1]}],liquid:0,enthalpy:0};
 assert.equal(projectEdgeSample(sample,[0,1]).unavailable,true);
});
