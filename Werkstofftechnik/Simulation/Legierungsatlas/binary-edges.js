// Binary views evaluate the original ternary model at exactly zero third component.
export function liftEdge(x,indices){const v=[0,0,0];indices.forEach((k,i)=>v[k]=x[i]);return v}
export function projectEdgeSample(sample,indices){
 if(!sample||sample.unavailable)return {...sample,phases:[],liquid:null,enthalpy:NaN,unavailable:true,signature:'Keine Modelldaten'};
 const missing=[0,1,2].find(i=>!indices.includes(i));
 if(sample.phases.reduce((s,p)=>s+p.fraction*p.x[missing],0)>1e-6||sample.phases.some(p=>indices.reduce((s,k)=>s+p.x[k],0)<1e-12))
  return {phases:[],liquid:null,enthalpy:NaN,unavailable:true,signature:'Rand numerisch nicht aufgelöst'};
 return {...sample,phases:sample.phases.map(p=>{const x=indices.map(k=>p.x[k]),sum=x.reduce((a,b)=>a+b,0);return {...p,x:x.map(v=>v/sum)}})};
}
export function makeBinaryEdge(parent,definition,surface=null,references=[]){
 const indices=definition.edge.indices,missing=[0,1,2].find(i=>!indices.includes(i));
 if(parent.components.length!==3||indices.length!==2||new Set(indices).size!==2||indices.some(i=>![0,1,2].includes(i)))throw Error('Ungültiger ternärer Rand');
 const points=rows=>(rows||[]).filter(p=>Math.abs(p.x[missing])<1e-8).map(p=>({...p,x:indices.map(k=>p.x[k])}));
 const {frames,diagram,solidusDisplay,...metadata}=parent;
 return {...metadata,system:definition.id,components:indices.map(k=>parent.components[k]),masses:indices.map(k=>parent.masses[k]),
  edgeSource:definition.edge,parentModel:parent,edgeLiquidus:surface,
  solidusDisplay:solidusDisplay?{edge:true}:null,edgeReferences:points(references),
  diagram:diagram?{references:points(diagram.references),specialPoints:points(diagram.specialPoints)}:undefined,
  diagramNote:parent.diagramNote,sourceLabel:parent.sourceLabel};
}
