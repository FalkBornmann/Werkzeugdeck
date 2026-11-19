import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { joinContours, roundContour, smoothGraph, transitionEstimate, phaseBands } from '../geometry.js';
import { elementSymbol } from '../symbols.js';
import { compositionLabel } from '../render.js';
import { solve, profile, nearest } from '../equilibrium.js';
import { fractionValues } from '../fractions.js';
import { microstructureChart } from '../microstructure.js';

test('display symbols preserve chemical case and compounds', () => {
 for (const [input, expected] of Object.entries({ AG:'Ag', CU:'Cu', SN:'Sn', BI:'Bi', AL:'Al', CL:'Cl', NA:'Na', K:'K', NaCl:'NaCl', 'AlCl₃':'AlCl₃' })) assert.equal(elementSymbol(input), expected);
 assert.equal(compositionLabel([.25,.75], {model:{components:['AG','CU']},basis:'mole'}), 'Ag 25 % · Cu 75 %');
});
test('contours join in either orientation and preserve branches and endpoints when rounded', () => {
 const joined = joinContours([[[1,0],[2,1]], [[0,0],[1,0]], [[3,1],[2,1]], [[8,8],[9,9]]]);
 assert.equal(joined.length,2);
 const first = joined.find(p=>p.length===4), rounded = roundContour(first);
 assert.deepEqual(rounded[0],first[0]);assert.deepEqual(rounded.at(-1),first.at(-1));
 assert.ok(rounded.every(p=>p[0]>=0&&p[0]<=3&&p[1]>=0&&p[1]<=1));
});
test('smooth extrema have horizontal tangent and roots stay within sampled temperature intervals', () => {
 const d=smoothGraph([[0,0],[1,1],[2,0]]);
 assert.ok(d.includes('C'));assert.ok(!/NaN|Infinity/.test(d));
 const sample=(temperature,a)=>({temperature,signature:a?'A + L':'L',phases:[{name:'A',fraction:a},{name:'L',fraction:1-a}]});
 const series=[sample(100,.6),sample(110,.3),sample(120,0),sample(130,0)];
 assert.equal(transitionEstimate(series,2,['A']),120);
 const bands=phaseBands(series);assert.equal(bands[0].upper,bands[1].lower);
 assert.ok(bands.every(b=>b.upper>=b.lower));
});
const model=JSON.parse(gunzipSync(readFileSync(new URL('../bisn-hulls.json.gz', import.meta.url))));
test('fraction readout and microstructure share model values on both bases and all-liquid endpoint', () => {
 const x=[.45,.55],series=profile(model,x);
 for(const basis of ['mass','mole'])for(const temperature of [100,140,400]){
  const ti=nearest(model.T,temperature),current=solve(model,x,ti);
  const state={model,profiles:[series],selected:0,basis,ti,current,binary:true,morphology:'auto'};
  const values=fractionValues(state);
  assert.ok(Math.abs(values.reduce((sum,p)=>sum+p.value,0)-1)<1e-8);
  for(const p of current.phases)assert.ok(Math.abs(values.find(v=>v.name===p.name).value-(basis==='mass'?p.mass:p.fraction))<1e-10);
  const image=microstructureChart(state);assert.ok(image.includes(basis==='mass'?'Masse-%':'mol-%'));assert.ok(!/<image|NaN|Infinity/.test(image));
  if(temperature===400){assert.equal(current.phases.length,1);assert.ok(image.includes('Einphasige Schmelze'))}
 }
});
