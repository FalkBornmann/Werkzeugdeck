import test from 'node:test';
import assert from 'node:assert/strict';
import {run,probeIndex} from '../model.js';
import {preset} from '../materials.js';
import {geometry,pickField,probe,profile,metricValue,atTime,compareSeries,projectParameters} from '../analysis.js';
import '../svg-context.js';
import {render} from '../render.js';
const parameters=(shape='plate',size=40)=>({shape,size,height:20,initial:'solution',stages:[{label:'Abschrecken',target:175,duration:120,h:100,mode:'step'}]});
const a=run(parameters(),{n:4}),b=run({...parameters('rod',80),stages:[{label:'Halten',target:175,duration:240,h:100,mode:'step'}]},{n:8});
test('field picking mirrors the quarter-section and uses the exact selected cell',()=>{
 const g=geometry(a.parameters),point=pickField(a,g.cx+g.w*.375,g.cy+g.h*.125);
 assert.equal(probeIndex(a,point.x,point.y),7);
 assert.deepEqual(pickField(a,g.cx-g.w*.375,g.cy-g.h*.125),point);
 assert.equal(pickField(a,0,0),null);assert.equal(probeIndex(a,1,1),15);
 const centre=probe(a,.75,.25);assert.equal(centre.xMM,17.5);assert.equal(centre.yMM,3.75);
});
test('radial picking accepts any angle, ignores points outside and reports mm',()=>{
 const g=geometry(b.parameters);assert.equal(pickField(b,g.cx,g.cy+g.radius/2).x,.5);assert.equal(pickField(b,g.cx+g.radius+1,g.cy),null);
 const p=probe(b,.5,1);assert.equal(p.iy,0);assert.equal(p.xMM,22.5);
});
test('every profile point agrees with the selected-cell readout and has no invented boundary values',()=>{
 for(const r of [a,b])for(const metric of ['temperature','index','fine','solute']){
  const values=profile(r,r.frames.at(-1),.8,metric);
  assert.equal(values.length,r.nx);assert.ok(values[0].x>0);assert.ok(values.at(-1).x<r.parameters.size/2);
  for(const p of values){const ix=p.i%r.nx,iy=Math.floor(p.i/r.nx);assert.equal(p.value,metricValue(r,r.frames.at(-1),metric,'probe',{x:(ix+.5)/r.nx,y:(iy+.5)/r.ny}));}
 }
});
test('time sampling interpolates only inside the calculated interval',()=>{
 const simple={...a,total:10,frames:[{time:0,meanT:20},{time:10,meanT:120}]};
 assert.equal(atTime(simple,5,'temperature','mean'),70);assert.equal(atTime(simple,0,'temperature','mean'),20);assert.equal(atTime(simple,10,'temperature','mean'),120);
 assert.equal(atTime(simple,10.01,'temperature','mean'),null);assert.equal(atTime(simple,-1,'temperature','mean'),null);
});
test('comparison preserves each full history and its own physical or normalized end time',()=>{
 const saved=[{name:'Kurz',result:a}],absolute=compareSeries(b,saved,{compareMetric:'temperature'});
 assert.equal(absolute[0].values.length,a.frames.length);assert.equal(absolute[0].values.at(-1)[0],120/3600);assert.equal(absolute[1].values.at(-1)[0],240/3600);
 const relative=compareSeries(b,saved,{compareAxis:'relative'});for(const s of relative){assert.equal(s.values[0][0],0);assert.equal(s.values.at(-1)[0],100);}
});
test('comparison SVG retains five identifiable curves, units, labels and cell markers',()=>{
 const c=new SvgContext(1000,560);render(c,'comparison',b,2,{comparisons:[{name:'Kurz',result:a},{name:'Lang',result:b}],compareAxis:'relative',compareMetric:'fine'});
 const svg=c.toSvg('Vergleich');assert.match(svg,/Kurz/);assert.match(svg,/Lang/);assert.match(svg,/Prozessfortschritt/);assert.match(svg,/%/);assert.doesNotMatch(svg,/<image|NaN/);
 const p=new SvgContext(1000,560);render(p,'profile',b,2,{x:.5,profileMetric:'index'});assert.match(p.toSvg('Profil'),/Radius r \[mm\]/);
});
test('project v2 accepts only valid parameter sets and ignores untrusted stored results',()=>{
 const data={schema:2,parameters:parameters(),comparisons:[{name:'Lang',parameters:parameters('rod'),result:{frames:'untrusted'}}],result:{frames:'untrusted'}};
 const parsed=projectParameters(data);assert.equal(parsed.comparisons[0].name,'Lang');assert.equal(parsed.result,undefined);assert.equal(parsed.comparisons[0].result,undefined);
 parsed.parameters.size=90;assert.equal(data.parameters.size,40);
 assert.throws(()=>projectParameters({...data,comparisons:Array(5).fill(data.comparisons[0])}));
 assert.throws(()=>projectParameters({...data,comparisons:[{parameters:{...parameters(),size:NaN}}]}));
 assert.equal(projectParameters({schema:1,parameters:parameters()}).comparisons.length,0);
});
