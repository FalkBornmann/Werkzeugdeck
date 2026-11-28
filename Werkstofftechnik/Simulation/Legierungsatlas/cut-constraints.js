// Composition-space line constraints. Inputs and outputs use the currently displayed percentage basis.
export function angleDirection(degrees){
 const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a),z=s/(Math.sqrt(3)/2),b=c-z/2;
 return [-b-z,b,z];
}
export function directionAngle(d){return (Math.atan2(Math.sqrt(3)/2*d[2],d[1]+d[2]/2)*180/Math.PI+360)%180}
export function constrainedCut(targets,a,b,angle){
 if(!targets.length)return {a,b,positions:{},angle:directionAngle(b.map((v,i)=>v-a[i]))};
 if(targets.length>2)throw Error('Höchstens zwei Punktbindungen sind möglich.');
 if(targets.length===2&&(targets[0].pointId===targets[1].pointId||targets[0].x.every((v,i)=>Math.abs(v-targets[1].x[i])<1e-9)))throw Error('Zwei Bindungen benötigen verschiedene Anker und verschiedene Ziele.');
 const origin=targets[0].x,d=targets.length===2?targets[1].x.map((v,i)=>v-origin[i]):angle===undefined?b.map((v,i)=>v-a[i]):angleDirection(angle);
 if(Math.hypot(...d)<1e-10)throw Error('Die Schnittrichtung ist nicht eindeutig.');
 let low=-Infinity,high=Infinity;
 d.forEach((v,i)=>{if(v>1e-12)low=Math.max(low,-origin[i]/v);if(v<-1e-12)high=Math.min(high,-origin[i]/v)});
 if(high-low<1e-9){if(targets.length===1&&angle===undefined)return constrainedCut(targets,origin,[1/3,1/3,1/3]);throw Error('Dieser Winkel berührt das Dreieck nur im Anker. Bitte einen anderen Winkel wählen.')}
 const norm=x=>{const q=x.map(v=>Math.max(0,v)),s=q.reduce((u,v)=>u+v,0);return q.map(v=>v/s)};
 const left=norm(origin.map((v,i)=>v+low*d[i])),right=norm(origin.map((v,i)=>v+high*d[i])),den=right.reduce((s,v,i)=>s+(v-left[i])**2,0);
 const positions=Object.fromEntries(targets.map(p=>[p.pointId,p.x.reduce((s,v,i)=>s+(v-left[i])*(right[i]-left[i]),0)/den]));
 return {a:left,b:right,positions,angle:directionAngle(d)};
}