import { triangleAxes } from './axes.js';
import {toMass} from './equilibrium.js';
import {svg,text,line,fmt,trianglePoint,display,pointColors,compositionLabel} from './render.js';
const curves=[
 [[0,652],[.1,666],[.2,674],[.3,672],[.4,649],[.47,615],[.5,591],[.55,555],[.6,575]],
 [[0,155],[.11,132],[.2,184],[.3,220],[.4,248],[.425,243]],
 [[0,132],[.4,132]],[[.4,243],[.6,243]],
 [[.425,243],[.455,360],[.49,461],[.52,502],[.54,455],[.575,340],[.59,225],[.6,102]]
];
const measured=[[0,638],[.2,671],[.303,671],[.403,646],[.503,576],[.55,568],[.6,570],[0,150],[.2,158],[.2,119],[.303,117],[.303,215],[.403,249],[.503,246],[.55,247],[.6,247]];
export function saltSetup(){return {components:['NaCl','KCl','AlCl₃'],masses:[58.4428,74.5513,133.3405],T:[100,700]}}
export function saltRender(state,el){
 state.zoom='full';el('zoom').value='full';
 el('endpointA').parentElement.parentElement.hidden=true;
 el('applyCut').hidden=true;
 el('triangleMode').disabled=true;el('zoom').disabled=true;el('interval').disabled=true;el('ties').disabled=true;
 el('special').disabled=true;el('useSpecial').disabled=true;el('temperatureWindow').disabled=true;
 el('exactCompare').disabled=true;el('leftCompare').disabled=true;el('rightCompare').disabled=true;
 const comp=k=>[.6-k,k,.4];
 const xs=k=>display(comp(k),state)[1];
 const max=xs(.6),X=k=>65+790*xs(k)/max,Y=t=>410-350*(t-100)/600;
 let body=text(65,25,'NaCl–KCl–AlCl₃ · veröffentlichter Referenzschnitt',18);
 for(const [index,curve] of curves.entries())body+='<path d="'+curve.map(([x,t],i)=>(i?'L':'M')+X(x)+' '+Y(t)).join('')+'" fill="none" stroke="'+(index===0?'#b62c32':'#6e5540')+'" stroke-width="'+(index===0?3:1.8)+'"/>';
 for(const [k,t] of measured)body+='<circle cx="'+X(k)+'" cy="'+Y(t)+'" r="3" fill="#176657"/>';
 for(let i=0;i<=5;i++){
  body+=text(55,Y(100+120*i)+4,String(100+120*i),13,'end');
  body+=text(65+790*i/5,436,fmt(max*100*i/5,1),13,'middle');
 }

 state.points.slice(0,state.lambdas.length).forEach((x,i)=>{
  const px=X(x[1]);body+=line(px,60,px,410,pointColors[i],2)+text(px,50,'X'+(i+1),14,'middle',pointColors[i]);
 });
 body+=text(10,45,'T / °C')+text(460,467,'KCl / '+(state.basis==='mass'?'Masse-%':'mol-%')+' · AlCl₃ konstant 40 mol-%',14,'middle');
 el('plot').innerHTML=svg(body,900,490,'Experimentell untersuchter Salzschnitt');
 let triangle=text(65,25,'Salzreferenz · Lage des untersuchten Schnitts',18)+'<path d="M65 425L755 425L410 65Z" fill="#f3eadd" stroke="#5c4937"/>';
 triangle+=line(...trianglePoint(comp(0),state),...trianglePoint(comp(.6),state),'#6d451d',3);
 state.points.forEach((x,i)=>{const p=trianglePoint(x,state);triangle+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="'+pointColors[i]+'"/>'+text(p[0]+7,p[1]-7,'X'+(i+1),13)});
 triangle+=triangleAxes(state);
 el('triangle').innerHTML=svg(triangle,820,535,'Lage des Salzschnitts');
 el('legend').innerHTML='<span>Grüne Punkte · Versuchswerte</span><span>Rote Linie · abgelesener Liquidus</span><span>Braune Linien · weitere abgelesene Modellgrenzen</span>';
 el('cutDescription').textContent='Referenzschnitt aus ORNL/SPR-2021/2102, Abb. 6. 40 mol-% AlCl₃ und 1 bar. Die verbleibenden 60 mol-% verteilen sich auf NaCl und KCl.';
 el('resolution').textContent='Abgelesene Stützstellen mit linearer Verbindung. Robelin et al. (2004) liefert die Stoffdaten und Parameterquelle. Vollständige Isothermen, Phasenanteile und freie Salzschnitte benötigen noch die Umsetzung und Validierung des quasichemischen Modells.';
 el('snapStatus').textContent=state.points.map((x,i)=>(state.labels?.[i]||'X'+(i+1))+' · '+compositionLabel(x,state)).join(' | ');
}
