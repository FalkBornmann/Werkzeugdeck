// Penalized curvature fit, with junction endpoints fixed. One transition is shared by both adjoining fields.
export function smoothTemperatures(values,lambda=1200){
 const n=values.length;if(n<5||Math.max(...values)-Math.min(...values)<1e-7)return values.slice();
 const a=Array(n).fill(0),b=Array(n).fill(0),c=Array(n).fill(0),rhs=values.slice();
 for(let i=0;i<n;i++){const w=i===0||i===n-1?1e7:1;a[i]=w;rhs[i]*=w}
 for(let i=0;i<n-2;i++){a[i]+=lambda;a[i+1]+=4*lambda;a[i+2]+=lambda;b[i+1]-=2*lambda;b[i+2]-=2*lambda;c[i+2]+=lambda}
 const d=[],l=[],m=[],y=[],out=Array(n);
 for(let i=0;i<n;i++){
  m[i]=i>1?c[i]/d[i-2]:0;l[i]=i?(b[i]-m[i]*(l[i-1]||0))/d[i-1]:0;
  d[i]=Math.sqrt(Math.max(1e-12,a[i]-l[i]*l[i]-m[i]*m[i]));
  y[i]=(rhs[i]-(i?l[i]*y[i-1]:0)-(i>1?m[i]*y[i-2]:0))/d[i];
 }
 for(let i=n-1;i>=0;i--)out[i]=(y[i]-(i+1<n?l[i+1]*out[i+1]:0)-(i+2<n?m[i+2]*out[i+2]:0))/d[i];
 out[0]=values[0];out[n-1]=values[n-1];return out;
}
export function smoothFieldBoundaries(columns){
 const runs=[],active=new Map();
 columns.forEach((column,i)=>{
  const next=new Map();
  for(let j=0;j<column.bands.length-1;j++){
   const low=column.bands[j],high=column.bands[j+1],key=low.signature+'|'+high.signature;
   const run=active.get(key)||[];if(!active.has(key))runs.push(run);
   run.push({i,j,value:low.upper});next.set(key,run);
  }
  active.clear();for(const [k,v] of next)active.set(k,v);
 });
 for(const run of runs){
  const values=smoothTemperatures(run.map(p=>p.value));
  run.forEach((p,k)=>{columns[p.i].bands[p.j].upper=values[k];columns[p.i].bands[p.j+1].lower=values[k]});
 }
 // Fixed liquidus and solidus anchors have precedence over interpolation, on both sides of a boundary.
 for(const column of columns){
  const {bands,boundaries}=column;
  for(let j=0;j<bands.length-1;j++){
   let t=bands[j].upper;
   if(bands[j].allLiquid!==bands[j+1].allLiquid&&boundaries.liquidus.length===1)t=boundaries.liquidus[0].temperature;
   else if(bands[j].hasLiquid!==bands[j+1].hasLiquid&&boundaries.solidus.length===1)t=boundaries.solidus[0].temperature;
   bands[j].upper=t;bands[j+1].lower=t;
  }
  // Clamp interior phase changes between the nearest fixed melting boundaries, retaining field order.
  for(let j=0;j<bands.length;j++){
   const b=bands[j],S=boundaries.solidus[0]?.temperature,L=boundaries.liquidus[0]?.temperature;
   if(S!==undefined&&!b.hasLiquid){b.lower=Math.min(b.lower,S);b.upper=Math.min(b.upper,S)}
   if(S!==undefined&&b.hasLiquid){b.lower=Math.max(b.lower,S);b.upper=Math.max(b.upper,S)}
   if(L!==undefined&&!b.allLiquid){b.lower=Math.min(b.lower,L);b.upper=Math.min(b.upper,L)}
   if(L!==undefined&&b.allLiquid){b.lower=Math.max(b.lower,L);b.upper=Math.max(b.upper,L)}
   if(j){const joint=Math.max(bands[j-1].lower,Math.min(b.upper,(b.lower+bands[j-1].upper)/2));bands[j-1].upper=joint;b.lower=joint}
   b.upper=Math.max(b.lower,b.upper);
  }
 }
 return columns;
}