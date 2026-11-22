import {preset,validate,index,KEYS,VERSION,REFERENCE,referenceHV} from './materials.js';
import {probeIndex} from './model.js';
import {FIGURES,render,timeLabel} from './render.js';
import {mountTimelineDock} from './timeline-dock.js';
const $=id=>document.getElementById(id);
let result=null,frame=0,worker=null,timer=null,stages=preset(),comparisons=[],large='thermal';
const dock=mountTimelineDock($('timeline'));
const options=()=>({x:Number($('probe-x').value)/100,y:Number($('probe-y').value)/100,field:$('field').value,referenceTime:Number($('reference-time').value)});
function project(){return {shape:$('shape').value,initial:$('initial').value,size:Number($('size').value),height:Number($('height').value),stages:structuredClone(stages)};}
function stop(){if(timer)clearInterval(timer);timer=null;$('play').textContent='Wiedergabe';}
function invalidate(){
 stop();worker?.terminate();worker=null;result=null;frame=0;dock.setActive(false);$('timeline').hidden=true;
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
   input.addEventListener('input',()=>{s[key]=type==='number'?Number(input.value):input.value;invalidate();});td.append(input);tr.append(td);
  }
  const td=document.createElement('td'),select=document.createElement('select');select.add(new Option('Sprung','step'));select.add(new Option('Rampe','ramp'));select.value=s.mode;select.setAttribute('aria-label','Schritt '+(i+1)+' · Mediumverlauf');select.onchange=()=>{s.mode=select.value;invalidate();};td.append(select);tr.append(td);
  const cell=document.createElement('td'),button=document.createElement('button');button.textContent='×';button.setAttribute('aria-label','Schritt '+(i+1)+' entfernen');button.onclick=()=>{stages.splice(i,1);editStages();invalidate();};cell.append(button);tr.append(cell);$('stages').append(tr);
 });
}
for(const [id,title] of FIGURES){
 const section=document.createElement('section');section.className='figure';
 const head=document.createElement('div');head.className='figure-head';const h=document.createElement('h3');h.textContent=title;const b=document.createElement('button');b.textContent='Vergrößern';b.setAttribute('aria-label',title+' vergrößern');b.onclick=()=>{large=id;$('figure-dialog').showModal();dock.setHost($('figure-dialog'));draw();};head.append(h,b);
 const canvas=document.createElement('canvas');canvas.id=id;canvas.width=1000;canvas.height=560;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',title+' · Daten im Ablesetext und CSV');section.append(head,canvas);$('figures').append(section);
}
function draw(){
 const opt=options();for(const [id] of FIGURES)render($(id).getContext('2d'),id,result,frame,opt);
 render($('reference').getContext('2d'),'reference',null,0,opt);
 const hv=referenceHV(opt.referenceTime);$('reference-readout').textContent=hv===null?'Referenzzeit zwischen 0 und 96 Stunden eingeben.':'Lineare Orientierung: '+hv.toFixed(2)+' HV 0,5 bei '+opt.referenceTime+' h; nur für diese Versuchsreihe.';
 $('time').value=frame;
 if(result){
  const f=result.frames[frame],p=probeIndex(result,opt.x,opt.y),s=f.states[p];
  $('time-output').textContent=timeLabel(f.time)+' · '+f.label;$('time').setAttribute('aria-valuetext',timeLabel(f.time)+' · '+f.label);
  $('readout').textContent='Gewählter Ort: '+f.temps[p].toFixed(1)+' °C · Index '+index(s).toFixed(1)+'/100 · '+KEYS.map(k=>({solute:'gelöst',clusters:'Cluster',fine:'fein',coarse:'grob'}[k])+': '+(100*s[k]).toFixed(1)+' %').join(' · ')+' · Reservoiranteile, keine Phasenanteile. Volumenmittel: Index '+f.meanIndex.toFixed(1)+'.';
 }else $('readout').textContent='Noch kein gültiger Verlauf. Prozess berechnen.';
 if($('figure-dialog').open)render($('large-canvas').getContext('2d'),large,result,frame,opt);
}
function setFrame(value){if(!result)return;frame=Math.max(0,Math.min(result.frames.length-1,value));draw();}
$('run').onclick=()=>{
 stop();let p;try{p=project();validate(p);}catch(e){invalidate();$('status').textContent=e.message;return;}
 worker?.terminate();result=null;dock.setActive(false);$('timeline').hidden=true;$('remember').disabled=true;$('csv').disabled=true;$('run').disabled=true;$('cancel').hidden=false;$('status').textContent='Wärmeleitung und Modellreservoirs werden lokal berechnet …';draw();
 worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
 const failure=message=>{worker?.terminate();worker=null;invalidate();$('status').textContent='Berechnung fehlgeschlagen: '+message;};
 worker.onerror=e=>failure(e.message);
 worker.onmessage=e=>{
  if(e.data.error){failure(e.data.error);return;}
  result=e.data.result;frame=result.frames.length-1;worker.terminate();worker=null;
  $('time').max=result.frames.length-1;$('timeline').hidden=false;dock.setActive(true);$('run').disabled=false;$('cancel').hidden=true;$('csv').disabled=false;$('remember').disabled=false;
  $('status').textContent='Berechnung abgeschlossen. Zeit und Ort wählen. Alle Aushärtungswerte sind Lehrmodell-Ergebnisse.';draw();exportMenu.refresh();
 };worker.postMessage(p);
};
$('cancel').onclick=()=>{invalidate();$('status').textContent='Berechnung abgebrochen.';};
$('preset').onchange=()=>{stages=preset($('preset').value);editStages();invalidate();};
$('add').onclick=()=>{if(stages.length>=16){$('status').textContent='Höchstens 16 Schritte.';return;}stages.push({label:'Eigener Schritt',target:175,duration:3600,h:100,mode:'step'});editStages();invalidate();};
for(const id of ['material','initial','shape','size','height'])$(id).addEventListener('input',()=>{syncGeometry();invalidate();});
function syncGeometry(){const rod=$('shape').value==='rod';$('height-label').hidden=rod;$('probe-y-label').hidden=rod;if(rod)$('probe-y').value=0;$('size-label').firstChild.textContent=rod?'Durchmesser [mm]':'Kantenlänge x [mm]';}
for(const id of ['field-view','probe-x','probe-y','reference-time'])$(id).addEventListener('input',draw);
$('time').oninput=()=>{stop();setFrame(Number($('time').value));};
$('first').onclick=()=>{stop();setFrame(0);};$('last').onclick=()=>{stop();setFrame(result.frames.length-1);};
$('play').onclick=()=>{if(timer){stop();return;}if(!result)return;if(frame===result.frames.length-1)frame=0;$('play').textContent='Pause';timer=setInterval(()=>{setFrame(frame+Number($('speed').value));if(frame===result.frames.length-1)stop();},90);};
$('close-dialog').onclick=()=>$('figure-dialog').close();$('figure-dialog').addEventListener('close',()=>dock.setHost(document.body));
function compare(){
 $('comparisons').replaceChildren();if(!comparisons.length)return;
 const table=document.createElement('table');const head=document.createElement('tr');for(const t of ['Vergleich','Dauer','Index Kern','Index Rand','Index Mittel']){const cell=document.createElement('th');cell.textContent=t;head.append(cell);}table.append(head);
 for(const row of comparisons){const tr=document.createElement('tr');for(const v of row){const td=document.createElement('td');td.textContent=v;tr.append(td);}table.append(tr);}$('comparisons').append(table);
}
$('remember').onclick=()=>{if(!result)return;if(comparisons.length>=4)comparisons.shift();const f=result.frames.at(-1);comparisons.push([$('preset').selectedOptions[0].textContent+' · '+result.parameters.size+' mm',timeLabel(result.total),index(f.states[0]).toFixed(1),index(f.states.at(-1)).toFixed(1),f.meanIndex.toFixed(1)]);compare();};
$('clear-comparisons').onclick=()=>{comparisons=[];compare();};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function overview(){const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=560;render(canvas.getContext('2d'),'field',result,frame,options());return canvas;}
async function saveFigure(id,type){
 if(type==='svg'){const ctx=new SvgContext(1000,560);render(ctx,id,result,frame,options());download(new Blob([ctx.toSvg('Aluminium · '+id,'Aktueller Zustand; unkalibriertes Lehrmodell. Reservoiranteile sind keine Phasenanteile.')],{type:'image/svg+xml'}),'aluminium-'+id+'.svg');}
 else {const canvas=id==='reference'?$('reference'):$(id);await new Promise((resolve,reject)=>canvas.toBlob(blob=>{if(!blob){reject(Error('PNG konnte nicht erzeugt werden.'));return;}download(blob,'aluminium-'+id+'.png');resolve();},'image/png'));}
}
let exportMenu=WDExports.mount({anchor:$('exports'),defaultItem:'field',items:[...FIGURES,['reference','Literaturreferenz · 175 °C']].map(([id,label])=>({
 id,label,enabled:()=>id==='reference'||!!result,save:type=>saveFigure(id,type),
 ...(id!=='reference'?{videoReady:()=>!!result,video:()=>{stop();const saved=frame;return {title:'Aluminium · '+label,color:'#513821',caption:()=>timeLabel(result.frames[frame].time)+' · unkalibriertes Lehrmodell',frame:fraction=>{setFrame(Math.round(fraction*(result.frames.length-1)));return $(id);},restore:()=>setFrame(saved)};}}:{})
}))});
$('json').onclick=()=>{try{const p=project();validate(p);download(new Blob([JSON.stringify({schema:1,version:VERSION,parameters:p,reference:{source:'https://doi.org/10.3390/met9020173',points:REFERENCE},result},null,2)],{type:'application/json'}),'aluminium-projekt.json');}catch(e){$('status').textContent=e.message;}};
$('import').onchange=async()=>{
 try{const file=$('import').files[0];if(!file)return;if(file.size>25*1024*1024)throw Error('Projektdatei höchstens 25 MB.');const data=JSON.parse(await file.text());if(data.schema!==1)throw Error('Unbekanntes Projektformat.');validate(data.parameters);const p=data.parameters;invalidate();for(const k of ['initial','shape','size','height'])$(k).value=p[k];stages=structuredClone(p.stages);editStages();syncGeometry();$('status').textContent='Projektparameter geladen. Bitte neu berechnen; gespeicherte Ergebnisse werden nicht ungeprüft übernommen.';}catch(e){$('status').textContent='Projekt nicht geladen: '+e.message;}finally{$('import').value='';}
};
$('csv').onclick=()=>{
 if(!result)return;const rows=['# Unkalibriertes Lehrmodell; Reservoiranteile sind keine Phasenanteile; Version '+VERSION,'time_s;stage;x_mm;y_mm;temperature_C;solute_share;clusters_share;fine_share;coarse_share;index_0_100'];
 for(const f of result.frames)for(let i=0;i<result.grid.length;i++){const g=result.grid[i],s=f.states[i];rows.push([f.time,f.stageIndex+1,g.x*1000,(g.y||0)*1000,f.temps[i],...KEYS.map(k=>s[k]),index(s)].join(';'));}
 download(new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}),'aluminium-verlauf.csv');
};
editStages();syncGeometry();draw();


