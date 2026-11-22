export const MATERIAL={id:'6082',name:'EN AW-6082 · Al-Mg-Si',rho:2710,cp:900,k:172,variableProperties:false,medium:'constant'};
export const VERSION='al-ageing-teaching-1';
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const KEYS=['solute','clusters','fine','coarse'];
export const LABELS={solute:'Gelöstes Reservoir',clusters:'Cluster / Vorstufen',fine:'Feine Ausscheidungen',coarse:'Grobe Ausscheidungen'};
export const COLORS={solute:'#5489ae',clusters:'#b987ba',fine:'#31856a',coarse:'#bd7541'};
export const SOURCE='https://doi.org/10.3390/met9020173';
// Only numerical values explicitly stated in section 3.1.1. No figure digitisation.
export const REFERENCE=[{h:0,hv:83.07},{h:8,hv:132.32},{h:18,hv:116.87},{h:96,hv:102.23}];
export function referenceHV(h){if(!Number.isFinite(h)||h<0||h>96)return null;for(let i=1;i<REFERENCE.length;i++){const a=REFERENCE[i-1],b=REFERENCE[i];if(h<=b.h)return a.hv+(b.hv-a.hv)*(h-a.h)/(b.h-a.h);}return null;}
export function blankState(initial='coarse'){return {solute:initial==='solution'?1:0,clusters:0,fine:0,coarse:initial==='solution'?0:1,naturalDose:0};}
export function index(s){return clamp(.32*s.solute+.52*s.clusters+1*s.fine+.05*s.coarse)*100;}
function move(s,from,to,k,dt){const amount=s[from]*(-Math.expm1(-Math.max(0,k)*dt));s[from]-=amount;s[to]+=amount;}
export function advance(s,T,dt){
 if(!Number.isFinite(T)||!Number.isFinite(dt)||dt<0)throw Error('Ungültiger Kinetikschritt.');
 if(T>=450){
  // Illustrative solvus and finite dissolution. Reservoirs are solute shares, NOT phase fractions.
  const target=clamp((T-450)/80),rate=Math.exp(clamp((T-530)/30,-6,2))/900;
  const precip=s.clusters+s.fine+s.coarse,amount=Math.max(0,Math.min(precip,target-s.solute))*(-Math.expm1(-rate*dt));
  if(precip>0)for(const k of ['clusters','fine','coarse'])s[k]*=1-amount/precip;
  s.solute+=amount;s.naturalDose*=Math.exp(-rate*dt);return s;
 }
 if(T>=240){
  const rate=Math.exp(-(((T-340)/65)**2))/35;
  move(s,'solute','coarse',rate,dt);move(s,'clusters','coarse',rate,dt);move(s,'fine','coarse',rate,dt);
 } else if(T>=100){
  const kelvin=T+273.15,arr=Math.exp(clamp(80000/8.314*(1/448.15-1/kelvin),-12,8));
  const inhibition=1+.6*s.naturalDose;
  move(s,'solute','fine',arr/(18000*inhibition),dt);
  move(s,'clusters','fine',arr/(12000*inhibition),dt);
  move(s,'fine','coarse',arr*Math.exp((T-175)/55)/150000,dt);
 } else if(T>=0){
  const rate=Math.exp(clamp((T-20)/22,-4,4))/(2*86400);
  move(s,'solute','clusters',rate,dt);s.naturalDose=clamp(s.naturalDose+rate*dt/3);
 }
 return s;
}
export function preset(name='artificial'){
 const start=[{label:'Ofen aufheizen',target:545,duration:1800,h:100,mode:'ramp'},
 {label:'Lösungsglühen',target:545,duration:3000,h:100,mode:'step'},
 {label:'Transfer an Luft',target:20,duration:10,h:20,mode:'step'},
 {label:'Wasserabschrecken',target:20,duration:120,h:2500,mode:'step'}];
 if(name==='slow')start[3]={...start[3],label:'Langsame Luftkühlung',duration:3600,h:15};
 if(name==='natural')return [...start,{label:'Kaltauslagern',target:20,duration:7*86400,h:15,mode:'step'}];
 if(name==='delayed')start.push({label:'Zwischenlagerung',target:20,duration:12*3600,h:15,mode:'step'});
 return [...start,{label:'Auslagerung aufheizen',target:175,duration:900,h:100,mode:'ramp'},
 {label:'Warmauslagern',target:175,duration:(name==='overaged'?48:8)*3600,h:100,mode:'step'},
 {label:'Endkühlung',target:20,duration:1800,h:30,mode:'step'}];
}
export function validate(p){
 if(!p||!['plate','rod'].includes(p.shape)||!['coarse','solution'].includes(p.initial))throw Error('Geometrie oder Ausgangszustand ungültig.');
 for(const key of ['size','height'])if(!Number.isFinite(p[key])||p[key]<1||p[key]>200)throw Error('Abmessungen: 1 bis 200 mm.');
 if(!Array.isArray(p.stages)||!p.stages.length||p.stages.length>16)throw Error('1 bis 16 Prozessschritte erforderlich.');
 let total=0;for(const s of p.stages){if(!Number.isFinite(s.duration)||s.duration<1||s.duration>14*86400||!Number.isFinite(s.target)||s.target<0||s.target>550||!Number.isFinite(s.h)||s.h<1||s.h>15000||!['step','ramp'].includes(s.mode))throw Error('Schritte: 1 s bis 14 Tage, 0–550 °C, Wärmeübergang 1–15000 W/(m² K).');total+=s.duration;}
 if(total>14*86400)throw Error('Gesamtdauer höchstens 14 Tage.');return total;
}

