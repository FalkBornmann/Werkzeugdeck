// Temperatures in °C, time in minutes, volumes in ml. Lumped-capacity teaching model.
export const vessels = {
  china: {name:'Keramiktasse', wall:95, side:0.23, opening:0.40},
  glass: {name:'Trinkglas', wall:45, side:0.31, opening:0.36},
  travel: {name:'Thermobecher', wall:28, side:0.045, opening:0.27},
  ideal: {name:'Idealer Isolierbecher', wall:0, side:0, opening:0}
};
// Estimated volumetric heat capacities in J/(ml K).
export const liquids = {
  coffee:{name:'Kaffee', heat:4.18}, tea:{name:'Tee', heat:4.18},
  milk:{name:'Milch', heat:4.0}, cream:{name:'Sahne', heat:3.6}, water:{name:'Wasser', heat:4.18}
};
export const defaults = {
  base:'coffee', extra:'milk', vessel:'china', size:300, cover:'open', preheat:'room', storage:'fixed',
  volume:200, baseTemp:85, dose:40, extraTemp:5, air:20, first:0, second:5, drink:10, target:60
};
export function relax(temp, air, conductance, capacity, minutes) {
  return air + (temp - air) * Math.exp(-60 * minutes * conductance / capacity);
}
export function simulate(settings, add) {
  const s = settings, cup = vessels[s.vessel];
  const baseCapacity = s.volume * liquids[s.base].heat;
  const addCapacity = s.dose * liquids[s.extra].heat;
  // Geometrically similar profiles, with wall thickness held constant.
  const area = (s.size / 300) ** (2 / 3);
  const wall = cup.wall * area;
  const beforeCapacity = baseCapacity + wall;
  const afterCapacity = beforeCapacity + addCapacity;
  const wallTemp = s.preheat === 'warm' ? s.baseTemp : s.air;
  const initial = (baseCapacity * s.baseTemp + wall * wallTemp) / beforeCapacity;
  const conductance = volume => area * (cup.side * volume / s.size + cup.opening * (s.cover === 'lid' ? 0.12 : 1));
  const beforeG = conductance(s.volume);
  const afterG = conductance(s.volume + s.dose);
  const before = t => relax(initial, s.air, beforeG, beforeCapacity, t);
  const waitingTemp = s.storage === 'counter' && addCapacity > 0
    ? relax(s.extraTemp, s.air, 0.10 * (s.dose / 40) ** (2 / 3), addCapacity, add)
    : s.extraTemp;
  const mixed = (beforeCapacity * before(add) + addCapacity * waitingTemp) / afterCapacity;
  const at = t => t < add ? before(t) : relax(mixed, s.air, afterG, afterCapacity, t - add);
  function targetTime(limit) {
    if (mixed <= s.target) return add;
    if (afterG === 0 || s.target <= s.air) return null;
    const hit = add + afterCapacity / (60 * afterG) * Math.log((mixed - s.air) / (s.target - s.air));
    return hit <= limit ? hit : null;
  }
  return {add, initial, before, mixed, waitingTemp, at, targetTime};
}
export function series(curve, end) {
  const points = [];
  for (let t = 0; t < end; t += 0.25) {
    if (t !== curve.add) points.push([t, curve.at(t)]);
  }
  points.push([curve.add, curve.before(curve.add)], [curve.add, curve.mixed]);
  if (curve.add !== end) points.push([end, curve.at(end)]);
  return points.sort((a,b) => a[0] - b[0]);
}
