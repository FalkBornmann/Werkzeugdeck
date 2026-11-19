import { coolingChart } from './cooling.js';
const el = id => document.getElementById(id);
const number = n => Number(n.toFixed(2)).toLocaleString('de-DE');
const colors = ['#86460e','#3c4593','#9b2748','#096657'];
const liquidus = [[0,652],[.1,666],[.2,674],[.3,672],[.4,649],[.47,615],[.5,591],[.55,555],[.6,575]];
const saltLines = [liquidus, [[0,155],[.11,132],[.2,184],[.3,220],[.4,248],[.425,243]],[[0,132],[.4,132]],[[.4,243],[.6,243]],[[.425,243],[.455,360],[.49,461],[.52,502],[.54,455],[.575,340],[.59,225],[.6,102]]];
const measured = [[0,638],[.2,671],[.303,671],[.403,646],[.503,576],[.55,568],[.6,570],[0,150],[.2,158],[.2,119],[.303,117],[.303,215],[.403,249],[.503,246],[.55,247],[.6,247]];
const salt = {axes:[Array.from({length:61},(_,i)=>i/100)],T:[100,700],independent:['KCl']};
let data, points, selected, cut, request=0;
const isSalt = () => data===salt;
const title = () => el('system').selectedOptions[0].text;
const text = (x,y,s,size=15,anchor='start') => '<text x="'+x+'" y="'+y+'" font-size="'+size+'" text-anchor="'+anchor+'" fill="#382f25">'+s+'</text>';
const line = (x,y,u,v,color,width=1) => '<line x1="'+x+'" y1="'+y+'" x2="'+u+'" y2="'+v+'" stroke="'+color+'" stroke-width="'+width+'"/>';
const svg = (body,w,h) => '<svg class="chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+title()+'" font-family="system-ui"><rect width="100%" height="100%" fill="white"/>'+body+'</svg>';
const axis = () => data.axes[0];
const X = x => 64+690*(x-axis()[0])/(axis().at(-1)-axis()[0]);
const Y = t => 280-220*(t-data.T[0])/(data.T.at(-1)-data.T[0]);
const row = (i,t) => data.rows[(i*(data.axes[1]?.length||1)+cut)*data.T.length+t];
const pct = x => number(x*100)+' %';
function renderPlot(){
  let body=text(64,22,title(),18)+text(5,54,'T / °C');
  if(isSalt()){
    for(const curve of saltLines) body+='<polyline fill="none" stroke="#805938" stroke-width="2" points="'+curve.map(([x,t])=>X(x)+','+Y(t)).join(' ')+'"/>';
    for(const [x,t] of measured) body+='<circle cx="'+X(x)+'" cy="'+Y(t)+'" r="3" fill="#16685d"/>';
  }else{
    const ai=axis(), ts=data.T, liquid=data.phases.indexOf('LIQUID');
    for(let i=0;i<ai.length;i++){
      const left=X(i?(ai[i-1]+ai[i])/2:ai[i]),right=X(i+1<ai.length?(ai[i+1]+ai[i])/2:ai[i]);
      for(let t=0;t<ts.length;t++){
        const r=row(i,t), f=r.find(([p])=>p===liquid)?.[1]??0;
        const top=Y(t+1<ts.length?(ts[t+1]+ts[t])/2:ts[t]),bottom=Y(t?(ts[t-1]+ts[t])/2:ts[t]);
        const color=r.length?'rgb('+[0,1,2].map((_,k)=>Math.round([217,196,151][k]*(1-f)+[56,124,148][k]*f)).join(',')+')':'#999';
        body+='<rect x="'+left+'" y="'+top+'" width="'+(right-left+.05)+'" height="'+(bottom-top+.05)+'" fill="'+color+'"/>';
      }
    }
  }
  for(let k=0;k<=4;k++){
    const t=data.T[0]+(data.T.at(-1)-data.T[0])*k/4;
    body+=text(56,Y(t)+5,number(t),13,'end')+line(64,Y(t),754,Y(t),'#b5afa8',.55);
    const x=axis()[0]+(axis().at(-1)-axis()[0])*k/4;
    body+=text(X(x),303,number(x*100),14,'middle');
  }
  points.forEach((i,k)=>{body+=line(X(axis()[i]),50,X(axis()[i]),280,colors[k],k===selected?3:1.5)+text(X(axis()[i]),46,'X'+(k+1),14,'middle')});
  body+=text(409,330,data.independent[0]+' / mol-%',16,'middle');
  el('plot').innerHTML=svg(body,800,348);
}
function renderTriangle(){
  const tern=isSalt()||data.axes.length===2;
  el('view').options[2].disabled=!tern;
  if(!tern){el('triangle').innerHTML='';el('view').value='plot';return}
  const name=isSalt()?['NaCl','KCl','AlCl₃']:['Sn','Ag','Cu'];
  const xy=(x,y)=>[55+400*x+200*y,194-154*y];
  // For solder, enlarge the Sn corner; both axes share one scale.
  const scale=isSalt()?1:0.1;
  const y=isSalt()?.4:data.axes[1][cut];
  const maxX=isSalt()?.6:.06, a=xy(axis()[0]/scale,y/scale), b=xy(maxX/scale,y/scale);
  let body='<polygon points="55,194 455,194 255,40" fill="#f1e7da" stroke="#6a503a"/>'+line(...a,...b,'#985b23',3);
  body+=text(55,216,name[0],14,'middle')+text(455,216,isSalt()?name[1]:'10 mol-% Ag',14,'middle')+text(255,30,isSalt()?name[2]:'10 mol-% Cu',14,'middle');
  points.forEach((i,k)=>{const [x,v]=xy(axis()[i]/scale,y/scale);body+='<circle cx="'+x+'" cy="'+v+'" r="4" fill="'+colors[k]+'"/>'+text(x,v-8,'X'+(k+1),13,'middle')});
  el('triangle').innerHTML=svg(body,510,225);
}
function details(){
  el('position').value=points[selected];
  el('results').innerHTML=points.map((i,k)=>{
    const header='X'+(k+1)+' · '+pct(axis()[i])+' '+data.independent[0];
    if(isSalt()){
      const x=axis()[i],j=Math.max(1,liquidus.findIndex(p=>p[0]>=x)),[x0,t0]=liquidus[j-1],[x1,t1]=liquidus[j];
      return '<article><strong>'+header+'</strong> · Liquidus ca. '+Math.round(t0+(t1-t0)*(x-x0)/(x1-x0))+' °C</article>';
    }
    const t=Number(el('temp').value),r=row(i,t);
    const states=[];
    for(let j=data.T.length-1;j>=0;j--){
      const label=row(i,j).map(([p])=>data.phases[p]).sort().join(' + ')||'Datenlücke';
      if(states.at(-1)?.label!==label)states.push({label,t:data.T[j]});
    }
    return '<article><strong>'+header+' bei '+data.T[t]+' °C</strong><br>'+ (r.map(([p,f])=>data.phases[p]+' '+pct(f)).join(' · ')||'Datenlücke')+'<details><summary>Phasenfolge beim Abkühlen</summary>'+states.map(s=>s.t+' °C · '+s.label).join('<br>')+'</details></article>';
  }).join('');
}
function render(){
  renderTriangle();renderPlot();details();
  el('energy').hidden=isSalt();el('view').options[1].disabled=isSalt();
  if(isSalt()&&el('view').value==='cool')el('view').value='plot';
  el('cool').innerHTML=isSalt()?'':coolingChart(data,points,cut,colors);
  el('snap').hidden=!['bisn','sac'].includes(el('system').value);
}
function controls(){
  el('active').innerHTML=points.map((_,k)=>'<option>X'+(k+1)+'</option>').join('');
  el('active').selectedIndex=selected;el('add').disabled=points.length>=4;render();
}
async function load(){
  const seq=++request,key=el('system').value;
  const next=key==='salt'?salt:await fetch(key+'.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json()});
  if(seq!==request)return;
  data=next;cut=0;selected=0;points=[Math.floor(axis().length/2)];
  el('context').textContent=isSalt()?'Schnitt bei 40 mol-% AlCl₃ und 1 bar. Die restlichen 60 mol-% verteilen sich auf NaCl und KCl.':'Gleichgewicht bei 1,01325 bar. Die Auswahl rastet auf berechneten Zusammensetzungen ein.';
  const cuts=data.axes[1]||[];
  el('cutLabel').hidden=!cuts.length;el('cut').innerHTML=cuts.map(x=>'<option>'+pct(x)+' Cu</option>').join('');
  el('tlabel').hidden=isSalt();el('temp').max=data.T.length-1;el('temp').value=Math.floor(data.T.length/2);
  el('position').max=axis().length-1;
  el('caption').textContent=isSalt()?'Punkte: Versuchswerte. Linien: aus der ORNL-Modellgrafik abgelesene Grenzverläufe.':'Sand: vollständig fest. Blau: vollständig flüssig. Zwischenfarben: anteilig geschmolzen. Achsen in mol-%.';
  controls();
}
el('system').onchange=()=>load().catch(e=>el('context').textContent='Daten konnten nicht geladen werden: '+e.message);
el('snap').onclick=()=>{
 const tern=data.axes.length===2,amounts=tern?[3.73/107.87,.85/63.546,95.42/118.69]:[43.03/118.69,56.97/208.98];
 const total=amounts.reduce((a,b)=>a+b),nearest=(a,v)=>a.reduce((b,x,i)=>Math.abs(x-v)<Math.abs(a[b]-v)?i:b,0);
 points[selected]=nearest(axis(),amounts[0]/total);if(tern){cut=nearest(data.axes[1],amounts[1]/total);el('cut').selectedIndex=cut}render();
};
el('cut').onchange=()=>{cut=el('cut').selectedIndex;render()};
el('add').onclick=()=>{points.push(Math.min(axis().length-1,points[selected]+1));selected=points.length-1;controls()};
el('active').onchange=()=>{selected=el('active').selectedIndex;render()};
el('position').oninput=e=>{points[selected]=Number(e.target.value);render()};
el('temp').oninput=details;
function move(e){
  const chart=el('plot').firstElementChild,pt=chart.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;
  const x=pt.matrixTransform(chart.getScreenCTM().inverse()).x;
  points[selected]=axis().reduce((best,v,i)=>Math.abs(X(v)-x)<Math.abs(X(axis()[best])-x)?i:best,0);render()
}
el('plot').onpointerdown=e=>{el('plot').setPointerCapture(e.pointerId);move(e)};
el('plot').onpointermove=e=>{if(el('plot').hasPointerCapture(e.pointerId))move(e)};
el('save').onclick=async()=>{
 const chart=el(el('view').value).firstElementChild.cloneNode(true),box=chart.viewBox.baseVal;
 chart.setAttribute('width',box.width);chart.setAttribute('height',box.height);
 let blob=new Blob([new XMLSerializer().serializeToString(chart)],{type:'image/svg+xml'});
 if(el('format').value==='PNG'){
   const bitmap=new Image(),url=URL.createObjectURL(blob);bitmap.src=url;
   try{await bitmap.decode();const c=document.createElement('canvas');c.width=2*box.width;c.height=2*box.height;c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);blob=await new Promise(resolve=>c.toBlob(resolve))}finally{URL.revokeObjectURL(url)}
 }
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Legierungsatlas-'+el('system').value+'.'+el('format').value.toLowerCase();a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)
};
load().catch(e=>el('context').textContent=e.message);

