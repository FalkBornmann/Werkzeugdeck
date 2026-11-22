import test from 'node:test';
import assert from 'node:assert/strict';
import {logTimeAxis,logCurve,figureHeight,powerLabel,TIME_UNITS} from '../time-axis.js';
import {run} from '../model.js';
import {REFERENCE} from '../materials.js';
import '../svg-context.js';
import {render} from '../render.js';
test('true logarithmic coordinates preserve equal ratios and do not shift zero',()=>{
 const axis=logTimeAxis(7*86400);
 assert.equal(axis.position(0),null);assert.equal(axis.position(-1),null);
 assert.ok(Math.abs((axis.position(10)-axis.position(1))-(axis.position(100)-axis.position(10)))<1e-10);
 assert.ok(axis.position(1800)-axis.position(1)>400);
 assert.equal(axis.position(axis.min),axis.left);assert.ok(Math.abs(axis.position(axis.max)-axis.right)<1e-10);
});
test('seconds, minutes and hours ticks share one physical coordinate',()=>{
 const axis=logTimeAxis(604800);
 for(const unit of TIME_UNITS)for(const tick of axis.ticks(unit.factor))assert.ok(Math.abs(tick.x-axis.position(tick.seconds))<1e-10);
 const minute=axis.ticks(60).find(t=>t.major&&t.exponent===0),hour=axis.ticks(3600).find(t=>t.major&&t.exponent===0);
 assert.equal(minute.seconds,60);assert.equal(hour.seconds,3600);assert.equal(minute.x,axis.position(60));assert.equal(hour.x,axis.position(3600));
 assert.equal(powerLabel(-3),'10⁻³');
});
test('one-second programs retain a finite positive log domain',()=>{
 const axis=logTimeAxis(1);assert.equal(axis.min,.1);assert.ok(Number.isFinite(axis.position(1)));
 assert.ok(axis.ticks().length>1);assert.throws(()=>logTimeAxis(0));assert.throws(()=>logTimeAxis(NaN));
});
test('log rendering keeps physical-time interpolation of sparse reference values',()=>{
 const original=structuredClone(REFERENCE),axis=logTimeAxis(96*3600),points=logCurve(REFERENCE.map(p=>[p.h,p.hv]),3600,axis);
 assert.ok(points.length>50);assert.equal(points[0][0],1);
 for(const [seconds,hv] of points.filter(p=>p[0]<=8*3600))assert.ok(Math.abs(hv-(83.07+(132.32-83.07)*seconds/(8*3600)))<1e-9);
 assert.deepEqual(REFERENCE,original);assert.equal(points.at(-1)[0],96*3600);assert.equal(points.at(-1)[1],102.23);
 const shorter=logCurve([[0,0],[1,1]],1,axis);assert.ok(shorter.every(p=>p[0]<=1));
});
test('log views have space for three axes; profile and relative percent axes stay linear',()=>{
 for(const id of ['thermal','reservoirs','hardening','comparison','reference'])assert.equal(figureHeight(id),720);
 assert.equal(figureHeight('comparison',{compareAxis:'relative'}),560);assert.equal(figureHeight('profile'),560);assert.equal(figureHeight('thermal',{timeScale:'linear'}),560);
});
test('all time SVGs contain the equivalent axes, start note, exponent labels and no invalid coordinates',()=>{
 const r=run({shape:'rod',size:20,height:20,initial:'solution',stages:[{label:'Warmhalten',duration:10000,target:175,h:100,mode:'step'}]},{n:4});
 for(const id of ['thermal','reservoirs','hardening','comparison','reference']){
  const c=new SvgContext(1000,figureHeight(id));render(c,id,r,0,{timeScale:'log'});const svg=c.toSvg('Zeit');
  assert.match(svg,/height="720"/);for(const unit of TIME_UNITS)assert.ok(svg.includes(unit.label));
  assert.match(svg,/t = 0 s separat/);assert.match(svg,/10⁰/);assert.doesNotMatch(svg,/NaN|Infinity|<image/);
 }
 const linear=new SvgContext(1000,560);render(linear,'thermal',r,0,{timeScale:'linear'});assert.doesNotMatch(linear.toSvg('Linear'),/Zeit in Minuten/);
 const relative=new SvgContext(1000,560);render(relative,'comparison',r,0,{timeScale:'log',compareAxis:'relative'});assert.match(relative.toSvg('Relativ'),/Prozessfortschritt/);assert.doesNotMatch(relative.toSvg('Relativ'),/Zeit in Stunden/);
});
