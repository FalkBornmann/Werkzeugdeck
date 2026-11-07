import test from 'node:test';
import assert from 'node:assert/strict';
import '../templates/svg-context.js';

test('canvas paths retain coordinates at construction time and restore dash and transforms', () => {
  const context = new SvgContext(100, 100);
  context.save();
  context.translate(10, 20);
  context.setLineDash([4, 2]);
  context.beginPath();
  context.lineTo(1, 2);
  context.lineTo(3, 4);
  context.restore();
  context.stroke();
  assert.match(context.toSvg('Plot'), /d="M 11 22 L 13 24"/);
  assert.match(context.toSvg('Plot'), /stroke-dasharray=""/);
});
test('clipping is saved with state and text is escaped as XML', () => {
  const context = new SvgContext(200, 100);
  context.save();
  context.beginPath();
  context.rect(10, 10, 80, 40);
  context.clip();
  context.fillText('A&B < 3 µA', 10, 20);
  context.restore();
  context.fillRect(0, 0, 2, 2);
  const svg = context.toSvg('T < 5', 'Units & limits');
  assert.match(svg, /clipPathUnits="userSpaceOnUse"/);
  assert.match(svg, /A&amp;B &lt; 3 µA/);
  assert.match(svg, /<title>T &lt; 5<\/title>/);
  assert.doesNotMatch(svg, /<image|data:image/);
  assert.equal((svg.match(/clip-path=/g) || []).length, 1);
});
test('full circles contain four curved segments and coordinates must be finite', () => {
  const context = new SvgContext(100, 100);
  context.arc(20, 20, 5, 0, 2 * Math.PI);
  context.fill();
  assert.equal((context.toSvg('Marker').match(/C /g) || []).length, 4);
  assert.throws(() => context.moveTo(NaN, 0), /ungültige Koordinaten/);
});
