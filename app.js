import {defaults, simulate, series} from './model.js';
import {drawScene, drawPlot, saveSvgView, num, clock} from './graphics.js';
import {mountTimelineDock} from './timeline-dock.js';

const ui = id => document.getElementById(id);
const form=ui('settings'), plot=ui('plot'), scene=ui('scene'), time=ui('time'), controls=ui('transport');
const dock=mountTimelineDock(controls);
let model, position=0, playback=0, marker=null, recording=false, exportsPanel;
const layoutWidth=()=>Math.max(265,Math.round(scene.parentElement.clientWidth));
function draw() {
  if (!model) return;
  const width=layoutWidth();
  drawScene(scene,model,position,width);
  drawPlot(plot,model,position,width);
  const stamp=clock(position)+' min';
  time.value=Math.round(position*60); time.setAttribute('aria-valuetext',stamp);
  ui('clock').textContent=stamp; ui('stamp').textContent=stamp;
}
function pause() {
  cancelAnimationFrame(playback); playback=0; ui('play').textContent='Start';
}
function play() {
  if(!model || recording) return;
  if(position>=model.end) position=0;
  let last=performance.now();
  ui('play').textContent='Pause';
  const advance=now=>{
    position=Math.min(model.end,position+(now-last)*Number(ui('speed').value)/60000);
    last=now; draw();
    if(position>=model.end) pause(); else playback=requestAnimationFrame(advance);
  };
  playback=requestAnimationFrame(advance);
}
function readForm() {
  return Object.fromEntries(Object.keys(defaults).map(key=>[key,ui(key).type==='number'?ui(key).valueAsNumber:ui(key).value]));
}
function calculate() {
  if(recording) return;
  pause();
  const s=readForm();
  const issue=[...form.elements].find(el=>el.validity && !el.validity.valid);
  const error=issue ? 'Bitte prüfe „'+issue.labels[0].textContent+'“. Erlaubt sind '+issue.min+' bis '+issue.max+' in Schritten von '+issue.step+'.' :
    s.volume+s.dose>s.size ? 'Getränk und Zugabe überschreiten zusammen das Fassungsvermögen.' : '';
  ui('invalid').hidden=!error; ui('invalid').textContent=error;
  if(error){
    model=null; marker=null; dock.setActive(false); controls.hidden=true;
    scene.replaceChildren(); plot.replaceChildren(); ui('stamp').textContent='';
    ui('verdict').textContent=error; ui('targets').textContent=''; exportsPanel?.refresh(); return;
  }
  const end=Math.max(30,5*Math.ceil(Math.max(s.first,s.second,s.drink)/5));
  const curves=[simulate(s,s.first),simulate(s,s.second)];
  model={s,end,curves,paths:curves.map(c=>series(c,end))};
  time.max=end*60; position=Math.min(position,end);
  controls.hidden=false; dock.setActive(true);
  const diff=curves[0].at(s.drink)-curves[1].at(s.drink);
  const result=Math.abs(diff)<0.05?'der Unterschied beträgt weniger als 0,05 °C.':
    'Tasse '+(diff>0?'A':'B')+' ist um '+num(Math.abs(diff))+' °C wärmer.';
  const pending=s.dose>0 ? curves.filter(c=>s.drink<c.add).length : 0;
  const readings=curves.map((c,i)=>(i?'B':'A')+' '+num(c.at(s.drink))+' °C').join(' · ');
  ui('verdict').textContent='Beim ersten Schluck ('+clock(s.drink)+' min): '+result+' '+readings+'.'+(pending?' Zu diesem Zeitpunkt steht '+(pending===2?'in beiden Tassen':'in einer Tasse')+' die Zugabe noch aus.':'');
  ui('targets').textContent='Fertige Mischung bei '+s.target+' °C oder kühler: '+curves.map((c,i)=>{
    const hit=c.targetTime(end);
    return (i?'B':'A')+' '+(hit===null?'innerhalb von '+end+' min nicht erreicht':'erstmals um '+clock(hit)+' min');
  }).join(' · ');
  draw(); exportsPanel?.refresh();
}
function reset() { for(const [key,value] of Object.entries(defaults)) ui(key).value=value; position=0; calculate(); }
form.addEventListener('submit',e=>e.preventDefault());
form.addEventListener('input',calculate); ui('reset').onclick=reset;
time.oninput=()=>{pause();position=Number(time.value)/60;draw();};
ui('play').onclick=()=>playback?pause():play();
ui('home').onclick=()=>{pause();position=0;draw();};
ui('end').onclick=()=>{pause();position=model.end;draw();};
function moveMarker(event) {
  if(!marker || !model || recording || event.pointerId!==marker.pointer) return;
  const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(plot.getScreenCTM().inverse());
  const v=Math.max(0,Math.min(60, Math.round((p.x-43)*marker.end/(marker.width-59)*10)/10));
  ui(marker.key).value=v; calculate();
}
plot.addEventListener('pointerdown',e=>{
  const key=e.target.closest('[data-handle]')?.dataset.handle;
  if(!key || !model || recording) return;
  e.preventDefault();marker={key,pointer:e.pointerId,end:model.end,width:plot.viewBox.baseVal.width};
  plot.setPointerCapture(e.pointerId);moveMarker(e);
});
plot.addEventListener('pointermove',moveMarker);
plot.addEventListener('lostpointercapture',()=>{marker=null;});
new ResizeObserver(()=>{if(!recording)draw();}).observe(scene.parentElement);
function item(id,label,svg,render) {
  return {id,label,enabled:()=>Boolean(model),save:type=>saveSvgView(svg,type,id),
    video:()=>{
      const wasPlaying=Boolean(playback), saved=position, width=layoutWidth();
      recording=true;pause();
      const frame=document.createElementNS('http://www.w3.org/2000/svg','svg');
      return {title:'Kaffee & Milch · '+label,color:'#4b3030',
        frame:fraction=>{position=fraction*model.end;draw();render(frame,model,position,width);return frame;},
        caption:()=>'Simulationszeit '+clock(position)+' min · vereinfachtes Wärmemodell',
        restore:()=>{recording=false;position=saved;draw();if(wasPlaying) play();}
      };
    }};
}
exportsPanel=WDExports.mount({anchor:ui('export'),items:[
  item('temperaturverlauf','Temperaturverlauf',plot,drawPlot),item('tassen','Tassenvergleich',scene,drawScene)
]});
reset();
