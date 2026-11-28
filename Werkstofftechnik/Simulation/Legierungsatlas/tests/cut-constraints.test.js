import test from 'node:test';import assert from 'node:assert/strict';
import {constrainedCut} from '../cut-constraints.js';
const a=[1,0,0],b=[0,1,0],p=[.364,.138,.498],q=[.255,.142,.603];
const position=(r,x)=>{const d=r.b.map((v,i)=>v-r.a[i]),f=x.reduce((s,v,i)=>s+(v-r.a[i])*d[i],0)/d.reduce((s,v)=>s+v*v,0);return r.a.map((v,i)=>v+f*d[i])};
test('one triangle anchor remains on a freely rotated full-simplex section',()=>{
 for(const angle of [0,25,85,130,179]){const r=constrainedCut([{pointId:'A1',x:p}],a,b,angle);assert.ok(position(r,p).every((v,i)=>Math.abs(v-p[i])<1e-9));for(const x of [r.a,r.b]){assert.ok(x.every(v=>v>=0));assert.ok(Math.abs(x.reduce((s,v)=>s+v,0)-1)<1e-12)}}
});
test('two triangle anchors fix the section through both compositions',()=>{
 const r=constrainedCut([{pointId:'A1',x:p},{pointId:'A2',x:q}],a,b);
 for(const x of [p,q])assert.ok(position(r,x).every((v,i)=>Math.abs(v-x[i])<1e-9));
 assert.throws(()=>constrainedCut([{pointId:'A1',x:p},{pointId:'A2',x:p}],a,b),/verschiedene/);
});
test('a vertex anchor rejects zero-length tangent directions and finds a valid initial line',()=>{
 assert.throws(()=>constrainedCut([{pointId:'A1',x:a}],a,b,120),/Winkel/);
 const r=constrainedCut([{pointId:'A1',x:a}],[0,1,0],[0,0,1]);assert.ok(Math.hypot(...r.b.map((v,i)=>v-r.a[i]))>0);
});