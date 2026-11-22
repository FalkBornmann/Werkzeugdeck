import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIAL,KEYS,blankState,advance,index,preset,REFERENCE,referenceHV,validate} from '../materials.js';
import {run} from '../model.js';
import {mesh,heatStep} from '../thermal.js';
import '../svg-context.js';
import {FIGURES,render} from '../render.js';
import {figureHeight} from '../time-axis.js';
const p=(name='artificial',shape='plate')=>({shape,initial:'coarse',size:40,height:20,stages:preset(name)});
test('all reservoir transfers conserve the inventory and remain bounded for mixed histories',()=>{
 const s=blankState();for(const T of [545,20,175,350,100,549,180,20])for(let j=0;j<100;j++){advance(s,T,37);assert.ok(Math.abs(KEYS.reduce((sum,k)=>sum+s[k],0)-1)<1e-12);for(const k of KEYS)assert.ok(s[k]>=-1e-12&&s[k]<=1+1e-12);assert.ok(index(s)>=0&&index(s)<=100);}
});
test('solution treatment is time-dependent and natural aging has no artificial coarsening',()=>{
 const s=blankState();advance(s,545,1);assert.ok(s.solute>0&&s.solute<.01);advance(s,545,10000);assert.ok(s.solute>.99);
 const a=blankState('solution');advance(a,20,7*86400);assert.ok(a.clusters>.9);assert.equal(a.coarse,0);
});
test('quench-sensitive hold consumes useful solute and long hot aging overages',()=>{
 const slow=blankState('solution');advance(slow,340,300);assert.ok(slow.coarse>.99);
 const s=blankState('solution');for(let i=0;i<240;i++)advance(s,175,120);const peak=index(s);for(let i=0;i<1200;i++)advance(s,175,120);assert.ok(index(s)<peak);
});
test('isolated thermal step conserves the finite-volume energy loss to the boundary',()=>{
 const grid=mesh(40,'rod',12),old=grid.map(()=>545),dt=.5,h=2500,bath=20,out=heatStep(old,grid,MATERIAL,bath,h,dt);
 const removed=grid.reduce((sum,g,i)=>sum+MATERIAL.rho*MATERIAL.cp*g.volume*(old[i]-out[i]),0);
 const g=grid.at(-1),flux=g.right/(1/h+g.dx/(2*MATERIAL.k))*(out.at(-1)-bath)*dt;
 assert.ok(Math.abs(removed-flux)/removed<1e-10);assert.ok(out.every(T=>T>=20&&T<=545));
});
test('spatial process stays bounded, conserves solute, and corners cool faster',()=>{
 const r=run(p(),{n:8});assert.ok(r.frames.length>100);for(const f of r.frames){assert.ok(f.temps.every(T=>T>=19.999999&&T<=545.000001));for(const s of f.states)assert.ok(Math.abs(KEYS.reduce((a,k)=>a+s[k],0)-1)<1e-10);}
 const f=r.frames.find(f=>f.label==='Wasserabschrecken');assert.ok(f.temps[0]>f.temps.at(-1));assert.ok(r.frames.at(-1).meanIndex>20);
});
test('geometry matters and radial results converge under mesh refinement',()=>{
 const a=run({...p('artificial','rod'),stages:[{label:'heat',target:545,duration:1000,h:100,mode:'step'}]},{n:8});
 const b=run({...a.parameters,size:100},{n:8});const fine=run(a.parameters,{n:16});assert.ok(a.frames.at(-1).meanT>b.frames.at(-1).meanT);assert.ok(Math.abs(a.frames.at(-1).meanT-fine.frames.at(-1).meanT)<1);
});
test('kinetics time-step sensitivity is limited for an isothermal teaching case',()=>{
 const solve=dt=>{const s=blankState('solution');for(let t=0;t<28800;t+=dt)advance(s,175,dt);return index(s);};assert.ok(Math.abs(solve(120)-solve(30))<1);
});
test('reference contains text anchors, preserves endpoints and refuses extrapolation',()=>{
 for(const point of REFERENCE)assert.equal(referenceHV(point.h),point.hv);assert.equal(referenceHV(-1),null);assert.equal(referenceHV(97),null);assert.equal(referenceHV(NaN),null);
});
test('parameter validation rejects unsupported temperatures, geometries and nonfinite values',()=>{
 for(const bad of [{...p(),size:NaN},{...p(),shape:'cube'},{...p(),stages:[{...preset()[0],target:600}]},{...p(),stages:[]}])assert.throws(()=>validate(bad));assert.doesNotThrow(()=>validate(p('natural')));
});
test('every graphic shares a real-vector SVG rendering path',()=>{
 const r=run(p(),{n:4});for(const [id] of [...FIGURES,['reference']]){const ctx=new SvgContext(1000,figureHeight(id));render(ctx,id,r,r.frames.length-1,{});const svg=ctx.toSvg(id);assert.match(svg,/<text/);assert.match(svg,/<path|<rect/);assert.doesNotMatch(svg,/<image|NaN|Infinity/);}
});
