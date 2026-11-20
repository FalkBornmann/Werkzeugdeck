import {contourSegments} from './equilibrium.js';
import {joinContours,simplifyContour,roundContour} from './geometry.js';
import {surfaceTemperature} from './boundary.js';
const cache=new WeakMap();
export function liquidusGeometry(surface,interval=50){
 let map=cache.get(surface);if(!map){map=new Map();cache.set(surface,map)}
 if(map.has(interval))return map.get(interval);
 const vals=surface.nodes.map(n=>n.value).filter(Number.isFinite),isotherms=[];
 for(let t=Math.ceil(Math.min(...vals)/interval)*interval;t<=Math.max(...vals);t+=interval)
  isotherms.push({t,paths:joinContours(contourSegments(surface.nodes,surface.triangles,t))});
 const reactions=[];
 for(const [pair,segments] of Object.entries(surface.reactionSegments||{})){
  for(const points of joinContours(segments,2)){
   const length=points.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
   if(length<.014)continue;
   // Remove mesh-scale corners inside the original support spacing; retain junction endpoints.
   const xy=roundContour(simplifyContour(points.map(p=>p.slice(0,2)),.0025),2);
   const path=xy.map(p=>{const x=[p[0],p[1],Math.max(0,1-p[0]-p[1])];return {x,t:surfaceTemperature(surface,x)}});
   reactions.push({pair,path});
  }
 }
 const result={isotherms,reactions};map.set(interval,result);return result;
}

