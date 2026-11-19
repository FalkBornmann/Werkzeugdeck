import {solve,profile,thresholds,interpolate,toMoles,toMass} from './equilibrium.js';
let model,latestLoad=0;
function boundary(x,kind){
  let lo=0,hi=model.T.length-1;
  const test=i=>{const s=solve(model,x,i);return s&&(kind==='liquidus'?s.liquid>1-1e-7:s.liquid>1e-7)};
  if(!test(hi))return null;
  if(test(0))return null;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(test(mid))hi=mid;else lo=mid}
  return (model.T[hi]+model.T[lo])/2;
}
self.onmessage=async({data:message})=>{
 try{
  if(message.type==='load'){
    latestLoad=message.id;
    const response=await fetch(message.key+'-hulls.json.gz');
    if(!response.ok)throw Error('Modelldatei konnte nicht geladen werden');
    const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
    const loaded=await new Response(stream).json();
    if(message.id!==latestLoad)return;
    model=loaded;
    postMessage({type:'loaded',id:message.id,model});
  }
  if(message.type==='section'){
    const columns=[];
    for(let i=0;i<=100;i++){
      const c=message.basis==='mass'?toMoles(interpolate(toMass(message.a,model.masses),toMass(message.b,model.masses),i/100),model.masses):interpolate(message.a,message.b,i/100);
      columns.push({x:c,series:profile(model,c)});
    }
    postMessage({type:'section',id:message.id,columns});
  }
  if(message.type==='surface'){
    const nodes=[],triangles=[],map=new Map(),n=32;
    const vertices=message.vertices;
    for(let j=0;j<=n;j++)for(let i=0;i<=n-j;i++){
      const x=vertices[0].map((_,k)=>vertices[0][k]*(1-(i+j)/n)+vertices[1][k]*i/n+vertices[2][k]*j/n);
      const value=boundary(x,'liquidus');
      let primary='';
      if(value!==null){
        const ti=Math.max(0,model.T.findIndex(t=>t>=value)-1);
        primary=solve(model,x,ti)?.phases.filter(p=>p.raw!=='LIQUID').map(p=>p.name).join(' + ')||'';
      }
      map.set(i+','+j,nodes.length);nodes.push({x,value,primary});
    }
    for(let j=0;j<n;j++)for(let i=0;i<n-j;i++){
      triangles.push([map.get(i+','+j),map.get((i+1)+','+j),map.get(i+','+(j+1))]);
      if(i+j<n-1)triangles.push([map.get((i+1)+','+j),map.get((i+1)+','+(j+1)),map.get(i+','+(j+1))]);
    }
    postMessage({type:'surface',id:message.id,nodes,triangles});
  }
 }catch(error){postMessage({type:'error',id:message.id,message:error.message})}
};


