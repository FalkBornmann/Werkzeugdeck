// Shape-preserving interpolation for display geometry; thermodynamic samples stay unchanged.
function slopes(points) {
  if (points.length < 2) return [0];
  const secants = points.slice(1).map((point, i) => (point[1] - points[i][1]) / (point[0] - points[i][0]));
  const result = [secants[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const left = secants[i - 1], right = secants[i];
    if (left * right <= 0) result.push(0);
    else {
      const h0 = points[i][0] - points[i - 1][0], h1 = points[i + 1][0] - points[i][0];
      const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
      result.push((w0 + w1) / (w0 / left + w1 / right));
    }
  }
  result.push(secants.at(-1));
  return result;
}
export function smoothGraph(points, move = true) {
  if (!points.length) return '';
  let d = (move ? 'M' : 'L') + points[0].join(' ');
  const derivative = slopes(points);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], h = (b[0] - a[0]) / 3;
    d += 'C' + [a[0] + h, a[1] + derivative[i - 1] * h,
      b[0] - h, b[1] - derivative[i] * h, b[0], b[1]].join(' ');
  }
  return d;
}
export function ribbonPath(points) {
  const center = points.map(p => [p[0], (p[1] + p[2]) / 2]);
  const half = points.map(p => [p[0], (p[2] - p[1]) / 2]);
  const dc = slopes(center), dh = slopes(half);
  const upper = [], lower = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1], h = (b[0] - a[0]) / 3;
    upper.push([a[0] + h, a[1] + (dc[i] - dh[i]) * h, b[0] - h, b[1] - (dc[i + 1] - dh[i + 1]) * h, b[0], b[1]]);
    lower.push([b[0] - h, b[2] - (dc[i + 1] + dh[i + 1]) * h, a[0] + h, a[2] + (dc[i] + dh[i]) * h, a[0], a[2]]);
  }
  return 'M' + [points[0][0], points[0][1]].join(' ') +
    upper.map(c => 'C' + c.join(' ')).join('') +
    'L' + [points.at(-1)[0], points.at(-1)[2]].join(' ') +
    lower.reverse().map(c => 'C' + c.join(' ')).join('') + 'Z';
}
export function joinContours(segments, dimensions) {
  const key = p => (dimensions?p.slice(0,dimensions):p).map(v => Math.round(v * 1e8)).join(',');
  const links = new Map();
  segments.forEach((segment, index) => segment.forEach(point => {
    const k = key(point);
    if (!links.has(k)) links.set(k, []);
    links.get(k).push(index);
  }));
  const used = new Set(), paths = [];
  function grow(points, atStart) {
    while (true) {
      const end = atStart ? points[0] : points.at(-1);
      const candidate = links.get(key(end)).find(i => !used.has(i));
      if (candidate === undefined) break;
      used.add(candidate);
      const segment = segments[candidate], point = key(segment[0]) === key(end) ? segment[1] : segment[0];
      if (atStart) points.unshift(point); else points.push(point);
    }
  }
  segments.forEach((segment, index) => {
    if (used.has(index)) return;
    used.add(index);
    const points = segment.slice();
    grow(points, false); grow(points, true); paths.push(points);
  });
  return paths;
}
export function roundContour(points, iterations = 2) {
  let result = points;
  for (let step = 0; step < iterations; step++) {
    if (result.length < 3) break;
    const next = [result[0]];
    for (let i = 0; i < result.length - 1; i++) {
      next.push(result[i].map((v, j) => .75 * v + .25 * result[i + 1][j]));
      next.push(result[i].map((v, j) => .25 * v + .75 * result[i + 1][j]));
    }
    next.push(result.at(-1)); result = next;
  }
  return result;
}
export function phaseFraction(sample, name) {
  return sample?.phases?.filter(p => p.name === name).reduce((sum, p) => sum + p.fraction, 0) || 0;
}
export function transitionEstimate(series, index, names) {
  const lower = series[index - 1], upper = series[index], estimates = [];
  for (const name of names) {
    const a = phaseFraction(lower, name), b = phaseFraction(upper, name);
    if ((a > 1e-7) === (b > 1e-7)) continue;
    const inside = b > 1e-7 ? index : index - 1;
    const neighbor = b > 1e-7 ? inside + 1 : inside - 1;
    if (neighbor < 0 || neighbor >= series.length) continue;
    const y1 = phaseFraction(series[inside], name), y2 = phaseFraction(series[neighbor], name);
    if (Math.abs(y2 - y1) < 1e-10) continue;
    const root = series[inside].temperature - y1 * (series[neighbor].temperature - series[inside].temperature) / (y2 - y1);
    estimates.push(Math.max(lower.temperature, Math.min(upper.temperature, root)));
  }
  if (!estimates.length) return (lower.temperature + upper.temperature) / 2;
  estimates.sort((a, b) => a - b);
  return estimates[Math.floor(estimates.length / 2)];
}
export function phaseBands(series) {
  const bands = [];
  let lower = series[0].temperature;
  for (let j = 1; j < series.length; j++) {
    if (series[j].signature === series[j - 1].signature) continue;
    const names = new Set([...series[j - 1].phases || [], ...series[j].phases || []].map(p => p.name));
    const upper = Math.max(lower, transitionEstimate(series, j, names));
    bands.push({lower, upper, signature: series[j - 1].signature || 'Datenlücke', allLiquid:series[j-1].liquid>1-1e-7});
    lower = upper;
  }
  bands.push({lower, upper: series.at(-1).temperature, signature: series.at(-1).signature || 'Datenlücke', allLiquid:series.at(-1).liquid>1-1e-7});
  return bands;
}
export function bandTracks(columns) {
  const tracks = [], active = new Map(), count = columns.length - 1;
  columns.forEach((column, i) => {
    const next = new Map();
    for (const band of (column.bands||phaseBands(column.series))) {
      const candidates = active.get(band.signature) || [];
      const previous = candidates.find(t => !next.get(band.signature)?.includes(t) &&
        Math.min(t.at(-1).upper, band.upper) >= Math.max(t.at(-1).lower, band.lower) - 1e-8);
      const track = previous || [];
      if (!previous) tracks.push(track);
      track.push({...band, position: i / count});
      if (!next.has(band.signature)) next.set(band.signature, []);
      next.get(band.signature).push(track);
    }
    active.clear();
    next.forEach((value, key) => active.set(key, value));
  });
  return tracks;
}



// Reduce mesh-scale zigzags in the displayed contour, with a tolerance in SVG pixels.
export function simplifyContour(points, tolerance = 2) {
  if (points.length < 3) return points;
  const a = points[0], b = points.at(-1), dx = b[0] - a[0], dy = b[1] - a[1];
  const length2 = dx * dx + dy * dy;
  let furthest = 0, distance2 = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i], t = length2 ? Math.max(0, Math.min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length2)) : 0;
    const d2 = (p[0]-a[0]-t*dx)**2 + (p[1]-a[1]-t*dy)**2;
    if (d2 > distance2) { distance2 = d2; furthest = i; }
  }
  if (distance2 <= tolerance * tolerance) return [a,b];
  return [...simplifyContour(points.slice(0,furthest+1),tolerance).slice(0,-1),
    ...simplifyContour(points.slice(furthest),tolerance)];
}


