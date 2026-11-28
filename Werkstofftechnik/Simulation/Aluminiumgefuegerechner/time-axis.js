// A common physical seconds coordinate underlies all three unit axes.
const superscript={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
export const powerLabel=exponent=>'10'+[...String(exponent)].map(c=>superscript[c]).join('');
export const TIME_UNITS=[{factor:1,label:'Zeit in Sekunden [s]'},{factor:60,label:'Zeit in Minuten [min]'},{factor:3600,label:'Zeit in Stunden [h]'}];
export function logTimeAxis(maxSeconds,left=130,right=950){
 if(!Number.isFinite(maxSeconds)||maxSeconds<=0)throw Error('Positive Zeitspanne erforderlich.');
 const min=Math.min(1,maxSeconds/10),max=Math.max(maxSeconds,min*10),span=Math.log10(max/min);
 const position=seconds=>Number.isFinite(seconds)&&seconds>0?left+Math.log10(seconds/min)/span*(right-left):null;
 function ticks(factor=1){
  const values=[];
  for(let e=Math.floor(Math.log10(min/factor));e<=Math.ceil(Math.log10(max/factor));e++)for(let multiple=1;multiple<=9;multiple++){
   const seconds=factor*multiple*10**e;
   if(seconds<min*(1-1e-9)||seconds>max*(1+1e-9))continue;
   values.push({seconds,x:position(seconds),major:multiple===1,label:multiple===1?powerLabel(e):'',exponent:e});
  }return values;
 }
 return {min,max,left,right,position,ticks};
}
// Keep the existing piecewise-linear interpolation in PHYSICAL time when drawing
// it on logarithmic coordinates. Do not interpolate values linearly in log(time).
export function logCurve(values,factor,axis){
 const out=[];
 for(let i=1;i<values.length;i++){
  const a=values[i-1],b=values[i],ta=a[0]*factor,tb=b[0]*factor;
  if(![ta,tb,a[1],b[1]].every(Number.isFinite)||tb<ta)throw Error('Ungültiger Zeitverlauf.');
  if(tb<axis.min||ta>axis.max)continue;
  const lo=Math.max(axis.min,ta),hi=Math.min(axis.max,tb);if(hi<lo)continue;
  if(tb===ta){out.push([ta,a[1]],[tb,b[1]]);continue;}
  const n=Math.max(1,Math.ceil(Math.log(hi/lo)/Math.log(1.12)));
  for(let j=0;j<=n;j++){const t=j===n?hi:lo*(hi/lo)**(j/n),value=a[1]+(b[1]-a[1])*(t-ta)/(tb-ta);out.push([t,value]);}
 }return out;
}
export const TIME_FIGURES=['thermal','reservoirs','hardening','comparison','reference'];
export function figureHeight(id,options={}){
 return TIME_FIGURES.includes(id)&&options.timeScale!=='linear'&&!(id==='comparison'&&options.compareAxis==='relative')?720:560;
}
