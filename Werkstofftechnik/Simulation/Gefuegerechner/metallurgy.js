import {REFERENCE as R,critical,clamp,austeniteSolubility} from './reference.js';
const products=['F','P','B','M','TM','K'];
const reservoir=k=>'carbon'+k;
export function initializeCarbon(s,m){s.boundaryK??=0;if(Number.isFinite(s.carbonA))return;for(const k of products)s[reservoir(k)]=(s[k]||0)*(k==='F'?Math.min(m.c,R.ferriteCarbon):k==='P'?R.eutectoidCarbon:k==='K'?R.cementiteCarbon:m.c);s.carbonA=m.c-products.reduce((a,k)=>a+s[reservoir(k)],0);s.temperRetention=s.M+s.TM;s.pFine??=0;s.bLower??=0;s.spheroid??=0;s.homogeneity??=0;s.grainIndex??=1;}
export function carbonTotal(s){return s.carbonA+products.reduce((a,k)=>a+(s[reservoir(k)]||0),0);}
export function austeniteCarbon(s,m){initializeCarbon(s,m);return s.A>1e-12?s.carbonA/s.A:m.c;}
function take(s,from,to,amount){amount=clamp(amount,0,s[from]);const key=reservoir(from),carbon=s[from]>0?s[key]*amount/s[from]:0;if(from==='K')s.boundaryK*=s.K>0?1-amount/s.K:0;s[from]-=amount;s[to]+=amount;s[key]-=carbon;s[reservoir(to)]=(s[reservoir(to)]||0)+carbon;return amount;}
// Teaching time constants; not fitted ZTA data or a quantitative grain-size model.
export function austenitize(s,m,T,dt,heatingRate=0){initializeCarbon(s,m);const q=critical(m);if(T<=q.a1)return 0;const limit=clamp((T-q.a1)/Math.max(1,q.a3-q.a1),0,1),old=s.A,oldP=s.P,oldB=s.B,oldMatrix=s.M+s.TM;
 const tau=(m.initialMorphology==='spheroidized'?100:45)*Math.exp(clamp(-(T-q.a3)/55,-4,4))*(1+Math.min(5,Math.max(0,heatingRate))/4);
 const hyper=m.id==='model'&&m.c>R.eutectoidCarbon;
 if(hyper){
  // Matrix austenitizes first; retained Fe3C has its own dissolution budget and clock.
  const available=1-s.A-s.K,amount=Math.max(0,available)*(-Math.expm1(-dt/tau));
  if(available>1e-12)for(const k of products.filter(k=>k!=='K'))take(s,k,'A',amount*s[k]/available);
  const gamma=austeniteSolubility(T),cap=clamp((gamma*s.A-s.carbonA)/(R.cementiteCarbon-gamma),0,s.K);
  const tauK=(m.initialMorphology==='spheroidized'?360:180)*Math.exp(clamp(-(T-q.a3)/65,-4,4));
  take(s,'K','A',cap*(-Math.expm1(-dt/tauK)));
 }else{
  const amount=Math.max(0,limit-s.A)*(-Math.expm1(-dt/tau)),available=1-s.A;
  if(available>1e-12)for(const k of products)take(s,k,'A',amount*s[k]/available);
 }

 if(s.A>old){s.uF=s.uP=s.uB=s.uK=0;s.minT=T;s.ready=true;s.pFine*=oldP>0?s.P/oldP:0;s.bLower*=oldB>0?s.B/oldB:0;s.spheroid*=oldP>0?s.P/oldP:0;s.temperRetention*=oldMatrix>0?(s.M+s.TM)/oldMatrix:0;s.homogeneity*=old/s.A;}
 if(s.A>0){s.homogeneity+=(1-s.homogeneity)*(-Math.expm1(-dt/(180*Math.exp(clamp(-(T-q.a3)/65,-4,4)))));s.grainIndex=Math.min(5,s.grainIndex+dt/20000*Math.exp(clamp((T-q.a3-40)/100,-5,3))*s.A);}
 s.maxA=Math.max(s.maxA||0,s.A);return s.A-old;
}
export function temper(s,m,T,dt){initializeCarbon(s,m);const matrix=s.M+s.TM;if(!(T>100&&T<critical(m).a1&&matrix>1e-12))return;
 // Arrhenius equivalent hours at 450 C; activation energies are illustrative, grade-dependent assumptions.
 const Q=m.id==='42crmo4'?155000:m.id==='16mncr5'?140000:130000;
 const d=dt/3600*Math.exp(clamp(Q/8.314*(1/723.15-1/(T+R.kelvinOffset)),-30,12));
 s.temperRetention*=Math.exp(-.35*d);s.temperDose=-Math.log(Math.max(1e-30,s.temperRetention/matrix))/.35;
 take(s,'M','TM',s.M*(-Math.expm1(-d)));s.maxTemper=Math.max(s.maxTemper||0,T);
}
// Independent proeutectoid precipitation. Carbon concentrations are wt.%;
// constituent amounts are mass fractions. No physical film thickness is inferred.
export function precipitateCementite(s,m,T,dt,start){initializeCarbon(s,m);if(m.id!=='model'||m.c<=R.eutectoidCarbon||s.A<=1e-12)return 0;
 const gamma=austeniteSolubility(T),cap=clamp((s.carbonA-gamma*s.A)/(R.cementiteCarbon-gamma),0,s.A);
 const t1=start(m,T,'K',s),old=s.uK||0;s.uK=old+(cap>0&&Number.isFinite(t1)?dt/t1*Math.sqrt(-Math.log(.99)):0);
 const amount=cap*(-Math.expm1(-(s.uK*s.uK-old*old)));
 s.A-=amount;s.K+=amount;s.boundaryK+=amount;s.carbonA-=amount*R.cementiteCarbon;s.carbonK+=amount*R.cementiteCarbon;return amount;
}
export function diffuse(s,m,T,dt,start){initializeCarbon(s,m);precipitateCementite(s,m,T,dt,start);const q=critical(m);
 // Ferrite rejects carbon into the remaining austenite; cap by the local tie-line budget.
 const gamma=clamp(R.eutectoidCarbon-(Math.max(0,T-q.a1)/Math.max(1,q.a3-q.a1))*(R.eutectoidCarbon-m.c),m.c,R.eutectoidCarbon),cf=Math.min(m.c,R.ferriteCarbon);
 const cap=gamma>cf?clamp((gamma*s.A-s.carbonA)/(gamma-cf),0,s.A):0;
 const oldF=s.uF||0,tF=start(m,T,'F',s);s.uF=oldF+(Number.isFinite(tF)?dt/tF*Math.sqrt(-Math.log(.99)):0);const ferrite=cap*(-Math.expm1(-(s.uF*s.uF-oldF*oldF)));
 s.A-=ferrite;s.F+=ferrite;s.carbonA-=ferrite*cf;s.carbonF+=ferrite*cf;
 const hazards={};let sum=0;for(const type of ['P','B']){const ts=start(m,T,type,s),key='u'+type,old=s[key]||0;s[key]=old+(Number.isFinite(ts)?dt/ts*Math.sqrt(-Math.log(.99)):0);hazards[type]=s[key]**2-old**2;sum+=hazards[type];}
 if(sum>0&&s.A>0){const c=austeniteCarbon(s,m),amount=s.A*(-Math.expm1(-sum)),fp=amount*hazards.P/sum,b=amount*hazards.B/sum,per=clamp((c-cf)/(R.eutectoidCarbon-cf),0,1),extraK=fp*clamp((c-R.eutectoidCarbon)/(R.cementiteCarbon-R.eutectoidCarbon),0,1),p=fp*per-extraK,f=fp-p-extraK;
 s.A-=amount;s.carbonA-=amount*c;s.F+=f;s.carbonF+=f*cf;s.P+=p;s.carbonP+=fp*c-f*cf-extraK*R.cementiteCarbon;s.K+=extraK;s.carbonK+=extraK*R.cementiteCarbon;s.B+=b;s.carbonB+=b*c;
 s.pFine+=p*clamp((650-T)/160,0,1);s.bLower+=b*clamp((400-T)/100,0,1);
 }
 // A fresh martensite cohort has no inherited tempering dose. Tempering ran before its birth.
 const c=austeniteCarbon(s,m),ms=q.ms-423*(c-m.c),old=Math.min(ms,s.minT);
 if(T<old&&s.A>0){const dm=s.A*(-Math.expm1(-.011*(old-T)));take(s,'A','M',dm);s.temperRetention+=dm;const matrix=s.M+s.TM;s.temperDose=matrix>0?-Math.log(Math.max(1e-30,s.temperRetention/matrix))/.35:0;}
 s.minT=Math.min(s.minT,T);
}
export function evolveMorphology(s,m,T,dt){initializeCarbon(s,m);if(T>550&&T<critical(m).a1&&s.P>0){const d=dt/14400*Math.exp(clamp((T-680)/35,-8,2));s.spheroid+=(s.P-s.spheroid)*(-Math.expm1(-d));}}
export function phaseBreakdown(s,m){initializeCarbon(s,m);const k=clamp((s.carbonP-R.ferriteCarbon*s.P)/(R.cementiteCarbon-R.ferriteCarbon),0,s.P);return {austenite:s.A,martensite:s.M,ferriticMatrix:s.F+s.P-k,cementite:k+s.K,bainiteUnresolved:s.B,temperedUnresolved:s.TM};}
export function conditionFactor(s){return (1+.4*Math.max(0,(s.grainIndex??1)-1))*(1+.5*(1-(s.homogeneity??1)));}
export function diagramInitialState(m){const s={A:1,F:0,P:0,B:0,M:0,TM:0,K:0,homogeneity:0,grainIndex:1};const q=critical(m),hold=m.hold??1200;s.homogeneity=1-Math.exp(-hold/(180*Math.exp(clamp(-(m.aust-q.a3)/65,-4,4))));s.grainIndex=Math.min(5,1+hold/20000*Math.exp(clamp((m.aust-q.a3-40)/100,-5,3)));return s;}
export function morphology(s){return {finePearlite:s.P>1e-9&&s.spheroid/s.P<.95?clamp(s.pFine/s.P,0,1):null,lowerBainite:s.B>1e-9?clamp(s.bLower/s.B,0,1):null,spheroidized:s.P>1e-9?clamp(s.spheroid/s.P,0,1):null,grainIndex:s.grainIndex,homogeneity:s.homogeneity};}
export function hollomonJaffe(T,timeSeconds,Cseconds){if(!(timeSeconds>0)||!Number.isFinite(Cseconds))return null;return (T+R.kelvinOffset)*(Math.log10(timeSeconds)+Cseconds);}
