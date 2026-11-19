// SI geometry, m³/h ventilation, ml/min ready-to-spray coating. No CFD.
export const bls = {
  10:{width:1.810,depth:1.200,height:2.390,min:1500,recommended:2000},
  30:{width:1.480,depth:2.380,height:2.590,min:3000,recommended:3500},
  50:{width:1.780,depth:2.360,height:3.190,min:3500,recommended:4500}
};
export const presets={
 water:{name:'Große Wasserwand · 8 m²',width:6,depth:5,height:3,wallWidth:4,wallHeight:2,slotHeight:.25,openingWidth:4,openingHeight:2,target:.5,flow:14400,distance:1.2,pieceWidth:1.2,pieceHeight:.8,pieceDepth:.05,pieceZ:.95,orientation:'vertical',floorWidth:1,floorDepth:1},
 dry:{name:'Trockenabsaugung · 2 m²',width:3.5,depth:3.5,height:2.7,wallWidth:2,wallHeight:1,slotHeight:.25,openingWidth:2,openingHeight:1,target:.5,flow:3600,distance:1,pieceWidth:.8,pieceHeight:.6,pieceDepth:.04,pieceZ:.9,orientation:'vertical',floorWidth:1,floorDepth:1},
 bls:{name:'BLS · schematische Innengeometrie',width:1.1,depth:1.05,height:1.2,wallWidth:1,wallHeight:1,slotHeight:.15,openingWidth:1,openingHeight:1,target:.3,flow:2000,distance:.5,pieceWidth:.3,pieceHeight:.2,pieceDepth:.004,pieceZ:.45,orientation:'horizontal',floorWidth:.9,floorDepth:.85}
};
export const initial=()=>({...presets.water,type:'water',size:'10',process:'RP',feedMode:'gun',liquid:80,guns:1,density:1.2,efficiency:65,water:0,solvent:40,solid:60,species:[],exPercent:25});
const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
export function calculate(p){
 const errors=[];
 const positive=['width','depth','height','wallWidth','wallHeight','slotHeight','openingWidth','openingHeight','target','density','pieceWidth','pieceHeight','pieceDepth','floorWidth','floorDepth'];
 for(const key of positive)if(!finite(p[key])||p[key]<=0) errors.push(`${key}: positiver endlicher Wert erforderlich.`);
 for(const key of ['flow','liquid','distance','pieceZ'])if(!finite(p[key])||p[key]<0)errors.push(`${key}: nichtnegativer endlicher Wert erforderlich.`);
 if(!['water','dry','bls'].includes(p.type))errors.push('Unbekannte Anlagenvorlage.');
 if(!['horizontal','vertical'].includes(p.orientation))errors.push('Ungültige Werkstücklage.');
 if(!['gun','deposited'].includes(p.feedMode))errors.push('Ungültiger Mengenbezug.');
 if(!Number.isInteger(p.guns)||p.guns<1||p.guns>20)errors.push('Pistolenanzahl muss ganzzahlig zwischen 1 und 20 liegen.');
 if(!finite(p.efficiency)||p.efficiency<=0||p.efficiency>100)errors.push('Auftragswirkungsgrad muss größer 0 und höchstens 100 % sein.');
 for(const key of ['water','solvent','solid'])if(!finite(p[key])||p[key]<0||p[key]>100)errors.push('Massenanteile müssen zwischen 0 und 100 % liegen.');
 if(Math.abs(p.water+p.solvent+p.solid-100)>.01)errors.push('Wasser, organische Lösemittel und Festkörper müssen zusammen 100 Masse-% ergeben.');
 if(!finite(p.exPercent)||p.exPercent<=0||p.exPercent>100)errors.push('UEG-Rechenanteil muss größer 0 und höchstens 100 % sein.');
 const ww=p.type==='bls'?p.floorWidth:p.wallWidth;
 if(ww>p.width||p.type!=='bls'&&p.wallHeight+.25>p.height)errors.push('Absaugfläche passt nicht in die eingegebene Kabine.');
 if(p.type!=='bls'&&(p.openingWidth>p.width||p.openingHeight>p.height))errors.push('Arbeits-Bezugsebene passt nicht in den Raum.');
 if(p.type==='water'&&p.wallHeight+p.slotHeight+.16>p.height)errors.push('Wasserwand und Spalt sind höher als der Raum.');
 if(p.type==='water'&&p.slotHeight>p.wallHeight)errors.push('Spalthöhe darf die Wandhöhe nicht überschreiten.');
 if(p.type==='bls'&&p.floorDepth>p.depth)errors.push('Bodenfilter ist tiefer als die Kabine.');
 const py=p.depth-p.distance, pd=p.orientation==='horizontal'?p.pieceHeight:p.pieceDepth, ph=p.orientation==='horizontal'?p.pieceDepth:p.pieceHeight;
 if(p.pieceWidth>p.width||py-pd/2<0||py+pd/2>p.depth-.15||p.pieceZ+ph>p.height||p.pieceZ<0)errors.push('Werkstück liegt außerhalb der nutzbaren Kabine oder zu nah an der Rückwand. Abstand und Maße prüfen.');
 if(errors.length)return {valid:false,errors};
 const liquidPerGun=p.feedMode==='gun'?p.liquid:p.liquid/(p.efficiency/100);
 const sprayedLh=liquidPerGun*p.guns*60/1000, wetKgH=sprayedLh*p.density;
 const solventKgH=wetKgH*p.solvent/100, solidKgH=wetKgH*p.solid/100;
 const areaWork=p.type==='bls'?p.width*p.depth:p.openingWidth*p.openingHeight;
 const areaInlet=p.type==='water'?p.wallWidth*p.slotHeight:p.type==='dry'?p.wallWidth*p.wallHeight:p.floorWidth*p.floorDepth;
 const qGeometry=areaWork*p.target*3600, speedWork=p.flow/3600/areaWork,speedInlet=p.flow/3600/areaInlet;
 const list=p.species||[], speciesErrors=[];
 for(const s of list){
  if(!s.name?.trim())speciesErrors.push('Stoffname fehlt.');
  if(!finite(s.percent)||s.percent<=0||s.percent>100)speciesErrors.push('Stoffanteile müssen größer 0 und höchstens 100 Masse-% sein.');
  for(const k of ['agw','ueg'])if(s[k]!==null&&(!finite(s[k])||s[k]<=0))speciesErrors.push('AGW und UEG müssen positiv sein oder leer bleiben.');
 }
 const assigned=list.reduce((a,s)=>a+(finite(s.percent)?s.percent:0),0);
 const complete=p.solvent===0?list.length===0:list.length>0&&Math.abs(assigned-p.solvent)<.01;
 if(!complete)speciesErrors.push('Die Stoffanteile müssen den organischen Lösemittelanteil vollständig abdecken (Masse-% des spritzfertigen Lacks).');
 const healthReady=complete&&speciesErrors.length===0&&list.every(s=>s.agw!==null);
 const exReady=complete&&speciesErrors.length===0&&list.every(s=>s.ueg!==null);
 const qHealth=healthReady?list.reduce((a,s)=>a+wetKgH*s.percent/100*1e6/s.agw,0):null;
 // Additive ideal mixing model; UEG in g/m³, mass source in g/h.
 const qEx=exReady?list.reduce((a,s)=>a+wetKgH*s.percent/100*1000/s.ueg,0)/(p.exPercent/100):null;
 const reference=p.type==='bls'&&p.orientation==='horizontal'?bls[p.size]:null;
 const candidates=[qGeometry,qHealth,qEx,reference?.min].filter(x=>finite(x));
 const noFlow=p.flow===0;
 const concentrations=list.map(s=>({name:s.name,mgM3:noFlow?null:wetKgH*s.percent/100*1e6/p.flow}));
 return {valid:true,errors:[],areaWork,areaInlet,qGeometry,speedWork,speedInlet,volume:p.width*p.depth*p.height,airChanges:p.flow/(p.width*p.depth*p.height),sprayedLh,wetKgH,solventKgH,waterKgH:wetKgH*p.water/100,solidKgH,depositedSolidKgH:solidKgH*p.efficiency/100,overspraySolidKgH:solidKgH*(1-p.efficiency/100),qHealth,qEx,healthReady,exReady,speciesErrors,reference,modelMax:Math.max(...candidates),concentrations,noFlow};
}
