import { fmt, text, line, svg, phaseColor } from './render.js';

export function fractionValues(state, index = state.ti) {
  const sample = state.profiles[state.selected][index];
  const names = [...new Set(state.profiles[state.selected].flatMap(s => s.phases?.map(p => p.name) || []))];
  return names.map(name => ({
    name,
    value: sample.phases?.filter(p => p.name === name)
      .reduce((sum, p) => sum + (state.basis === 'mass' ? p.mass : p.fraction), 0) || 0,
    color: phaseColor(name),
  }));
}
export function fractionsChart(state) {
  const series = state.profiles[state.selected], values = fractionValues(state);
  const [low, high] = state.window;
  const X = temperature => 70 + 580 * (high - temperature) / (high - low);
  const Y = fraction => 365 - fraction * 285;
  let body = text(70, 26, (state.labels?.[state.selected]||('X'+(state.selected+1))) + ' · Phasenanteile / ' +
    (state.basis === 'mass' ? 'Masse-%' : 'mol-%'), 18);
  body += '<defs><clipPath id="fractionClip"><rect x="70" y="80" width="580" height="285"/></clipPath></defs>';
  for (let i = 0; i <= 10; i++) {
    body += line(70, Y(i / 10), 650, Y(i / 10), i % 2 ? '#e2dcd4' : '#b8aea1', i % 2 ? .6 : 1);
    body += text(58, Y(i / 10) + 4, String(i * 10), 13, 'end');
  }
  body += '<g clip-path="url(#fractionClip)">';
  const samples = series.filter(s => s.temperature >= low && s.temperature <= high).slice().reverse();
  const stacked = state.fractionMode === 'stacked';
  const sumAt = (sample, limit) => values.slice(0, limit).reduce((sum, phase) =>
    sum + (sample.phases?.filter(p => p.name === phase.name)
      .reduce((a, p) => a + (state.basis === 'mass' ? p.mass : p.fraction), 0) || 0), 0);
  values.forEach((phase, index) => {
    const points = samples.map(sample => {
      const value = sumAt(sample, index + 1) - sumAt(sample, index);
      return [X(sample.temperature), Y(stacked ? sumAt(sample, index + 1) : value)];
    });
    let d = points.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join('');
    if (stacked) {
      d += samples.slice().reverse().map(sample =>
        'L' + X(sample.temperature) + ' ' + Y(sumAt(sample, index))).join('') + 'Z';
    }
    body += '<path data-phase-curve="' + phase.name + '" d="' + d +
      '" stroke="' + phase.color + '" stroke-width="' + (stacked ? 1 : 2.5) +
      '" fill="' + (stacked ? phase.color : 'none') + '" fill-opacity="' + (stacked ? .65 : 1) + '"/>';
    if (!stacked) body += '<circle cx="' + X(state.model.T[state.ti]) + '" cy="' + Y(phase.value) +
      '" r="4" fill="' + phase.color + '" stroke="white" stroke-width="1.5"/>';
  });
  body += line(X(state.model.T[state.ti]), 80, X(state.model.T[state.ti]), 365, '#2c2924', 1.8, '5 3');
  body += '</g>';
  for (let i = 0; i <= 5; i++) {
    const temperature = high - (high - low) * i / 5;
    body += text(X(temperature), 391, fmt(temperature, 0), 13, 'middle');
  }
  body += text(360, 421, 'Temperatur / °C · Abkühlung →', 14, 'middle');
  body += text(685, 67, 'Phasen', 16);
  values.forEach((phase, i) => {
    const y = 100 + i * 36;
    body += line(685, y - 4, 709, y - 4, phase.color, 4);
    body += text(718, y, phase.name, 13);

  });
  body += text(70, 452, 'Klicken oder ziehen zum Ablesen · Prozentwerte stehen in der Tabelle unter dem Diagramm', 12);
  return svg(body, 910, Math.max(480, 125 + values.length * 36), 'Direkt ablesbare Phasenanteile');
}
