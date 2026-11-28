// Versioned conventions, independent of process inputs. Mass fractions, C in wt.%.
export const REFERENCE=Object.freeze({version:'FeC-727-076-v1',eutectoidTemperature:727,eutectoidCarbon:.76,ferriteCarbon:.022,cementiteCarbon:6.67,steelLimit:2,kelvinOffset:273.15});
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function upperBoundary(c){return c<=REFERENCE.eutectoidCarbon?REFERENCE.eutectoidTemperature+(910-REFERENCE.eutectoidTemperature)*(1-Math.sqrt(c/REFERENCE.eutectoidCarbon)):REFERENCE.eutectoidTemperature+220*(c-REFERENCE.eutectoidCarbon);}
export function critical(m){return {a1:m.ac1??REFERENCE.eutectoidTemperature,a3:m.ac3??upperBoundary(m.c),ms:m.msRef??539-423*m.c-30.4*m.mn-17.7*m.ni-12.1*m.cr-7.5*m.mo};}

// Linear, fixed Fe–C solubility approximation, not a CALPHAD assessment.
export function austeniteSolubility(T){return clamp(REFERENCE.eutectoidCarbon+Math.max(0,T-REFERENCE.eutectoidTemperature)/220,REFERENCE.eutectoidCarbon,REFERENCE.cementiteCarbon-1e-6);}
