import { elementSymbol } from './symbols.js';
// Local lever-rule / barycentric balance on the sampled Gibbs-energy lower hull.
export const EPS = 1e-7;
export function normalize(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0 || values.some(value => value < 0)) throw Error('Ungültige Zusammensetzung');
  return values.map(value => value / total);
}
export function toMass(x, masses) { return normalize(x.map((value, i) => value * masses[i])); }
export function toMoles(w, masses) { return normalize(w.map((value, i) => value / masses[i])); }
export function interpolate(a, b, fraction) { return a.map((value, i) => value * (1 - fraction) + b[i] * fraction); }
export function nearest(values, target) {
  return values.reduce((best, value, i) => Math.abs(value - target) < Math.abs(values[best] - target) ? i : best, 0);
}
export function composition(model, vertex) {
  const coordinates = vertex.slice(1, model.components.length);
  return [...coordinates, Math.max(0, 1 - coordinates.reduce((a, b) => a + b, 0))];
}
export function phaseName(name) {
  return ({LIQUID:'L',FCC_A1:'α (kfz)',BCT_A5:'β-Sn',RHOMBO_A7:'Bi',RHOMBOHEDRAL_A7:'Bi',BCC_A2:'β (krz)',HCP_A3:'ζ (hdp)',
    AG3SN:'Ag₃Sn',CU6SN5:'Cu₆Sn₅',CU6SN5_L:'Cu₆Sn₅′',CU3SN:'Cu₃Sn',CU3SN_HT:'γ',DO3:'γ',EPSILON:'Ag₃Sn',CU41SN11:'Cu₄₁Sn₁₁',CU10SN3:'Cu₁₀Sn₃'})[name] || name;
}
function barycentric(a,b,c,x,y) {
  const determinant=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if (Math.abs(determinant)<1e-16) return null;
  const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/determinant;
  const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/determinant;
  return [u,v,1-u-v];
}
const indices = new WeakMap();
function indexFrame(model, frame) {
  if (indices.has(frame)) return indices.get(frame);
  const bins = Array.from({length:400}, () => []);
  if(model.components.length===3) {
    frame.faces.forEach((face,i)=>{
      const nodes=face.map(j=>frame.vertices[j]);
      const xs=nodes.map(n=>n[1]),ys=nodes.map(n=>n[2]);
      const loX=Math.max(0,Math.floor(Math.min(...xs)*20)), hiX=Math.min(19,Math.floor(Math.max(...xs)*20));
      const loY=Math.max(0,Math.floor(Math.min(...ys)*20)), hiY=Math.min(19,Math.floor(Math.max(...ys)*20));
      for(let y=loY;y<=hiY;y++) for(let x=loX;x<=hiX;x++) bins[y*20+x].push(i);
    });
  }
  indices.set(frame,bins);
  return bins;
}
export function solve(model, compositionValue, ti) {
  const frame=model.frames[ti], dimensionality=model.components.length-1;
  const x=compositionValue[0],y=compositionValue[1];
  const candidates=dimensionality===1 ? frame.faces.map((_,i)=>i) : indexFrame(model,frame)[Math.min(19,Math.floor(y*20))*20+Math.min(19,Math.floor(x*20))];
  let face, weights;
  for(const fi of candidates) {
    const nodes=frame.faces[fi].map(i=>frame.vertices[i]);
    if(dimensionality===1) {
      const denominator=nodes[1][1]-nodes[0][1];
      if(Math.abs(denominator)<1e-14)continue;
      const u=(x-nodes[0][1])/denominator;
      weights=[1-u,u];
    } else weights=barycentric(...nodes.map(n=>[n[1],n[2]]),x,y);
    if(weights && weights.every(w=>w>=-EPS&&w<=1+EPS)) {face=frame.faces[fi];break}
  }
  if(!face) return null;
  weights=normalize(weights.map(w=>Math.max(0,w)));
  const phases=[];
  let enthalpy=0;
  face.forEach((index,i)=>{
    const vertex=frame.vertices[index],cx=composition(model,vertex),amount=weights[i];
    enthalpy+=amount*vertex.at(-1);
    if(amount<EPS)return;
    const raw=model.phases[vertex[0]];
    // Nearby vertices of one solution phase represent the same physical phase.
    let group=phases.find(p=>p.raw===raw && Math.max(...cx.map((v,j)=>Math.abs(v-p.x[j])))<.08);
    if(!group){group={raw,name:phaseName(raw),fraction:0,x:cx.map(()=>0)};phases.push(group)}
    const old=group.fraction;
    group.fraction+=amount;
    group.x=group.x.map((v,j)=>(v*old+cx[j]*amount)/group.fraction);
  });
  for(const p of phases) {
    if(phases.filter(other=>other.raw===p.raw).length>1) p.name+=' ('+elementSymbol(model.components[p.x.indexOf(Math.max(...p.x))])+')';
    p.mass=p.fraction*p.x.reduce((sum,v,j)=>sum+v*model.masses[j],0);
  }
  const massSum=phases.reduce((s,p)=>s+p.mass,0);
  phases.forEach(p=>p.mass/=massSum);
  const liquid=phases.filter(p=>p.raw==='LIQUID').reduce((s,p)=>s+p.fraction,0);
  return {phases,liquid,enthalpy,signature:phases.map(p=>p.name).sort().join(' + '),face,weights};
}
export function profile(model,x) {
  return model.T.map((temperature,ti)=>({temperature, ...solve(model,x,ti)}));
}
export function thresholds(series) {
  const liquid=series.findIndex(s=>s.phases&&s.liquid>EPS);
  const all=series.findIndex(s=>s.phases&&s.liquid>1-EPS);
  const bracket=i=>i<0 ? null : [series[Math.max(0,i-1)].temperature,series[i].temperature];
  return {solidus:bracket(liquid), liquidus:bracket(all)};
}
export function transitions(series) {
  const events=[];
  for(let i=series.length-2;i>=0;i--){
    const above=series[i+1], below=series[i];
    if(!above.phases||!below.phases||above.signature===below.signature)continue;
    const amount=(sample,raw)=>sample.phases.filter(p=>p.raw===raw).reduce((sum,p)=>sum+p.fraction,0);
    const names=new Map([...above.phases,...below.phases].map(p=>[p.raw,p.name]));
    const left=[],right=[];
    for(const [raw,name] of names){
      const difference=amount(below,raw)-amount(above,raw);
      if(difference < -1e-5)left.push(name);
      if(difference > 1e-5)right.push(name);
    }
    const disappearing=above.phases.filter(p=>!below.phases.some(q=>q.raw===p.raw));
    const reaction=left.length&&right.length ? left.join(' + ')+' → '+right.join(' + ') : '';
    events.push({from:above.temperature,to:below.temperature,above:above.signature,below:below.signature,reaction,
      note:above.liquid>EPS&&below.liquid<=EPS?'Letzte Schmelze verbraucht':disappearing.length?'Verschwunden: '+disappearing.map(p=>p.name).join(', '):'Weitere Phase entsteht'});
  }
  return events;
}
export function contourSegments(nodes, triangles, level) {
  const segments=[];
  for(const triangle of triangles) {
    const crosses=[];
    for(let i=0;i<3;i++){
      const a=nodes[triangle[i]],b=nodes[triangle[(i+1)%3]];
      if(a.value===null||b.value===null||!Number.isFinite(a.value)||!Number.isFinite(b.value))continue;
      if((a.value<level)===(b.value<level))continue;
      const f=(level-a.value)/(b.value-a.value);
      crosses.push(interpolate(a.x,b.x,f));
    }
    if(crosses.length===2)segments.push(crosses);
  }
  return segments;
}
