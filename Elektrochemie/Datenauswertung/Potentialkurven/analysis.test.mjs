import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./potentialkurven.js', import.meta.url), 'utf8');
const model = vm.createContext({});
vm.runInContext(source, model);

test('Faraday conversion conserves charge and mass with explicit efficiency', () => {
  const result = model.faradayRate(1, 1, 1, 1, 1, 96485.33212 / 3600, 1);
  assert.ok(Math.abs(result.mass - 1) < 1e-12);
  assert.ok(Math.abs(result.depth - 10) < 1e-12);
  const half = model.faradayRate(1, 1, 1, 1, 0.5, 96485.33212 / 3600, 1);
  assert.equal(half.mass, result.mass / 2);
  assert.equal(model.faradayRate(1, 1, 1.5, 1, 1, 1, 1), null);
  assert.equal(model.faradayRate(null, 1, 1, 1, 1, 1, 1), null);
  assert.equal(model.faradayRate(1, 1, 1, 1, 1.1, 1, 1), null);
});

test('window variations recover a known two-reaction curve', () => {
  const points = Array.from({length: 601}, (_, index) => {
    const e = -0.3 + index * 0.001;
    return {e, i: 1e-6 * (10 ** (e / 0.1) - 10 ** (-e / 0.1))};
  });
  const variants = model.windowSensitivity(points, [-0.2, -0.12, 0.12, 0.2],
    p => Math.log10(Math.abs(p.i)));
  assert.ok(variants.length > 20);
  for (const fit of variants) {
    assert.ok(Math.abs(fit.e) < 0.001);
    assert.ok(Math.abs(fit.j / 1e-6 - 1) < 0.02);
  }
  assert.equal(model.windowSensitivity(points, [1, 2, 3, 4], p => Math.log10(Math.abs(p.i))).length, 0);
});
