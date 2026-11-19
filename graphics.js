import {liquids, vessels} from './model.js';
export const colors = ['#994b28','#216985'];
export const num = value => value.toLocaleString('de-DE',{maximumFractionDigits:1,minimumFractionDigits:1});
export const clock = minutes => {
  const seconds = Math.round(minutes * 60);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0');
};
const round = n => Number(n.toFixed(2));
const label = (x,y,content,options='') => '<text x="'+x+'" y="'+y+'" '+options+'>'+content+'</text>';
function frame(svg,width,height,content,title) {
  svg.setAttribute('viewBox','0 0 '+width+' '+height);
  svg.setAttribute('width',width);
  svg.setAttribute('height',height);
  svg.innerHTML='<title>'+title+'</title><rect width="100%" height="100%" fill="#fff"/><g font-family="Arial,sans-serif" fill="#392e29">'+content+'</g>';
}
function cup(s, curve, t, index, width) {
  const mixed = t >= curve.add && s.dose > 0;
  const volume = s.volume + (mixed ? s.dose : 0);
  const level = 96 - 56 * volume / s.size;
  const fill = mixed && s.extra !== 'water' ? '#ba8358' : s.base === 'tea' ? '#a65420' : '#563321';
  const ink = colors[index], name = index === 0 ? 'A' : 'B';
  const narrow = width < 230;
  const x = narrow ? 10 : 17, textX = narrow ? 12 : 133;
  const baseY = narrow ? 128 : 66;
  const isGlass = s.vessel==='glass', isTravel = ['travel','ideal'].includes(s.vessel);
  const shape = isTravel ? 'M19 36 H78 L70 100 H27 Z' : 'M13 36 H79 L74 88 Q72 100 60 100 H33 Q20 100 18 88 Z';
  const handle = !isGlass && !isTravel ? '<path d="M78 46 C109 38 105 76 76 78" fill="none" stroke="'+ink+'" stroke-width="6"/>' : '';
  const lid = s.cover==='lid' ? '<rect x="10" y="31" width="73" height="7" rx="3" fill="'+ink+'"/>' : '';
  return '<g transform="translate('+round(index*(width+8))+',0)"><rect x="1" y="1" width="'+(width-2)+'" height="'+(narrow?163:119)+'" rx="12" fill="'+(index?'#eef5f6':'#f8eee4')+'"/>'+
    label(14,23,'Tasse '+name+' · '+clock(curve.add)+' min','font-size="14" font-weight="bold" fill="'+ink+'"')+
    '<g transform="translate('+x+',0)"><defs><clipPath id="vessel-'+name+'"><path d="'+shape+'"/></clipPath></defs>'+handle+
    '<path d="'+shape+'" fill="#fff9ef" stroke="'+ink+'" stroke-width="3"/><g clip-path="url(#vessel-'+name+')"><rect x="13" y="'+level+'" width="66" height="'+(100-level)+'" fill="'+fill+'"/><ellipse cx="46" cy="'+level+'" rx="34" ry="3" fill="'+(mixed?'#d2aa7b':'#99693e')+'"/></g><path d="'+shape+'" fill="none" stroke="'+ink+'" stroke-width="3"/>'+lid+'</g>'+
    label(textX,baseY,num(curve.at(t))+' °C','font-size="24" font-weight="bold"')+
    label(textX,baseY+21,volume+' ml · '+(mixed?'mit '+liquids[s.extra].name:liquids[s.base].name),'font-size="13"')+'</g>';
}
export function drawScene(svg,model,t,width) {
  const w = (width-8)/2, h = w<230 ? 164 : 120;
  const caption=vessels[model.s.vessel].name+' · '+clock(t)+' min';
  frame(svg,width,h+28,model.curves.map((c,i)=>cup(model.s,c,t,i,w)).join('')+label(4,h+20,caption,'font-size="13"'),caption);
}
export function drawPlot(svg, model, t, width) {
  const {s, curves, paths, end} = model;
  const left=43, right=width-16, top=34, bottom=212, height=322;
  const temps=paths.flat().map(p=>p[1]).concat([s.target]);
  const low=Math.floor(Math.min(...temps)/10)*10, high=Math.max(low+10,Math.ceil(Math.max(...temps)/10)*10);
  const x=v=>round(left+(right-left)*v/end), y=v=>round(bottom-(bottom-top)*(v-low)/(high-low));
  let body=label(4,17,'°C','font-size="13"')+label(right,17,'A ━    B ┄','text-anchor="end" font-size="14" font-weight="bold"');
  for(let v=low;v<=high;v+=high-low>65?20:10) {
    body+='<path d="M'+left+' '+y(v)+'H'+right+'" stroke="#e4ddd7"/>'+label(left-7,y(v)+4,v,'text-anchor="end" font-size="12"');
  }
  const tick=end/5;
  for(let i=0;i<=5;i++) body+=label(x(i*tick),bottom+18,Number((i*tick).toFixed(1)).toLocaleString('de-DE'),'text-anchor="middle" font-size="12"');
  body+=label(right,bottom+32,'Zeit (min)','text-anchor="end" font-size="12"');
  body+='<path d="M'+left+' '+y(s.target)+'H'+right+'" stroke="#8a7553" stroke-dasharray="2 4"/>'+label(left+4,y(s.target)-4,'Wunsch '+s.target+' °C','font-size="11"');
  for(const mark of [s.first,s.second,s.drink]) body+='<path d="M'+x(mark)+' '+top+'V'+bottom+'" stroke="#bbaca0" stroke-dasharray="3 5"/>';
  paths.forEach((points,i)=>{
    const d=points.map(([time,temp],j)=>(j?'L':'M')+x(time)+' '+y(temp)).join(' ');
    body+='<path d="'+d+'" fill="none" stroke="'+colors[i]+'" stroke-width="3" '+(i?'stroke-dasharray="7 4"':'')+'/>';
  });
  body+='<path d="M'+x(t)+' '+top+'V'+bottom+'" stroke="#4b4946" stroke-width="1.3"/>';
  curves.forEach((curve,i)=>{body+='<circle cx="'+x(t)+'" cy="'+y(curve.at(t))+'" r="'+(i?3:5)+'" fill="'+colors[i]+'" stroke="white"/>';});
  [['first','A',colors[0]],['second','B',colors[1]],['drink','Schluck','#4d473e']].forEach(([key,name,color],i)=>{
    const cy=253+26*i, px=x(s[key]), textRight=px<width/2;
    body+='<g data-handle="'+key+'"><path d="M'+left+' '+cy+'H'+right+'" stroke="#d4c9bc" stroke-width="2"/><rect x="'+(left-9)+'" y="'+(cy-12)+'" width="'+(right-left+18)+'" height="24" fill="transparent"/><circle cx="'+px+'" cy="'+cy+'" r="7" fill="'+color+'"/>'+
      label(px+(textRight?12:-12),cy+4,name+' · '+clock(s[key]),'text-anchor="'+(textRight?'start':'end')+'" fill="'+color+'" font-size="12" font-weight="bold" stroke="#fff" stroke-width="3" paint-order="stroke"')+'</g>';
  });
  frame(svg,width,height,body,'Temperaturverlauf · '+clock(t)+' min');
}
export async function saveSvgView(source,type,name) {
  const copy=source.cloneNode(true);
  const xml=new XMLSerializer().serializeToString(copy);
  let blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});
  if(type==='png'){
    const url=URL.createObjectURL(blob);
    try{
      const image=new Image(); image.src=url; await image.decode();
      const canvas=document.createElement('canvas');
      canvas.width=2*image.naturalWidth; canvas.height=2*image.naturalHeight;
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Bild konnte nicht erzeugt werden.')),'image/png'));
    }finally{URL.revokeObjectURL(url);}
  }
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=name+'.'+type;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
