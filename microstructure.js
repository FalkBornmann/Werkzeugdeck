import { eutecticConstituents } from './constituents.js';
import { fmt, text, line, svg, phaseColor, escape } from './render.js';
import { transitions } from './equilibrium.js';

function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function polygon(points) {
  return points.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join('') + 'Z';
}
function grains() {
  const rand = random(2197);
  const seeds = Array.from({ length: 22 }, () => [30 + rand() * 550, 65 + rand() * 290]);
  return seeds.map((seed, index) => {
    let points = [[30, 65], [590, 65], [590, 355], [30, 355]];
    seeds.forEach((other, j) => {
      if (j === index) return;
      const normal = [other[0] - seed[0], other[1] - seed[1]];
      const bound = (other[0] ** 2 + other[1] ** 2 - seed[0] ** 2 - seed[1] ** 2) / 2;
      const side = p => normal[0] * p[0] + normal[1] * p[1] - bound;
      const clipped = [];
      points.forEach((point, i) => {
        const next = points[(i + 1) % points.length], a = side(point), b = side(next);
        if (a <= 0) clipped.push(point);
        if ((a <= 0) !== (b <= 0)) {
          const t = a / (a - b);
          clipped.push(point.map((v, k) => v + t * (next[k] - v)));
        }
      });
      points = clipped;
    });
    return { points, seed };
  });
}
const cells = grains();
function choose(phases, value) {
  let sum = 0;
  for (const phase of phases) {
    sum += phase.share;
    if (value < sum) return phase;
  }
  return phases.at(-1);
}
export function microstructureChart(state) {
  const sample = state.current;
  const phases = sample.phases.map(p => ({
    ...p, share: state.basis === 'mass' ? p.mass : p.fraction, color: phaseColor(p.name),
  })).sort((a, b) => b.share - a.share);
  const liquid = phases.find(p => p.raw === 'LIQUID');
  const solids = phases.filter(p => p.raw !== 'LIQUID');
  const history = transitions(state.profiles[state.selected]);
  const peritectic = history.some(e => e.from >= state.model.T[state.ti] && e.reaction.split(' → ')[0].split(' + ').includes('L') && e.reaction.split(' → ')[0].split(' + ').length>1);
  const eutectic=eutecticConstituents(state);
  let morphology = state.morphology || 'auto';
  if (morphology === 'auto') {
    morphology = liquid && solids.length ? 'dendrites' :
      peritectic && solids.length > 1 ? 'shells' :
      eutectic && solids.length > 1 ? 'lamellae' : 'grains';
  }
  if (solids.length === 1 && ['lamellae', 'shells'].includes(morphology)) morphology = 'grains';
  const names = {
    dendrites: 'Primärkristalle und Zwischenräume', grains: 'Körner und Teilchen',
    lamellae: eutectic?.primary>.03?'Primärkristalle und eutektisches Gemisch':'Lamellares Gemisch', shells: 'Reaktionssäume',
  };
  let body = text(30, 25, (state.labels?.[state.selected]||('X'+(state.selected+1))) + ' · mögliches Gefügebild bei ' +
    fmt(state.model.T[state.ti]) + ' °C', 18);
  body += text(30, 48, solids.length ? names[morphology] : 'Einphasige Schmelze', 13);
  const background = liquid || phases[0];
  body += '<defs><clipPath id="structureClip"><rect x="30" y="65" width="560" height="290"/></clipPath>';
  if (solids.length > 1) {
    body += '<pattern id="lamellae" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">';
    body += '<rect width="16" height="16" fill="' + solids[0].color + '"/>';
    solids.slice(1).forEach((phase, i) => {
      body += '<rect x="' + (4 + i * 5) + '" width="3" height="16" fill="' + phase.color + '"/>';
    });
    body += '</pattern>';
    cells.forEach((_,i)=>{body+='<pattern id="colony'+i+'" href="#lamellae" patternTransform="rotate('+(17+i*37%150)+')"/>'});
  }
  body += '</defs><g clip-path="url(#structureClip)"><rect x="30" y="65" width="560" height="290" fill="' + background.color + '"/>';
  const rand = random(9206);
  if (solids.length) {
    if (morphology === 'lamellae' && solids.length > 1) {
      if (liquid) {
        cells.filter((_, i) => i % 3 !== 0).forEach(cell => {
          body += '<path d="' + polygon(cell.points) + '" fill="url(#lamellae)" stroke="' + liquid.color + '" stroke-width="5"/>';
        });
      } else {
        const primaryColor=solids.find(p=>p.name===eutectic?.primaryName)?.color||solids[0].color;
        cells.forEach((cell,i)=>{
          const primary=eutectic&&((i*13)%cells.length+.5)/cells.length<eutectic.primary;
          body+='<path d="'+polygon(cell.points)+'" fill="'+(primary?primaryColor:'url(#colony'+i+')')+'" stroke="#faf5ec" stroke-width="1.3"/>';
        });
      }
    } else if (morphology === 'shells' && solids.length > 1) {
      for (let i = 0; i < 15; i++) {
        const x = 55 + rand() * 505, y = 88 + rand() * 240, radius = 14 + rand() * 15;
        body += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + radius * 1.4 + '" ry="' + radius +
          '" fill="' + solids[1].color + '" stroke="#ffffff88"/>';
        body += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + radius * .86 + '" ry="' + radius * .57 +
          '" fill="' + solids[0].color + '"/>';
      }
    } else if (morphology === 'dendrites') {
      for (let i = 0; i < 10; i++) {
        const x = 60 + (i % 5) * 105 + rand() * 16, y = 125 + Math.floor(i / 5) * 145;
        const phase = solids[i % solids.length];
        let d = 'M' + x + ' ' + (y - 48) + 'L' + x + ' ' + (y + 48);
        for (let j = -2; j <= 2; j++) {
          d += 'M' + x + ' ' + (y + j * 16) + 'l-25 -20M' + x + ' ' + (y + j * 16) + 'l25 -20';
        }
        body += '<path d="' + d + '" stroke="' + phase.color + '" stroke-width="8" stroke-linecap="round" fill="none"/>';
      }
    } else {
      const normalized = solids.map(p => ({...p, share: p.share / solids.reduce((s, q) => s + q.share, 0)}));
      cells.forEach((cell, i) => {
        const phase = choose(normalized, (i + .5) / cells.length);
        body += '<path d="' + polygon(cell.points) + '" fill="' + phase.color +
          '" stroke="' + (liquid ? liquid.color : '#faf5ec') + '" stroke-width="' + (liquid ? '7' : '1.5') + '"/>';
      });
      solids.slice(1).forEach(phase => {
        for (let i = 0; i < 14; i++) {
          const x = 45 + rand() * 530, y = 75 + rand() * 270;
          body += '<path d="M' + x + ' ' + y + 'l13 5-3 8-14-4Z" fill="' + phase.color + '" stroke="#fff8"/>';
        }
      });
    }
  }
  body += '</g><rect x="30" y="65" width="560" height="290" fill="none" stroke="#5c5143"/>';
  body += text(620, 68, 'Phasenanteile / ' + (state.basis === 'mass' ? 'Masse-%' : 'mol-%'), 15);
  phases.forEach((phase, i) => {
    const y = 102 + i * 43;
    body += line(620, y - 4, 643, y - 4, phase.color, 9) + text(652, y, phase.name, 14);
    body += text(865, y + 18, fmt(phase.share * 100) + ' %', 14, 'end');
  });
  if(eutectic){
    const y=110+phases.length*43;
    body+=text(620,y,'Erstarrungsbestandteile ≈',13);
    body+=text(620,y+25,'Primärkristalle',12)+text(865,y+25,fmt(eutectic.primary*100)+' %',12,'end');
    body+=text(620,y+48,'Eutektisches Gemisch',12)+text(865,y+48,fmt(eutectic.eutectic*100)+' %',12,'end');
    body+=text(620,y+71,'Bilanz am Erstarrungsende',11);
  }
  body += text(30, 385, 'Schematische Formen ohne Längenmaßstab · Farben kennzeichnen Phasen', 13);
  body += text(30, 409, 'Formen und Bildflächen sind Anschauungsbeispiele; Mengenwerte stehen rechts.', 12);
  body += text(30, 431, 'Korngröße, Lamellenabstand und reale räumliche Verteilung sind nicht berechnet.', 12);
  return svg(body, 900, Math.max(450, 130 + phases.length * 43), 'Schematisches mögliches Gefüge mit berechneten Phasenanteilen');
}
