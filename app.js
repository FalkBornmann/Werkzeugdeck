import { fractionsChart, fractionValues } from './fractions.js';
import { microstructureChart } from './microstructure.js';
import { sectionChart } from './section.js';
import { elementSymbol } from './symbols.js';
import {saltSetup,saltRender} from './salt.js';
import {normalize,toMass,toMoles,interpolate,nearest,solve,profile,thresholds,transitions,phaseName} from './equilibrium.js';
import {pointColors,fmt,escape,text,line,svg,display,compositionLabel,trianglePoint,triangleInverse,triangleChart,curvesChart,fieldColor} from './render.js';
const el=id=>document.getElementById(id);
const state={basis:'mole',style:'fields',zoom:'full',triangleMode:'projection',interval:50,ties:true,points:[],lambdas:[],selected:0,ti:0,model:null,columns:[],profiles:[],a:[0,0,1],b:[.08,.02,.9],surface:null,supportPoints:false,fractionMode:'curves',morphology:'auto'};
const worker=new Worker('./worker.js',{type:'module'}),pending=new Map();
let serial=0,loadId=0,sectionId=0,surfaceId=0,endpoint='a',specials=[],busy=true;
function request(type,extra={}){
 const id=++serial;
 return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});worker.postMessage({type,id,...extra})});
}
worker.onmessage=({data})=>{
 const callback=pending.get(data.id);if(!callback)return;
 pending.delete(data.id);
 if(data.type==='error')callback.reject(Error(data.message));else callback.resolve(data);
};
function status(message,error=false){el('status').textContent=message;el('status').classList.toggle('error',error)}
function fail(error){busy=false;status(error.message,true);el('dock').hidden=true}
function controlsEnabled(enabled){
 for(const control of document.querySelectorAll('#dock input,#dock button,#dock select,#add,#remove,#useSpecial,#applyCut'))control.disabled=!enabled;
}
function percentage(x){return fmt(x*100)+' %'}
function pointAt(f){return state.basis==='mass'?toMoles(interpolate(toMass(state.a,state.model.masses),toMass(state.b,state.model.masses),f),state.model.masses):interpolate(state.a,state.b,f)}
function currentComposition(){return state.points[state.selected]}
function endpointControls(){
 for(const [id,x] of [['endpointA',state.a],['endpointB',state.b]]){
  el(id).innerHTML=display(x,state).map((v,i)=>'<label>'+escape(elementSymbol(state.model.components[i]))+' / %<input type="number" min="0" max="100" step=".01" value="'+(v*100).toFixed(5)+'" data-component="'+i+'"></label>').join('');
 }
}
function fromDisplay(values){return state.basis==='mass'?toMoles(values,state.model.masses):normalize(values)}
function updateWindow(){
 const limits=[state.model.T[0],state.model.T.at(-1)];
 if(el('temperatureWindow').value==='solidification'){
  const t=thresholds(state.profiles[state.selected]);
  if(t.solidus&&t.liquidus){limits[0]=Math.max(limits[0],Math.floor(t.solidus[0]-20));limits[1]=Math.min(limits[1],Math.ceil(t.liquidus[1]+30))}
 }
 limits[0]=Math.min(limits[0],state.model.T[state.ti]);limits[1]=Math.max(limits[1],state.model.T[state.ti]);
 state.window=limits;
}
function chartState(){
 state.current=solve(state.model,currentComposition(),state.ti);
 updateWindow();
}
function temperatureState(){
 el('temperature').value=state.ti;el('temperatureNumber').value=state.model.T[state.ti];
 el('temperature').setAttribute('aria-valuetext',fmt(state.model.T[state.ti])+' Grad Celsius');
 el('currentT').textContent=fmt(state.model.T[state.ti])+' °C';
}
function updatePoints(){
 state.points=state.lambdas.map(pointAt);
 el('active').innerHTML=state.points.map((_,i)=>'<option value="'+i+'">X'+(i+1)+'</option>').join('');
 el('active').value=state.selected;
 el('position').value=state.lambdas[state.selected]*100;el('positionNumber').value=Number((state.lambdas[state.selected]*100).toFixed(4));
 el('add').disabled=state.points.length>=4||busy;el('remove').disabled=state.points.length<=1||busy;
}
function renderResults(){
 const basis=state.basis==='mass'?'Massenanteil':'Stoffmengenanteil';
 const range=b=>b ? (b[0]===b[1]?fmt(b[0]):fmt(b[0])+'–'+fmt(b[1]))+' °C' : 'außerhalb des Modellbereichs';
 el('results').innerHTML=state.points.map((x,i)=>{
  const current=solve(state.model,x,state.ti),limits=thresholds(state.profiles[i]);
  return '<article style="--point:'+pointColors[i]+'"><h3>X'+(i+1)+'</h3><p>'+escape(compositionLabel(x,state))+'</p><p><b>Anschmelzbeginn</b><br>'+range(limits.solidus)+'<br><b>Liquidus</b><br>'+range(limits.liquidus)+'</p><p>Bei '+fmt(state.model.T[state.ti])+' °C</p><table><thead><tr><th>Phase</th><th>'+basis+'</th></tr></thead><tbody>'+
   (current?.phases.map(p=>'<tr><td>'+escape(p.name)+'</td><td>'+percentage(state.basis==='mass'?p.mass:p.fraction)+'</td></tr>').join('')||'<tr><td>Datenlücke</td></tr>')+'</tbody></table>'+
   (current?.phases.length>1?'<details><summary>Zusammensetzung der Phasen</summary>'+current.phases.map(p=>'<p><b>'+escape(p.name)+'</b><br>'+escape(compositionLabel(p.x,state))+'</p>').join('')+'</details>':'')+'</article>';
 }).join('');
 el('reactions').innerHTML=state.profiles.map((series,i)=>{
  const events=transitions(series);
  return '<details'+(i===state.selected?' open':'')+'><summary>X'+(i+1)+' · Reaktionen und Phasenfolge</summary><table><thead><tr><th>Temperaturintervall</th><th>Phasenumwandlung beim Abkühlen</th><th>Ergebnis</th></tr></thead><tbody>'+
  events.map(e=>'<tr><td>'+fmt(e.to)+'–'+fmt(e.from)+' °C</td><td>'+escape(e.reaction||e.above+' → '+e.below)+'<br><small>'+escape(e.above)+' → '+escape(e.below)+'</small></td><td>'+escape(e.note)+'</td></tr>').join('')+'</tbody></table></details>';
 }).join('');
}
function render(){
 if(!state.model||busy)return;
 if(state.salt)return renderSalt();
 updatePoints();chartState();temperatureState();
 const result=sectionChart(state);
 el('plot').innerHTML=result.image;
 el('legend').innerHTML=result.legend.map(name=>'<span><i class="swatch" style="background:'+fieldColor(name)+'"></i>'+escape(name)+'</span>').join('');
 if(!state.binary)el('triangle').innerHTML=triangleChart(state);
 el('cool').innerHTML=curvesChart(state);el('fractions').innerHTML=fractionsChart(state);el('microstructure').innerHTML=microstructureChart(state);fractionReadout(state.ti);renderResults();
 el('resolution').textContent='Numerisches NIST-Gleichgewichtsmodell · '+fmt(state.model.pressure/100000,5)+' bar · '+state.model.T.length+' Temperaturstützstellen. Grenztemperaturen sind als Intervalle angegeben. Die Linien werden innerhalb der Stützintervalle formtreu interpoliert.';
 el('cutDescription').textContent=state.binary ? 'Vollständiger binärer Bereich mit beiden Reinstoffen. Die Zahlenachse zeigt '+elementSymbol(state.model.components[0])+' in '+(state.basis==='mass'?'Masse-%':'mol-%')+'.' : 'S₁: '+compositionLabel(state.a,state)+' → S₂: '+compositionLabel(state.b,state);
}

async function rebuildSection(){
 if(state.salt)return renderSalt();
 const id=++sectionId;busy=true;controlsEnabled(false);status('Freier Gehaltsschnitt wird lokal berechnet …');
 const answer=await request('section',{a:state.a,b:state.b,basis:state.basis});
 if(id!==sectionId)return;
 state.columns=answer.columns;
 state.points=state.lambdas.map(pointAt);
 state.profiles=state.points.map(x=>profile(state.model,x));
 busy=false;controlsEnabled(true);el('dock').hidden=false;
 status('Berechnung auf deinem Gerät abgeschlossen. Schnittendpunkte und Legierungspunkte sind frei wählbar.');
 render();
}
async function rebuildSurface(){
 if(state.binary||state.salt)return;
 const id=++surfaceId;
 const vertices=state.zoom==='full'?[[1,0,0],[0,1,0],[0,0,1]]:[[0,0,1],[.1,0,.9],[0,.1,.9]].map(x=>state.basis==='mass'?toMoles(x,state.model.masses):x);
 const answer=await request('surface',{vertices});
 if(id!==surfaceId)return;
 state.surface=answer;
 if(!busy)el('triangle').innerHTML=triangleChart(state);
}
function renderSalt(){saltRender(state,el);updatePoints();exporter?.refresh()}
function loadSalt(){state.model=saltSetup();state.binary=false;state.a=[.6,0,.4];state.b=[0,.6,.4];state.lambdas=[.3,.7];state.selected=0;busy=false;el('dock').hidden=true;el('coolingSection').hidden=true;el('fractionSection').hidden=true;el('microstructureSection').hidden=true;el('resultsSection').hidden=true;el('applyCut').disabled=true;el('useSpecial').disabled=true;el('special').innerHTML='<option>Referenzschnitt · keine freien Modelldaten</option>';el('temperatureWindow').disabled=true;controlsEnabled(true);status('ORNL-Referenzschnitt bei 40 mol-% AlCl₃ · 1 bar. Robelin et al. (2004) liefert die Parameterquelle; die freie Modellrechnung ist noch nicht umgesetzt und validiert.');renderSalt()}
function referencePoints(){
 const m=state.model;
 const mass=x=>toMoles(x,m.masses);
 if(state.binary){
  const pure=m.components.map((name,i)=>({name:'Reinstoff '+elementSymbol(name),x:m.components.map((_,j)=>i===j?1:0)}));
  if(el('system').value==='bisn')pure.push({name:'Eutektikum · NIST-Referenz 138,8 °C',x:mass([.4303,.5697])});
  else pure.push({name:'Eutektikum · NIST-Referenz 226,8 °C',x:mass([.9911,.0089])},{name:'Cu₆Sn₅ · peritektische Verbindung',x:[.455,.545]},{name:'Cu₃Sn · Verbindung',x:[.25,.75]},{name:'Peritektische Schmelze · NIST-Referenz 415 °C',x:mass([.8693,.1307])});
  return pure;
 }
 return [{name:'Ternäres Eutektikum · NIST-Referenz 215,9 °C',x:mass([.0373,.0085,.9542])},
  {name:'Ag₃Sn · Verbindung',x:[.75,0,.25]},{name:'Cu₆Sn₅ · Verbindung',x:[0,.545,.455]},
  ...m.components.map((name,i)=>({name:'Reinstoff '+elementSymbol(name),x:m.components.map((_,j)=>i===j?1:0)}))];
}
function projectOnCut(x){
 const a=display(state.a,state),b=display(state.b,state),p=display(x,state);
 const direction=b.map((v,i)=>v-a[i]),denominator=direction.reduce((s,v)=>s+v*v,0);
 const lambda=direction.reduce((s,v,i)=>s+v*(p[i]-a[i]),0)/denominator;
 const on=interpolate(a,b,lambda);
 return {lambda,distance:Math.sqrt(on.reduce((s,v,i)=>s+(v-p[i])**2,0))};
}
function setPoint(lambda,allowSnap=true){
 lambda=Math.max(0,Math.min(1,lambda));let target;
 if(allowSnap&&el('snap').checked){
  target=specials.map(s=>({...s,...projectOnCut(s.x)})).find(s=>s.distance<1e-6&&s.lambda>=0&&s.lambda<=1&&Math.abs(lambda-s.lambda)<.015);
  if(target)lambda=target.lambda;
 }
 state.lambdas[state.selected]=lambda;
 state.points=state.lambdas.map(pointAt);
 if(state.salt){renderSalt();return}
 state.profiles[state.selected]=profile(state.model,currentComposition());
 el('snapStatus').textContent=target?'Eingerastet · '+target.name:'';
 render();
}
function setSpecial(){
 const target=specials[Number(el('special').value)];if(!target)return;exactLambda=null;
 let p=projectOnCut(target.x);
 if(p.distance>1e-6||p.lambda<0||p.lambda>1){
  const direction=state.b.map((v,i)=>v-state.a[i]);
  let min=-Infinity,max=Infinity;
  direction.forEach((v,i)=>{if(v>1e-12)min=Math.max(min,-target.x[i]/v);if(v<-1e-12)max=Math.min(max,-target.x[i]/v)});
  if(!Number.isFinite(min)||!Number.isFinite(max)||max-min<1e-9)return;
  state.a=interpolate(target.x,target.x.map((v,i)=>v+direction[i]),min);
  state.b=interpolate(target.x,target.x.map((v,i)=>v+direction[i]),max);
  state.a=normalize(state.a.map(v=>Math.max(0,v)));state.b=normalize(state.b.map(v=>Math.max(0,v)));
  endpointControls();p=projectOnCut(target.x);
 }
 state.lambdas[state.selected]=Math.max(0,Math.min(1,p.lambda));
 el('snapStatus').textContent=target.name;
 rebuildSection().catch(fail);
}
async function loadSystem(){
 const id=++loadId;sectionId++;surfaceId++;busy=true;controlsEnabled(false);el('dock').hidden=true;
 for(const id of ['applyCut','chooseA','chooseB','triangleMode','zoom','interval','ties','special','useSpecial','exactCompare','leftCompare','rightCompare']){el(id).disabled=false;el(id).hidden=false}
 el('resultsSection').hidden=false;el('temperatureWindow').disabled=false;el('endpointA').parentElement.parentElement.hidden=false;
 const key=el('system').value;state.salt=key==='salt';state.surface=null;
 el('ternary').hidden=false;el('coolingSection').hidden=false;el('fractionSection').hidden=false;el('microstructureSection').hidden=false;
 if(state.salt){loadSalt();return}
 status('Gleichgewichtsmodell wird geladen und lokal entpackt …');
 const answer=await request('load',{key});
 if(id!==loadId)return;
 state.model=answer.model;state.binary=state.model.components.length===2;
 state.a=state.binary?[0,1]:[0,0,1];state.b=state.binary?[1,0]:[.08,.02,.9];
 state.lambdas=[.35,.65];exactLambda=null;state.selected=0;
 state.ti=nearest(state.model.T,state.binary?200:220);
 el('temperature').max=state.model.T.length-1;el('temperatureNumber').min=state.model.T[0];el('temperatureNumber').max=state.model.T.at(-1);el('ternary').hidden=state.binary;
 specials=referencePoints();el('special').innerHTML=specials.map((p,i)=>'<option value="'+i+'">'+escape(p.name)+'</option>').join('');
 el('useSpecial').textContent=state.binary?'Punkt wählen':'Schnitt durch Ziel legen';
 endpointControls();
 await rebuildSection();
 if(!state.binary)rebuildSurface().catch(fail);
}
el('system').onchange=()=>loadSystem().catch(fail);
el('basis').onchange=()=>{
 const oldPoints=state.points.slice();state.basis=el('basis').value;
 if(state.model&&!state.salt)state.lambdas=oldPoints.map(x=>projectOnCut(x).lambda);
 if(state.salt)return renderSalt();
 endpointControls();
 rebuildSection().catch(fail);if(!state.binary)rebuildSurface().catch(fail);
};
el('style').onchange=()=>{state.style=el('style').value;state.salt?renderSalt():render()};
el('zoom').onchange=()=>{state.zoom=el('zoom').value;rebuildSurface().catch(fail);if(!busy)render()};
el('triangleMode').onchange=()=>{state.triangleMode=el('triangleMode').value;if(!busy)render()};
el('interval').onchange=()=>{state.interval=Number(el('interval').value);if(!busy)render()};
el('ties').onchange=()=>{state.ties=el('ties').checked;if(!busy)render()};
el('chooseA').onclick=()=>{endpoint='a';el('chooseA').setAttribute('aria-pressed','true');el('chooseB').setAttribute('aria-pressed','false')};
el('chooseB').onclick=()=>{endpoint='b';el('chooseA').setAttribute('aria-pressed','false');el('chooseB').setAttribute('aria-pressed','true')};
el('applyCut').onclick=()=>{
 try{
  const read=id=>{const v=[...el(id).querySelectorAll('input')].map(n=>Number(n.value)/100);if(Math.abs(v.reduce((s,v)=>s+v,0)-1)>.00001)throw Error('Die Anteile jedes Endpunkts müssen zusammen 100 % ergeben.');return fromDisplay(v)};
  const a=read('endpointA'),b=read('endpointB');
  if(a.reduce((s,v,i)=>s+(v-b[i])**2,0)<1e-12)throw Error('Die Schnittendpunkte müssen verschieden sein.');
  state.a=a;state.b=b;el('cutError').textContent='';rebuildSection().catch(fail);
 }catch(error){el('cutError').textContent=error.message}
};
el('active').onchange=()=>{state.selected=Number(el('active').value);exactLambda=null;state.salt?renderSalt():render()};
el('add').onclick=()=>{
 if(state.lambdas.length>=4)return;state.lambdas.push(Math.min(1,state.lambdas[state.selected]+.05));state.selected=state.lambdas.length-1;setPoint(state.lambdas[state.selected],false);
};
el('remove').onclick=()=>{
 if(state.lambdas.length<=1)return;state.lambdas.splice(state.selected,1);state.profiles.splice(state.selected,1);state.selected=Math.min(state.selected,state.lambdas.length-1);setPoint(state.lambdas[state.selected],false);
};
el('position').oninput=e=>setPoint(Number(e.target.value)/100);
el('positionNumber').onchange=e=>{if(Number.isFinite(Number(e.target.value)))setPoint(Number(e.target.value)/100,false)};
el('useSpecial').onclick=setSpecial;
let exactLambda=null;
el('exactCompare').onclick=()=>{exactLambda??=state.lambdas[state.selected];setPoint(exactLambda,false)};
el('leftCompare').onclick=()=>{exactLambda??=state.lambdas[state.selected];setPoint(exactLambda-Number(el('offset').value)/100,false)};
el('rightCompare').onclick=()=>{exactLambda??=state.lambdas[state.selected];setPoint(exactLambda+Number(el('offset').value)/100,false)};
el('temperatureWindow').onchange=()=>render();
el('supportPoints').onchange=()=>{state.supportPoints=el('supportPoints').checked;render()};
el('fractionMode').onchange=()=>{state.fractionMode=el('fractionMode').value;render()};
el('morphology').onchange=()=>{state.morphology=el('morphology').value;render()};
el('temperatureNumber').onchange=()=>setTemperature(nearest(state.model.T,Number(el('temperatureNumber').value)));
function fractionReadout(index){
 const values=fractionValues(state,index);
 el('fractionReadout').innerHTML='<b>Ablesetemperatur '+fmt(state.model.T[index])+' °C</b><table><thead><tr><th>Phase</th><th>'+(state.basis==='mass'?'Massenanteil':'Stoffmengenanteil')+'</th></tr></thead><tbody>'+values.map(p=>'<tr><td style="color:'+p.color+'">'+escape(p.name)+'</td><td>'+fmt(p.value*100)+' %</td></tr>').join('')+'</tbody></table>';
}
function fractionIndex(event){const p=svgPoint(event,'fractions'),f=Math.max(0,Math.min(1,(p.x-70)/580));return nearest(state.model.T,state.window[1]-f*(state.window[1]-state.window[0]))}
el('fractions').onpointerdown=event=>{el('fractions').setPointerCapture(event.pointerId);setTemperature(fractionIndex(event))};
el('fractions').onpointermove=event=>{if(el('fractions').hasPointerCapture(event.pointerId))setTemperature(fractionIndex(event));else fractionReadout(fractionIndex(event))};
el('fractions').onpointerleave=()=>fractionReadout(state.ti);
function setTemperature(index){
 state.ti=Math.max(0,Math.min(state.model.T.length-1,index));render();
}
el('temperature').oninput=e=>setTemperature(Number(e.target.value));
function svgPoint(event,container){
 const chart=el(container).querySelector('svg');if(!chart)return null;
 const p=chart.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(chart.getScreenCTM().inverse());
}
let dragEndpoint=null,dragMoved=false;
el('triangle').onpointerdown=e=>{
 if(busy||state.salt)return;
 const p=svgPoint(e,'triangle');if(!p)return;
 dragEndpoint=[['a',state.a],['b',state.b]].find(([,x])=>{const q=trianglePoint(x,state);return Math.hypot(q[0]-p.x,q[1]-p.y)<18})?.[0]||endpoint;
 el('triangle').setPointerCapture(e.pointerId);dragMoved=false;
};
el('triangle').onpointermove=e=>{
 if(!dragEndpoint||!el('triangle').hasPointerCapture(e.pointerId))return;
 dragMoved=true;moveEndpoint(e);
};
function moveEndpoint(e){
 const p=svgPoint(e,'triangle');let d=triangleInverse(p.x,p.y,state);
 d=normalize(d.map(v=>Math.max(0,v)));
 let x=state.basis==='mass'?toMoles(d,state.model.masses):d;
 if(el('snap').checked){
  const match=specials.find(s=>{const p2=trianglePoint(s.x,state);return Math.hypot(p.x-p2[0],p.y-p2[1])<12});
  if(match)x=match.x;
 }
 const other=dragEndpoint==='a'?state.b:state.a;
 if(x.reduce((sum,v,i)=>sum+(v-other[i])**2,0)<1e-10)return;
 state[dragEndpoint]=x;state.points=state.lambdas.map(pointAt);
 endpointControls();el('triangle').innerHTML=triangleChart(state);
}
el('triangle').onpointerup=e=>{
 if(!dragEndpoint)return;moveEndpoint(e);dragEndpoint=null;rebuildSection().catch(fail);
};
el('triangle').onpointercancel=()=>{dragEndpoint=null};
el('plot').onpointerdown=e=>{if(busy)return;el('plot').setPointerCapture(e.pointerId);const p=svgPoint(e,'plot');setPoint((p.x-65)/790)};
el('plot').onpointermove=e=>{if(!busy&&el('plot').hasPointerCapture(e.pointerId)){const p=svgPoint(e,'plot');setPoint((p.x-65)/790)}};
async function saveGraphic(id,type){
 const source=el(id).querySelector('svg').cloneNode(true);
 const blob=new Blob([new XMLSerializer().serializeToString(source)],{type:'image/svg+xml'});
 let output=blob;
 if(type==='png'){
  const url=URL.createObjectURL(blob);
  try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=source.viewBox.baseVal.width*2;canvas.height=source.viewBox.baseVal.height*2;canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);output=await new Promise(r=>canvas.toBlob(r))}finally{URL.revokeObjectURL(url)}
 }
 const a=document.createElement('a');a.href=URL.createObjectURL(output);a.download='Legierungsatlas-'+id+'.'+type;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);
}
const exporter=WDExports.mount({anchor:el('exports'),defaultItem:'plot',items:['plot','triangle','cool','fractions','microstructure'].map((id,i)=>({
 id,label:['Gehaltsschnitt','Gehaltsdreieck','Abkühlverläufe','Phasenanteile','Gefügeskizze'][i],enabled:()=>!busy&&!!el(id).querySelector('svg')&&!el(id).closest('[hidden]'),save:type=>saveGraphic(id,type)
}))});
loadSystem().catch(fail);
