import {REFERENCE,critical,clamp,upperBoundary} from './reference.js';
import {initializeCarbon,austenitize,temper,diffuse,evolveMorphology,morphology,conditionFactor,diagramInitialState} from './metallurgy.js';
export {REFERENCE,critical,clamp} from './reference.js';
import {mesh,heatStep,rectangleMesh,heatStep2D,thermalProperties} from './thermal.js';
export {mesh,heatStep,rectangleMesh,heatStep2D} from './thermal.js';
// All transformation curves are explicitly uncalibrated teaching predictions.
export const KINETICS_VERSION='FeC-cementite-2026-11-22-v1';
export const PHASES=['A','F','P','B','M','TM','K'];
export const LABELS={A:'Austenit / Rest-Austenit',F:'Ferrit',P:'Perlit / eingeformtes F–Fe₃C-Gefüge',B:'Bainit',M:'Martensit',TM:'Angelassener Martensit',K:'Proeutektoider Zementit'};
export const COLORS={A:'#b995d4',F:'#ecd9a7',P:'#5e997b',B:'#4099ae',M:'#c86146',TM:'#916e55',K:'#666e78'};
export function equilibrium(c,T){
 const {eutectoidTemperature:Te,eutectoidCarbon:Ce,ferriteCarbon:Cf,cementiteCarbon:Ck}=REFERENCE;const a={A:0,F:0,P:0,B:0,M:0,TM:0,K:0};
 if(T>=Te){if(c<=Ce){const ca=clamp(Ce*((910-T)/(910-Te))**2,Cf,Ce);a.A=T>=upperBoundary(c)?1:clamp((c-Cf)/(ca-Cf),0,1);a.F=1-a.A;}else{const cg=Ce+(T-Te)/220;a.A=T>=Te+220*(c-Ce)?1:clamp((Ck-c)/(Ck-cg),0,1);a.K=1-a.A;}}
 else if(c<=Ce){a.P=clamp((c-Cf)/(Ce-Cf),0,1);a.F=1-a.P;}else{a.K=(c-Ce)/(Ck-Ce);a.P=1-a.K;}return a;
}
export function blankState(){return {A:1,F:0,P:0,B:0,M:0,TM:0,K:0,uP:0,uB:0,minT:2000,temperDose:0,uF:0,uK:0,boundaryK:0,temperRetention:0,pFine:0,bLower:0,spheroid:0,homogeneity:0,grainIndex:1};}
// Heuristic C-curves. Coefficients have NOT been fitted to a measured steel.
export function tttStart(m,T,type,state){
 if(!m.kinetic)return Infinity;const q=critical(m);const shift=Math.exp(clamp(.9*m.mn+.75*m.cr+2*m.mo+.4*m.ni,0,7))*conditionFactor(state||m.diagramState||{});
 if(type==='K'){if(m.id!=='model'||m.c<=REFERENCE.eutectoidCarbon||T>=q.a3||T<=550)return Infinity;return 12*shift*Math.exp(((T-700)/90)**2);}
 if(type==='F'){if(T>=q.a3||T<q.a1-100||m.c>=REFERENCE.eutectoidCarbon)return Infinity;return 2*shift*Math.exp(((T-(q.a1-15))/65)**2);}
 if(type==='P'){if(T>=q.a1||T<470)return Infinity;return 1.5*shift*Math.exp(((T-580)/82)**2)*(1+Math.max(0,m.c-.45));}
 if(T>=550||T<=Math.max(180,q.ms))return Infinity;
 return 6*shift*Math.exp(((T-400)/85)**2);
}
export function transform(s,m,T,dt){temper(s,m,T,dt);diffuse(s,m,T,dt,tttStart);evolveMorphology(s,m,T,dt);}
export function hardness(s,m,T=20){
 if(!m.kinetic||m.c>.65||T>100||s.A>.05)return null;
 // Deliberately simple pedagogical constituent hardness, not Maynier.
 const hvM=150+800*m.c, floor=170+250*m.c;const retention=Number.isFinite(s.temperRetention)?s.temperRetention:(s.M+s.TM)*Math.exp(-.35*s.temperDose);const matrixHV=(s.M+s.TM)*floor+(hvM-floor)*retention;
 const hv=s.F*95+s.P*(200+90*m.c)+80*(s.pFine||0)*(1-(s.P>0?(s.spheroid||0)/s.P:0))-50*(s.spheroid||0)+s.B*(240+240*m.c)+40*(s.bLower||0)+matrixHV+s.A*150;
 return {hv,rm:hv>=100&&hv<=400?3.2*hv:null};
}
export const PROCESSES=[['quench','Härten'],['temper','Härten und Anlassen / Vergüten'],['normalize','Normalglühen'],['anneal','Vollglühen · langsam abkühlen'],['isothermal','Isotherm umwandeln / Bainitisieren'],['soft','Weichglühen / Einformen · Modell'],['stress','Spannungsarmglühen'],['custom','Eigener Temperatur-Zeit-Verlauf']];
function withModes(stages){let previous=20;return stages.map(s=>{const mode=s.target<previous&&!/Ofen|Langsam/.test(s.label)?'step':'ramp';previous=s.target;return {...s,mode};});}
export function preset(m,name){
 const a=m.aust,h=m.hold,tem=m.temper;
 const stages=[{duration:Math.max(600,(a-20)/.5),target:a,h:120,label:'Aufheizen (Ofen)'},{duration:h,target:a,h:120,label:'Halten (Ofen)'}];
 if(name==='soft')return withModes([{duration:2400,target:700,h:120,label:'Aufheizen'},{duration:7200,target:700,h:120,label:'Subkritisch halten / Einformen'},{duration:36000,target:600,h:120,label:'Langsame Ofenabkühlung'},{duration:7200,target:20,h:45,label:'Abkühlen'},{duration:3600,target:20,h:45,label:'Bei Raumtemperatur auskühlen'}]);
 if(name==='stress')return withModes([{duration:1800,target:550,h:120,label:'Aufheizen'},{duration:3600,target:550,h:120,label:'Spannungsarm halten'},{duration:7200,target:20,h:50,label:'Langsam abkühlen'},{duration:3600,target:20,h:45,label:'Bei Raumtemperatur auskühlen'}]);
 if(name==='normalize')stages.push({duration:7200,target:20,h:45,label:'Luftkühlen'});
 else if(name==='anneal')stages.push({duration:36000,target:600,h:120,label:'Ofenabkühlung'},{duration:7200,target:20,h:45,label:'Luftkühlen'});
 else if(name==='isothermal')stages.push({duration:180,target:380,h:1500,label:'Ins Warmbad'},{duration:5400,target:380,h:1500,label:'Isotherm halten'},{duration:3600,target:20,h:45,label:'Luftkühlen'});
 else {stages.push({duration:900,target:20,h:1200,medium:'oil',label:'Abschrecken (Öl, Modellwert)'});if(name==='temper'){
 const n=m.referenceOnly?3:1;for(let i=0;i<n;i++)stages.push({duration:1800,target:tem,h:120,label:'Anlassen: Aufheizen '+(i+1)},{duration:7200,target:tem,h:120,label:'Anlassen: Halten '+(i+1)},{duration:3600,target:20,h:45,label:'Zwischen-/Endkühlung '+(i+1)});
 }}stages.push({duration:3600,target:20,h:45,label:'Bei Raumtemperatur auskühlen'});return withModes(stages);
}
export function validateStages(stages){if(!Array.isArray(stages)||!stages.length||stages.length>20)throw Error('1 bis 20 Prozessschritte erforderlich.');let total=0;for(const s of stages){for(const key of ['duration','target','h'])if(!Number.isFinite(s[key]))throw Error('Alle Prozessparameter müssen Zahlen sein.');if(s.duration<1||s.duration>86400||s.target<0||s.target>1250||s.h<1||s.h>15000)throw Error('Grenzen: 1–86400 s, 0–1250 °C, 1–15000 W/(m² K).');if(s.mode!==undefined&&!['ramp','step'].includes(s.mode))throw Error('Mediumverlauf: linear oder Sprung wählen.');total+=s.duration;}if(total>172800)throw Error('Gesamtdauer höchstens 48 Stunden.');return total;}
export function run(m,stages,{size=20,height=40,shape='plate',n=20,controlled=false,rate=10,thermalMode='variable',latentHeat=false,initialMorphology='lamellar',maxStep=15}={}){
 if(!Number.isFinite(maxStep)||maxStep<.1||maxStep>15)throw Error('Maximaler Zeitschritt: 0,1–15 s.');if(!['constant','variable'].includes(thermalMode)||!['lamellar','spheroidized'].includes(initialMorphology))throw Error('Ungültige Modelloption.');m={...m,variableProperties:thermalMode==='variable',initialMorphology};const total=validateStages(stages);if(!Number.isFinite(size)||size<1||size>200||!['plate','rod'].includes(shape)||shape==='plate'&&(!Number.isFinite(height)||height<1||height>200)||!Number.isInteger(n)||n<4||n>64||!Number.isFinite(rate)||rate<.001||rate>1000)throw Error('Geometrie: 1–200 mm; Kühlrate: 0,001–1000 K/s.');
 const nx=n,ny=shape==='plate'?n:1;const grid=shape==='plate'?rectangleMesh(size,height,nx,ny):mesh(size,shape,n).map((g,i)=>({...g,y:0,ix:i,iy:0}));const count=grid.length;let temps=Array(count).fill(20);const states=grid.map(()=>({...blankState(),...equilibrium(m.c,20),ready:false,maxA:0}));for(const s of states){initializeCarbon(s,m);s.spheroid=initialMorphology==='spheroidized'?s.P:0;}const frames=[],traces=[];let time=0,bath0=20,next=0;const every=total/220;const q=critical(m);
 function save(label,bath){frames.push({time,bath,label,temps:[...temps],states:m.kinetic?states.map(s=>({...s})):null,mean:m.kinetic?average(states,grid):null,meanT:average(temps,grid)});}
 save('Ausgangszustand',20);traces.push({time:0,bath:20,core:20,edge:20,corner:20,stageIndex:0});
 for(const [stageIndex,stage] of stages.entries()){let elapsed=0;const startBath=bath0;while(elapsed<stage.duration-1e-8){
 const cooling=stage.target<startBath,step=stage.mode==='step',dt=Math.min(maxStep,stage.duration-elapsed,cooling&&(step||controlled)?1:15);elapsed+=dt;time+=dt;
 const frac=clamp(elapsed/stage.duration,0,1);let bath=step?stage.target:startBath+(stage.target-startBath)*frac;
 if(controlled&&cooling)bath=Math.max(stage.target,startBath-rate*elapsed);
 const previous=temps;const thermalMaterial={...m,medium:stage.medium||'constant'};temps=shape==='plate'?heatStep2D(temps,grid,thermalMaterial,bath,stage.h,dt,nx,ny):heatStep(temps,grid,thermalMaterial,bath,stage.h,dt);traces.push({time,bath,core:temps[0],edge:temps[nx-1],corner:temps.at(-1),stageIndex});
 if(m.kinetic){for(let i=0;i<count;i++){const s=states[i],T=temps[i],oldA=s.A;const warming=T>previous[i]+1e-9;
 if(T>q.a1&&warming||T>q.a1&&stage.target>=startBath)austenitize(s,m,T,dt,Math.max(0,(T-previous[i])/dt));
 else if(s.ready&&T<q.a3&&!warming)transform(s,m,T,dt);
 else {temper(s,m,T,dt);evolveMorphology(s,m,T,dt);}
 if(latentHeat){const cp=thermalProperties(m,(T+previous[i])/2).cp;temps[i]+=(oldA-s.A)*80000/cp;}
 }}
 // Traces use the corrected temperature, including the optional split heat source.
 traces[traces.length-1]={time,bath,core:temps[0],edge:temps[nx-1],corner:temps.at(-1),stageIndex};
 const rapidCooling=cooling&&(step||controlled),difference=Math.max(...temps.map(T=>Math.abs(T-bath))),spacing=rapidCooling&&difference>10?Math.min(every,elapsed<120?2:15):every;if(time>=next||elapsed<=dt+1e-8||elapsed>=stage.duration-1e-8){save(stage.label,bath);next=time+spacing;}
 }bath0=frames.at(-1).bath;}
 const last=frames.at(-1);const fully=states.every(s=>(s.maxA||0)>=.99);const warnings=[];
 if(!m.kinetic)warnings.push('Nur Temperaturrechnung: keine belastbare Kinetik für diesen Werkstoff hinterlegt. Gefügeanteile und Festigkeiten werden nicht ausgegeben.');
 else {if(m.id==='model'&&m.c>REFERENCE.eutectoidCarbon)warnings.push('Übereutektoider Fe–C-Modellstahl: Zementitausscheidung und -auflösung sind unkalibrierte Lehrprognosen. Keine quantitative Korngrenzennetz-, Filmdicken- oder Versprödungsprognose; keine Härte-/Zugfestigkeitsausgabe. Acm ist eine lineare Löslichkeitsnäherung.');warnings.push('Unkalibriertes Lehrmodell: C-Kurven, Gefügeanteile und Härte sind Prognosen ohne Validierung an dieser Stahlsorte.');if(!fully)warnings.push('Nicht vollständig austenitisiert: Mindestens eine Zelle hat im zeitabhängigen ZTA-Lehrmodell nie 99 % Austenit erreicht. Teil-Austenitisierung ist nur näherungsweise abgebildet.');if(last.temps.some(T=>T>100))warnings.push('Bauteil am Ende noch warm: Endhärte / Zugfestigkeit nicht verfügbar.');if(states.some(s=>s.A>.05))warnings.push('Mehr als 5 % verbleibender Austenit: Festigkeitsabschätzung unterdrückt.');if(m.id==='16mncr5')warnings.push('Keine Aufkohlung: Ergebnis betrifft ausschließlich den Kernwerkstoff.');}
 warnings.push('ZTA-Zeitkonstanten, Kornindex, Morphologie und Stoffdatenfunktionen sind unkalibrierte Lehrannahmen. Sekundärhärtung und Rest-Austenit-Zerfall beim Anlassen fehlen.');if(latentHeat)warnings.push('Umwandlungswärme: experimenteller Sensitivitätsmodus mit ±80 kJ/kg Austenitänderung und expliziter Rückkopplung, kein kalorimetrischer Referenzdatensatz.');
 return {kineticsVersion:KINETICS_VERSION,reference:REFERENCE,maxStep,thermalMode,latentHeat,initialMorphology,modelQuality:m.kinetic?'uncalibrated-teaching-prediction':'thermal-reference-only',experimentallyValidated:false,m,stages,grid,frames,traces,total,size,height:shape==='plate'?height:0,nx,ny,shape,controlled,rate,fully,warnings};
}
export function average(data,grid){const v=grid.reduce((a,g)=>a+g.volume,0);if(typeof data[0]==='number')return data.reduce((a,x,i)=>a+x*grid[i].volume,0)/v;const out={};for(const key of [...PHASES,'temperDose'])out[key]=data.reduce((a,s,i)=>a+s[key]*grid[i].volume,0)/v;return out;}
// Both diagrams use precisely the kinetics used for the spatial result.
export function diagrams(m){
 if(!m.kinetic)return {ttt:[],cct:[]};m={...m,diagramState:diagramInitialState(m)};const ttt=[];
 for(let T=200;T<=Math.max(720,critical(m).a3);T+=8)for(const type of ['K','F','P','B']){const t1=tttStart(m,T,type);if(Number.isFinite(t1))ttt.push({T,type,t1,t99:t1*Math.sqrt(Math.log(100)/(-Math.log(.99)))});}
 const cct=[];
 for(let j=0;j<=60;j++){
  const rate=10**(-3+j*5/60),s={...blankState(),...m.diagramState},history=[{T:m.aust,t:0,K:0,FP:0,B:0,M:0}];let t=0;
  // Include exactly 20 °C, also for odd or fractional austenitising temperatures.
  for(let T=m.aust;T>20;){const next=Math.max(20,T-2),dt=(T-next)/rate;transform(s,m,next,dt);t+=dt;T=next;history.push({T,t,K:s.K,FP:s.F+s.P,B:s.B,M:s.M+s.TM});}
  for(const type of ['K','FP','B','M']){
   const terminal=history.at(-1)[type];if(terminal<.01)continue;
   for(const threshold of [.01,.99]){
    const target=terminal*threshold;const i=history.findIndex(h=>h[type]>=target);if(i<1)continue;const a=history[i-1],b=history[i],f=clamp((target-a[type])/(b[type]-a[type]),0,1);
    cct.push({T:a.T+f*(b.T-a.T),t:a.t+f*(b.t-a.t),type,threshold,rate,terminal,basis:'fraction-of-terminal-product-at-20C'});
   }
  }
 }
 return {ttt,cct};
}
