import {displayedSolidus,displayedBinaryLiquidus} from './solidus-display.js';
import {smoothFieldBoundaries} from './smooth-fields.js';
import { boundaryFromSeries, surfaceTemperature } from './boundary.js';
import { elementSymbol } from './symbols.js';
import { bandTracks, phaseBands, smoothGraph, ribbonPath } from './geometry.js';
import { fieldColor, liquidColor, display, fmt, line, text, svg, pointColors } from './render.js';

const prepared=new WeakMap();
export function prepareSection(state){
 const cached=prepared.get(state.columns);
 if(cached&&cached.surface===state.surface)return cached.columns;
 const overview=state.model.diagramModel?state.columns.map((column,i)=>column.series.map((sample,j)=>{
  if(sample.unavailable)return sample;
  const kind=s=>s.liquid>1-(s.phaseTolerance??1e-7)?2:s.liquid>(s.phaseTolerance??1e-7)?1:0,votes=new Map();
  for(let k=Math.max(0,i-4);k<=Math.min(state.columns.length-1,i+4);k++){
   const s=state.columns[k].series[j];if(!s.unavailable&&kind(s)===kind(sample))votes.set(s.signature,(votes.get(s.signature)||0)+1);
  }
  const signature=[...votes].sort((a,b)=>b[1]-a[1])[0]?.[0]||sample.signature;
  return {...sample,signature};
 })):null;
 const columns=state.columns.map((column,i)=>{
  const bands=phaseBands(overview?.[i]||column.series),roots={liquidus:boundaryFromSeries(column.series,'liquidus'),solidus:boundaryFromSeries(column.series,'solidus')};
  if(!state.binary&&state.surface&&roots.liquidus.length===1){
   const t=surfaceTemperature(state.surface,column.x),root=roots.liquidus[0];
   if(t!==null){
    root.temperature=t;
    for(const band of bands)if(!band.allLiquid){band.lower=Math.min(band.lower,t);band.upper=Math.min(band.upper,t)}
    for(let j=0;j<bands.length-1;j++)if(bands[j].allLiquid!==bands[j+1].allLiquid){bands[j].upper=t;bands[j+1].lower=t}
   }
  }
  if(state.binary&&roots.liquidus.length===1){
   const t=displayedBinaryLiquidus(state.model,column.x);
   if(Number.isFinite(t))roots.liquidus[0].temperature=t;
  }
  if(state.model.solidusDisplay&&roots.solidus.length===1){
   const t=displayedSolidus(state.model,column.x,roots.solidus[0],column.series);
   if(Number.isFinite(t))roots.solidus[0].temperature=Math.min(t,roots.liquidus[0]?.temperature??Infinity);
  }
  if(roots.liquidus.length===1)for(let j=0;j<bands.length-1;j++)if(bands[j].allLiquid!==bands[j+1].allLiquid){bands[j].upper=roots.liquidus[0].temperature;bands[j+1].lower=roots.liquidus[0].temperature}
  return {...column,bands,rawBands:bands.map(b=>({...b})),boundaries:roots};
 });
 smoothFieldBoundaries(columns);
 prepared.set(state.columns,{surface:state.surface,columns});return columns;
}
export function sectionChart(state) {
  const { model } = state;
  const columns=prepareSection(state);
  const [low, high] = state.window;
  const X = fraction => 65 + 790 * fraction;
  const Y = temperature => 410 - 350 * (temperature - low) / (high - low);
  const tracks = bandTracks(columns);
  const count = columns.length - 1;
  const legend = new Set();
  let body = text(65, 23, 'S₁–S₂ · ' + (state.style === 'fields' ? 'Phasenfelder' : 'Schmelzanteil'), 18);
  body += '<defs><clipPath id="sectionClip"><rect x="65" y="60" width="790" height="350"/></clipPath></defs>';
  body += '<g clip-path="url(#sectionClip)">';
  if (state.style === 'liquid') {
    columns.forEach((column, i) => {
      const left = X(Math.max(0, (i - .5) / count));
      column.series.forEach((sample, j) => {
        const top = Y((model.T[j] + (model.T[j + 1] ?? model.T[j])) / 2);
        const bottom = Y((model.T[j] + (model.T[j - 1] ?? model.T[j])) / 2);
        const liquid = state.basis === 'mass'
          ? sample.phases?.filter(p => p.raw === 'LIQUID').reduce((sum, p) => sum + p.mass, 0) || 0
          : sample.liquid || 0;
        body += '<rect x="' + left + '" y="' + top + '" width="' + (790 / count + .1) +
          '" height="' + Math.max(.01, bottom - top + .1) + '" fill="' + liquidColor(liquid) + '"/>';
      });
    });
  }
  const labels = new Map();
  for (const track of tracks) {
    const signature = track[0].signature;
    legend.add(signature);
    const samples = track.map(band => [X(band.position), Y(band.upper), Y(band.lower)]);
    const first = samples[0], last = samples.at(-1);
    const points = [[Math.max(65, first[0] - 395 / count), first[1], first[2]], ...samples,
      [Math.min(855, last[0] + 395 / count), last[1], last[2]]];
    // Repeated boundary endpoints would have zero interpolation width.
    const distinct = points.filter((p, i) => i === 0 || p[0] > points[i - 1][0] + 1e-8);
    const shape = ribbonPath(distinct);
    body += '<path data-phase-field="' + signature + '" d="' + shape + '" fill="' +
      (state.style === 'fields' ? fieldColor(signature) : 'none') + '" stroke="#7b7165" stroke-width=".75"/>';
    const visible = samples.filter(p => p[1] < 410 && p[2] > 60);
    const textWidth = signature.length * 6.6 + 12;
    visible.forEach((candidate, index) => {
      const top = Math.max(60, candidate[1]), bottom = Math.min(410, candidate[2]);
      const y = (top + bottom) / 2, height = bottom - top;
      if (height < 28) return;
      let left = index, right = index;
      const fits = p => p[1] + 9 < y && p[2] - 9 > y;
      while (left > 0 && fits(visible[left - 1])) left--;
      while (right < visible.length - 1 && fits(visible[right + 1])) right++;
      const width = visible[right][0] - visible[left][0];
      if (width < textWidth) return;
      const x = (visible[left][0] + visible[right][0]) / 2, area = width * height;
      if (!labels.has(signature) || labels.get(signature).area < area) {
        labels.set(signature, { x, y, area });
      }
    });
  }
  for (const kind of ['liquidus', 'solidus']) {
    const branches = [];
    columns.forEach((column, index) => {
      const candidates=column.boundaries[kind].map(root=>root.temperature);
      candidates.forEach((temperature, branch) => {
        if (!branches[branch]) branches[branch] = [];
        branches[branch].push([X(index / count), Y(temperature), index]);
      });
    });
    for (const branch of branches) {
      let segment = [];
      function paint() {
        if (segment.length) body += '<path data-boundary="' + kind + '" d="' +
          smoothGraph(segment.map(p => p.slice(0, 2))) + '" fill="none" stroke="' +
          (kind === 'liquidus' ? '#b62c32' : '#176657') + '" stroke-width="3"/>';
        segment = [];
      }
      for (const point of branch) {
        if (segment.length && point[2] !== segment.at(-1)[2] + 1) paint();
        segment.push(point);
      }
      paint();
    }
  }
  if (state.supportPoints) {
    columns.forEach((column, i) => {
      column.rawBands.slice(1).forEach(band => {
        body += '<circle cx="' + X(i / count) + '" cy="' + Y(band.lower) + '" r="1.8" fill="#44392d"/>';
      });
    });
  }
  for (const [signature, position] of labels) {
    body += '<g style="paint-order:stroke;stroke:white;stroke-width:4px;stroke-linejoin:round">' +
      text(position.x, position.y, signature, 13, 'middle') + '</g>';
  }
  body += line(65, Y(model.T[state.ti]), 855, Y(model.T[state.ti]), '#252525', 1.5, '5 4');
  state.lambdas.forEach((fraction, i) => {
    body+='<g data-point="'+i+'" style="cursor:ew-resize">';
    body+=line(X(fraction),60,X(fraction),410,'transparent',18);
    body+=line(X(fraction),60,X(fraction),410,pointColors[i],i===state.selected?3:1.5);
    body+=text(X(fraction),52,'X'+(i+1),14,'middle',pointColors[i])+'</g>';
  });
  for(const [fraction,label,index] of [[0,'S₁',state.lambdas.length],[1,'S₂',state.lambdas.length+1]]){
    body+=line(X(fraction),60,X(fraction),410,pointColors[index],index===state.selected?4:1.5);
    body+=text(X(fraction),43,label,14,'middle',pointColors[index]);
  }
  body += '</g>';
  state.lambdas.forEach((f,i)=>{body+='<g data-point="'+i+'" style="cursor:ew-resize">'+text(X(f),53,'X'+(i+1),14,'middle',pointColors[i])+'</g>'});
  for (let i = 0; i <= 5; i++) {
    const temperature = low + (high - low) * i / 5;
    body += text(58, Y(temperature) + 4, fmt(temperature, 0), 13, 'end');
    body += line(65, Y(temperature), 855, Y(temperature), '#8e8375', .35);
    const value = state.binary ? display(columns[Math.round(count * i / 5)].x, state)[0] * 100 : i * 20;
    body += text(X(i / 5), 435, fmt(value, 0), 14, 'middle');
  }
  body += text(12, 42, 'T / °C', 14);
  const component = state.model.components[0];
  const symbol = elementSymbol(component);
  body += text(460, 463, state.binary ? symbol + ' / ' + (state.basis === 'mass' ? 'Masse-%' : 'mol-%') :
    'Position entlang S₁–S₂ / %', 15, 'middle');
  body += text(460, 490, 'Gemeinsame glatte Grenzkurven · Konturstützstellen und numerische Intervalle bleiben einblendbar', 12, 'middle');
  return {image: svg(body, 900, 505, 'Gehaltsschnitt mit glatten Phasenfeldgrenzen'), legend: [...legend]};
}