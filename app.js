import {preset,validate,index,KEYS,VERSION,REFERENCE,referenceHV,clamp} from './materials.js';
import {FIGURES,render,timeLabel} from './render.js';
import {figureHeight,TIME_FIGURES} from './time-axis.js';
import {METRICS,RUN_COLORS,probe,pickField,metricValue,atTime,projectParameters} from './analysis.js';
import {mountTimelineDock} from './timeline-dock.js';
const $=id=>document.getElementById(id);
let result=null,frame=0,worker=null,pendingReject=null,timer=null,stages=preset(),comparisons=[],large='thermal',generation=0,recording=false,exportMenu;
const dock=mountTimelineDock($('timeline'));
const options=()=>({
 x:Number($('probe-x').value)/100,y:Number($('probe-y').value)/100,field:$('field-view').value,timeScale:$('time-scale').value,
 referenceTime:Number($('reference-time').value),profileMetric:$('profile-metric').value,
 compareMetric:$('compare-metric').value,compareLocation:$('compare-location').value,compareAxis:$('compare-axis').value,comparisons
});
function project(){return {shape:$('shape').value,initial:$('initial').value,size:Number($('size').value),height:Number($('height').value),stages:structuredClone(stages)};}
function stop(){if(timer)clearInterval(timer);timer=null;$('play').textContent='Wiedergabe';}
function cancelWorker(){
 const reject=pendingReject;pendingReject=null;worker?.terminate();worker=null;reject?.(new DOMException('Abgebrochen','AbortError'));
}
function invalidate(){
 generation++;stop();cancelWorker();result=null;frame=0;dock.setActive(false);$('timeline').hidden=true;
 $('run').disabled=false;$('cancel').hidden=true;$('csv').disabled=true;$('remember').disabled=true;
 $('status').textContent='Parameter geändert. Neu berechnen, um den Verlauf zu aktualisieren.';draw();exportMenu?.refresh();
}
function editStages(){
 $('stages').replaceChildren();
 stages.forEach((s,i)=>{
  const tr=document.createElement('tr');
  for(const [key,type,min,max] of [['label','text'],['target','number',0,550],['duration','number',1,1209600],['h','number',1,15000]]){
   const td=document.createElement('td'),input=document.createElement('input');input.type=type;input.value=s[key];input.setAttribute('aria-label','Schritt '+(i+1)+' · '+({label:'Bezeichnung',target:'Zieltemperatur in Grad Celsius',duration:'Dauer in Sekunden',h:'Wärmeübergang'}[key]));
   if(type==='number'){input.min=min;input.max=max;input.step='any';}
   input.addEventListener('input',()=>{s[key]=type==='number'?Number(input.value):input.value;$('preset').value='custom';invalidate();});td.append(input);tr.append(td);
  }
  const td=document.createElement('td'),select=document.createElement('select');select.add(new Option('Sprung','step'));select.add(new Option('Rampe','ramp'));select.value=s.mode;select.setAttribute('aria-label','Schritt '+(i+1)+' · Mediumverlauf');select.onchange=()=>{s.mode=select.value;$('preset').value='custom';invalidate();};td.append(select);tr.append(td);
  const cell=document.createElement('td'),button=document.createElement('button');button.textContent='×';button.setAttribute('aria-label','Schritt '+(i+1)+' entfernen');button.onclick=()=>{stages.splice(i,1);$('preset').value='custom';editStages();invalidate();};cell.append(button);tr.append(cell);$('stages').append(tr);
 });
}
function metricOptions(){return Object.entries(METRICS).map(([id,m])=>'<option value="'+id+'">'+m.label+' ['+m.unit+']</option>').join('');}
for(const [id,title] of FIGURES){
 const section=document.createElement('section');section.className='figure';
 const head=document.createElement('div');head.className='figure-head';const h=document.createElement('h3');h.textContent=title;const b=document.createElement('button');b.textContent='Vergrößern';b.setAttribute('aria-label',title+' vergrößern');b.onclick=()=>{large=id;$('figure-dialog').showModal();dock.setHost($('figure-dialog'));draw();};head.append(h,b);section.append(head);
 if(id==='comparison'){
  const controls=document.createElement('div');controls.className='display-controls';
  controls.innerHTML='<label>Vergleichsgröße<select id="compare-metric">'+metricOptions()+'</select></label><label>Auswerteort<select id="compare-location"><option value="mean">Volumenmittel</option><option value="core">Kern</option><option value="edge">Rand / Ecke</option><option value="probe">Gleiche relative Position</option></select></label><label>Zeitachse<select id="compare-axis"><option value="absolute">Reale Prozesszeit [h]</option><option value="relative">Relativer Fortschritt [%]</option></select></label>';
  section.append(controls);const hint=document.createElement('p');hint.className='hint';hint.textContent='Bis zu vier gespeicherte Prozesse und der aktuelle Verlauf. Namen, Farben und Linienmuster unterscheiden die Kurven. Relativer Fortschritt setzt unterschiedlich lange Prozesse gleich; reale Zeiten bleiben in der Tabelle ablesbar. Keine Fortsetzung über das Prozessende.';section.append(hint);
 }
 if(id==='profile'){
  const control=document.createElement('label');control.textContent='Profilgröße';const select=document.createElement('select');select.id='profile-metric';select.innerHTML=metricOptions();control.append(select);section.append(control);
  const hint=document.createElement('p');hint.className='hint';hint.textContent='Profil entlang der gestrichelten Schnittlinie, von der Symmetriemitte bis zur Randzelle. Anklicken, mit Touch ziehen oder Pfeiltasten benutzen. Linien verbinden Zellmitten; Rand- und Symmetrieflächen werden nicht extrapoliert.';section.append(hint);
 }
 const canvas=document.createElement('canvas');canvas.id=id;canvas.width=1000;canvas.height=560;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',title+' · Daten im Ablesetext und CSV');
 if(['field','profile'].includes(id)){canvas.tabIndex=0;canvas.setAttribute('aria-describedby','probe-help');canvas.classList.add('interactive-canvas');}
 section.append(canvas);$('figures').append(section);
}
$('compare-metric').value='index';$('profile-metric').value='temperature';
function paint(canvas,id,opt){const height=figureHeight(id,opt);if(canvas.height!==height)canvas.height=height;render(canvas.getContext('2d'),id,result,frame,opt);if(TIME_FIGURES.includes(id))canvas.setAttribute('aria-label',(id==='reference'?'Literaturreferenz':FIGURES.find(entry=>entry[0]===id)[1])+' · '+(height===720?'Logarithmische Zeitachsen in Sekunden, Minuten und Stunden; Start bei 0 Sekunden separat':'Lineare Achse'));}
function draw(){
 $('compare-csv').disabled=!result&&!comparisons.length;
 const opt=options();for(const [id] of FIGURES)paint($(id),id,opt);
 paint($('reference'),'reference',opt);
 const hv=referenceHV(opt.referenceTime);$('reference-readout').textContent=hv===null?'Referenzzeit zwischen 0 und 96 Stunden eingeben.':'Lineare Orientierung: '+hv.toFixed(2)+' HV 0,5 bei '+opt.referenceTime+' h; nur für diese Versuchsreihe.';
 $('time').value=frame;
 if(result){
  const f=result.frames[frame],point=probe(result,opt.x,opt.y),s=f.states[point.i];
  $('time-output').textContent=timeLabel(f.time)+' · '+f.label;$('time').setAttribute('aria-valuetext',timeLabel(f.time)+' · '+f.label);
  $('readout').textContent='Zellmitte x = '+point.xMM.toFixed(2)+' mm, y = '+point.yMM.toFixed(2)+' mm · '+f.temps[point.i].toFixed(1)+' °C · Index '+index(s).toFixed(1)+'/100 · '+KEYS.map(k=>({solute:'gelöst',clusters:'Cluster',fine:'fein',coarse:'grob'}[k])+': '+(100*s[k]).toFixed(1)+' %').join(' · ')+' · Reservoiranteile, keine Phasenanteile. Volumenmittel: Index '+f.meanIndex.toFixed(1)+'.';
 }else $('readout').textContent='Noch kein gültiger aktueller Verlauf. Gespeicherte Vergleichsprozesse bleiben erhalten.';
 updateComparisonValues();
 if($('figure-dialog').open)paint($('large-canvas'),large,opt);
}
function setFrame(value){if(!result)return;frame=Math.max(0,Math.min(result.frames.length-1,value));draw();}
function calculate(p){
 return new Promise((resolve,reject)=>{
  const job=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});worker=job;pendingReject=reject;
  const done=()=>{job.terminate();if(worker===job){worker=null;pendingReject=null;}};
  job.onerror=e=>{done();reject(Error(e.message));};
  job.onmessage=e=>{done();e.data.error?reject(Error(e.data.error)):resolve(e.data.result);};
  job.postMessage(p);
 });
}
function install(r){
 result=r;frame=r.frames.length-1;$('time').max=r.frames.length-1;$('timeline').hidden=false;dock.setActive(true);
 $('run').disabled=false;$('cancel').hidden=true;$('csv').disabled=false;$('remember').disabled=comparisons.length>=4;
 draw();exportMenu.refresh();
}
$('run').onclick=async()=>{
 let p;try{p=project();validate(p);}catch(e){invalidate();$('status').textContent=e.message;return;}
 invalidate();const ticket=generation;$('run').disabled=true;$('cancel').hidden=false;$('status').textContent='Wärmeleitung und Modellreservoirs werden lokal berechnet …';
 try{const r=await calculate(p);if(ticket!==generation)return;install(r);$('status').textContent='Berechnung abgeschlossen. Zeit und Ort wählen. Alle Aushärtungswerte sind Lehrmodell-Ergebnisse.';}
 catch(e){if(ticket===generation){invalidate();$('status').textContent='Berechnung fehlgeschlagen: '+e.message;}}
};
$('cancel').onclick=()=>{invalidate();$('status').textContent='Berechnung abgebrochen. Gespeicherte Prozesse bleiben erhalten.';};
$('preset').onchange=()=>{if($('preset').value==='custom')return;stages=preset($('preset').value);editStages();invalidate();};
$('add').onclick=()=>{if(stages.length>=16){$('status').textContent='Höchstens 16 Schritte.';return;}stages.push({label:'Eigener Schritt',target:175,duration:3600,h:100,mode:'step'});$('preset').value='custom';editStages();invalidate();};
for(const id of ['material','initial','shape','size','height'])$(id).addEventListener('input',()=>{syncGeometry();invalidate();});
function syncGeometry(){const rod=$('shape').value==='rod';$('height-label').hidden=rod;$('probe-y-label').hidden=rod;if(rod)$('probe-y').value=0;$('size-label').firstChild.textContent=rod?'Durchmesser [mm]':'Kantenlänge x [mm]';}
for(const id of ['time-scale','field-view','probe-x','probe-y','reference-time','profile-metric','compare-metric','compare-location','compare-axis'])$(id).addEventListener('input',draw);
$('time').oninput=()=>{stop();setFrame(Number($('time').value));};
$('first').onclick=()=>{stop();setFrame(0);};$('last').onclick=()=>{stop();if(result)setFrame(result.frames.length-1);};
$('play').onclick=()=>{if(timer){stop();return;}if(!result)return;if(frame===result.frames.length-1)frame=0;$('play').textContent='Pause';timer=setInterval(()=>{setFrame(frame+Number($('speed').value));if(frame===result.frames.length-1)stop();},90);};
$('close-dialog').onclick=()=>$('figure-dialog').close();$('figure-dialog').addEventListener('close',()=>dock.setHost(document.body));
function selectPoint(x,y){if(!result||recording)return;stop();$('probe-x').value=clamp(x)*100;$('probe-y').value=(result.ny>1?clamp(y):0)*100;draw();}
function wireCanvas(canvas,idProvider){
 const pick=e=>{
  const id=idProvider();if(!result||recording||!['field','profile'].includes(id))return false;
  const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*1000,y=(e.clientY-rect.top)/rect.height*canvas.height;
  const point=id==='field'?pickField(result,x,y):x>=85&&x<=950&&y>=108&&y<=438?{x:(x-85)/865,y:Number($('probe-y').value)/100}:null;
  if(!point)return false;selectPoint(point.x,point.y);return true;
 };
 canvas.addEventListener('pointerdown',e=>{if(pick(e)){e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);}});
 canvas.addEventListener('pointermove',e=>{if(canvas.hasPointerCapture(e.pointerId)&&e.buttons)pick(e);});
 canvas.addEventListener('keydown',e=>{
  if(!result||recording||!['field','profile'].includes(idProvider())||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();const p=probe(result,options().x,options().y),dx=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,dy=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
  selectPoint((clamp(p.ix+dx,0,result.nx-1)+.5)/result.nx,result.ny>1?(clamp(p.iy+dy,0,result.ny-1)+.5)/result.ny:0);
 });
}
wireCanvas($('field'),()=> 'field');wireCanvas($('profile'),()=> 'profile');$('large-canvas').tabIndex=0;wireCanvas($('large-canvas'),()=>large);
function updateComparisonValues(){
 const opt=options(),metric=METRICS[opt.compareMetric],t=result?.frames[frame].time,relative=opt.compareAxis==='relative';
 for(const [i,entry] of comparisons.entries()){
  const cell=$('comparisons').querySelector('[data-value="'+i+'"]');if(!cell)continue;
  if(t===undefined){cell.textContent='Ohne aktuelle Zeitmarkierung';continue;}
  const at=relative?t/result.total*entry.result.total:t,val=atTime(entry.result,at,opt.compareMetric,opt.compareLocation,opt);
  cell.textContent=val===null?'Prozess bereits beendet':val.toFixed(2)+' '+metric.unit+' bei '+timeLabel(at);
 }
}
function applyParameters(p){for(const k of ['initial','shape','size','height'])$(k).value=p[k];stages=structuredClone(p.stages);$('preset').value='custom';editStages();syncGeometry();}
function compare(){
 $('comparisons').replaceChildren();$('remember').disabled=!result||comparisons.length>=4;
 if(!comparisons.length){$('comparisons').textContent='Noch kein Prozess gespeichert. Bis zu vier vollständige Verläufe bleiben hier im geöffneten Tab erhalten.';return;}
 const table=document.createElement('table'),head=document.createElement('tr');for(const t of ['Prozess / Parameter','Bei der Zeitmarkierung','Endindex Mittel','Aktionen']){const cell=document.createElement('th');cell.textContent=t;head.append(cell);}table.append(head);
 comparisons.forEach((entry,i)=>{
  const tr=document.createElement('tr'),name=document.createElement('td'),title=document.createElement('strong');title.textContent=entry.name;title.style.color=RUN_COLORS[i];name.append(title);
  const summary=document.createElement('p'),p=entry.result.parameters;summary.textContent=(p.shape==='rod'?'Rundstab Ø '+p.size:'Rechteck '+p.size+' × '+p.height)+' mm · '+timeLabel(entry.result.total);name.append(summary);
  const details=document.createElement('details'),ds=document.createElement('summary'),list=document.createElement('ol');ds.textContent='Gespeicherte Parameter';details.append(ds);
  const initial=document.createElement('p');initial.textContent='Ausgangszustand: '+(p.initial==='solution'?'übersättigt':'grobe lösliche Ausscheidungen')+' · EN AW-6082';details.append(initial);
  for(const s of p.stages){const li=document.createElement('li');li.textContent=s.label+': '+s.target+' °C, '+s.duration+' s, h = '+s.h+' W/(m² K), '+(s.mode==='step'?'Sprung':'Rampe');list.append(li);}details.append(list);name.append(details);tr.append(name);
  const val=document.createElement('td');val.dataset.value=i;tr.append(val);const end=document.createElement('td');end.textContent=entry.result.frames.at(-1).meanIndex.toFixed(2);tr.append(end);
  const actions=document.createElement('td'),show=document.createElement('button'),remove=document.createElement('button');show.textContent='Anzeigen';show.setAttribute('aria-label',entry.name+' als aktuellen Prozess anzeigen');
  show.onclick=()=>{invalidate();applyParameters(entry.result.parameters);install(entry.result);$('status').textContent='Gespeicherter Prozess angezeigt: '+entry.name;};
  remove.textContent='Entfernen';remove.setAttribute('aria-label',entry.name+' entfernen');remove.onclick=()=>{comparisons.splice(i,1);compare();draw();exportMenu.refresh();};actions.append(show,remove);tr.append(actions);table.append(tr);
 });$('comparisons').append(table);updateComparisonValues();
}
$('remember').onclick=()=>{
 if(!result||comparisons.length>=4)return;
 comparisons.push({name:$('comparison-name').value.trim().slice(0,60)||'Prozess '+(comparisons.length+1),result});
 $('comparison-name').value='';compare();draw();exportMenu.refresh();$('status').textContent='Vollständiger Prozess mit Parametern gespeichert. Bis zu vier Verläufe sind vergleichbar.';
};
$('clear-comparisons').onclick=()=>{comparisons=[];compare();draw();exportMenu.refresh();};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function saveFigure(id,type){
 if(type==='svg'){const ctx=new SvgContext(1000,figureHeight(id,options()));render(ctx,id,result,frame,options());download(new Blob([ctx.toSvg('Aluminium · '+id,'Aktueller Zustand; unkalibriertes Lehrmodell. Reservoiranteile sind keine Phasenanteile.')],{type:'image/svg+xml'}),'aluminium-'+id+'.svg');}
 else {const canvas=id==='reference'?$('reference'):$(id);await new Promise((resolve,reject)=>canvas.toBlob(blob=>{if(!blob){reject(Error('PNG konnte nicht erzeugt werden.'));return;}download(blob,'aluminium-'+id+'.png');resolve();},'image/png'));}
}
exportMenu=WDExports.mount({anchor:$('exports'),defaultItem:'field',items:[...FIGURES,['reference','Literaturreferenz · 175 °C']].map(([id,label])=>({
 id,label,enabled:()=>id==='reference'||!!result||(id==='comparison'&&comparisons.length>0),save:type=>saveFigure(id,type),
 ...(id!=='reference'?{videoReady:()=>!!result,video:()=>{stop();recording=true;const saved=frame;return {title:'Aluminium · '+label,color:'#513821',caption:()=>timeLabel(result.frames[frame].time)+' · unkalibriertes Lehrmodell',frame:fraction=>{setFrame(Math.round(fraction*(result.frames.length-1)));return $(id);},restore:()=>{recording=false;setFrame(saved);}};}}:{})
}))});
$('json').onclick=()=>{
 try{const p=project();validate(p);download(new Blob([JSON.stringify({schema:2,version:VERSION,parameters:p,comparisons:comparisons.map(e=>({name:e.name,parameters:e.result.parameters})),view:{...options(),comparisons:undefined},reference:{source:'https://doi.org/10.3390/met9020173',points:REFERENCE}},null,2)],{type:'application/json'}),'aluminium-projekt.json');}
 catch(e){$('status').textContent=e.message;}
};
$('import').onchange=async()=>{
 let ticket;
 try{
  const file=$('import').files[0];if(!file)return;if(file.size>25*1024*1024)throw Error('Projektdatei höchstens 25 MB.');
  const data=JSON.parse(await file.text()),plan=projectParameters(data);invalidate();ticket=generation;$('run').disabled=true;$('cancel').hidden=false;
  const loaded=[];for(const [i,entry] of plan.comparisons.entries()){
   $('status').textContent='Vergleichsprojekt wird lokal neu berechnet: '+(i+1)+' / '+plan.comparisons.length;
   const r=await calculate(entry.parameters);if(ticket!==generation)return;loaded.push({name:entry.name,result:r});
  }
  $('status').textContent='Aktueller Prozess wird lokal neu berechnet …';const r=await calculate(plan.parameters);if(ticket!==generation)return;
  comparisons=loaded;applyParameters(plan.parameters);
  const fields={timeScale:'time-scale',field:'field-view',profileMetric:'profile-metric',compareMetric:'compare-metric',compareLocation:'compare-location',compareAxis:'compare-axis'};
  if(data.view){for(const [key,id] of Object.entries(fields))if([...$(id).options].some(o=>o.value===data.view[key]))$(id).value=data.view[key];for(const [key,id] of [['x','probe-x'],['y','probe-y']])if(Number.isFinite(data.view[key]))$(id).value=clamp(data.view[key])*100;}
  compare();install(r);$('status').textContent='Projekt geladen und lokal neu berechnet. '+loaded.length+' Vergleichsprozesse wiederhergestellt.';
 }catch(e){if(e.name!=='AbortError'&&(ticket===undefined||ticket===generation)){if(ticket!==undefined)invalidate();$('status').textContent='Projekt nicht geladen: '+e.message;}}
 finally{$('import').value='';}
};
$('csv').onclick=()=>{
 if(!result)return;const rows=['# Unkalibriertes Lehrmodell; Reservoiranteile sind keine Phasenanteile; Version '+VERSION,'time_s;stage;x_mm;y_mm;temperature_C;solute_share;clusters_share;fine_share;coarse_share;index_0_100'];
 for(const f of result.frames)for(let i=0;i<result.grid.length;i++){const g=result.grid[i],s=f.states[i];rows.push([f.time,f.stageIndex+1,g.x*1000,(g.y||0)*1000,f.temps[i],...KEYS.map(k=>s[k]),index(s)].join(';'));}
 download(new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}),'aluminium-verlauf.csv');
};
$('compare-csv').onclick=()=>{
 const runs=[...comparisons,...(result?[{name:'Aktuell',result}]:[])];if(!runs.length)return;
 const opt=options(),rows=['# Vollstaendige Prozessverlaeufe; unkalibriertes Lehrmodell; Reservoirwerte in Prozent; keine Phasenanteile.','# Auswerteort: '+opt.compareLocation+'; relative_x='+opt.x+'; relative_y='+opt.y+'; relative Positionen beziehen sich je Prozess auf dessen eigene Geometrie.','run;name;time_s;progress_percent;shape;size_x_mm;size_y_mm;location;probe_x_mm;probe_y_mm;temperature_C;index_0_100;solute_percent;clusters_percent;fine_percent;coarse_percent'];
 runs.forEach((e,i)=>{for(const f of e.result.frames)rows.push([i+1,'"'+e.name.replace(/"/g,'""')+'"',f.time,100*f.time/e.result.total,e.result.parameters.shape,e.result.parameters.size,e.result.parameters.shape==='rod'?'':e.result.parameters.height,opt.compareLocation,opt.compareLocation==='mean'?'':probe(e.result,opt.compareLocation==='core'?0:opt.compareLocation==='edge'?1:opt.x,opt.compareLocation==='core'?0:opt.compareLocation==='edge'?1:opt.y).xMM,opt.compareLocation==='mean'?'':probe(e.result,opt.compareLocation==='core'?0:opt.compareLocation==='edge'?1:opt.x,opt.compareLocation==='core'?0:opt.compareLocation==='edge'?1:opt.y).yMM,...['temperature','index',...KEYS].map(k=>metricValue(e.result,f,k,opt.compareLocation,opt))].join(';'));});
 download(new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}),'aluminium-prozessvergleich.csv');
};
editStages();syncGeometry();compare();draw();
