// Separate model comparisons. No overall safety clearance and no peak-exposure claim.
export function assessSafety(p,r){
 const warn=(p.warningPercent??80)/100,k=p.exFactor??3;
 const maxState=(value,limit)=>value===null?'unknown':value>limit+1e-10?'exceeded':value>=limit*warn-1e-10?'near':'within';
 const source=r.solventKgH>0;
 const healthIndex=r.qHealth===null||r.noFlow?null:r.qHealth/p.flow;
 const explosionPercent=r.qEx===null||r.noFlow?null:r.qEx*(p.exPercent/100)*k/p.flow*100;
 const referenceSpeed=p.type==='bls'?.3:.5;
 const qAirReference=r.areaWork*referenceSpeed*3600;
 const healthState=!source?'not-applicable':r.noFlow?'exceeded':maxState(healthIndex,1);
 const exState=!source?'not-applicable':r.noFlow?'exceeded':maxState(explosionPercent,p.exPercent);
 return {healthIndex,healthState,explosionPercent,exState,referenceSpeed,qAirReference,qExplosion:r.qEx===null?null:r.qEx*k,exFactor:k,warningPercent:warn*100,
 airState:r.speedWork+1e-10<referenceSpeed?'below':'reached',aerosolState:'unknown',shortTermState:'unknown'};
}
