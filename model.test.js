import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults, simulate, series} from './model.js';
const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-8);
test('energy conserved and timing independent in an ideal vessel with fixed addition', () => {
  const settings = {...defaults, vessel:'ideal'};
  const a = simulate(settings,0), b = simulate(settings,5);
  near(b.before(5),85);
  near(a.at(10),(200*4.18*85 + 40*4*5)/(200*4.18+40*4));
  near(a.at(10),b.at(10));
});
test('cold wall, warming jug, hot water and real mixing jumps', () => {
  const a = simulate(defaults,5);
  assert.ok(a.initial < defaults.baseTemp && a.mixed < a.before(5));
  assert.ok(simulate({...defaults,storage:'counter'},5).mixed > a.mixed);
  assert.ok(simulate({...defaults,preheat:'warm'},5).initial === 85);
  const hot = simulate({...defaults,extra:'water',extraTemp:90,baseTemp:40},5);
  assert.ok(hot.mixed > hot.before(5));
  assert.deepEqual(series(a,30).filter(([t])=>t===5),[[5,a.before(5)],[5,a.mixed]]);
});
test('target considers only the mixture, instantaneous crossing and unreachable bounds', () => {
  const base = simulate(defaults,5);
  const hit = base.targetTime(60);
  assert.ok(hit>=5); if (hit>5) near(base.at(hit),60);
  assert.equal(simulate({...defaults,target:99},5).targetTime(60),5);
  assert.equal(simulate({...defaults,target:5},5).targetTime(60),null);
  assert.equal(simulate({...defaults,vessel:'ideal',target:5},5).targetTime(60),null);
});
test('zero addition and identical times produce identical curves', () => {
  for (const dose of [0,40]) {
    const s = {...defaults,dose};
    near(simulate(s,5).at(17),simulate(s,dose===0?0:5).at(17));
  }
});
