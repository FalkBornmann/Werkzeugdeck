"""Compile sampled NIST Gibbs hulls and thermodynamic phase grouping for local queries."""
from pathlib import Path
from io import StringIO
import argparse, gzip, hashlib, json, re, time
import numpy as np
from scipy.spatial import ConvexHull
from pycalphad import Database, calculate, Model, Workspace, variables as v
root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument("--system", choices=["sac","bisn","cusn","pbsnbi"], required=True)
parser.add_argument("--density", type=int, default=1600)
parser.add_argument("--grid", type=int, default=60)
parser.add_argument("--refine", action="store_true")
options=parser.parse_args()
raw=(root/"NIST-solder.tdb").read_text()
db=Database(StringIO(re.sub(r"DATABASE_INFO.*?!","",raw,flags=re.S).replace(",,N"," 6000 N")))
systems={
 "sac":(["AG","CU","SN"],[107.87,63.546,118.69],sorted(set(list(range(100,1101,10))+list(range(200,241,2))+[215.9,217.2]))),
 "bisn":(["SN","BI"],[118.69,208.98],sorted(set(list(range(40,301,2))+[138.8]))),
 "cusn":(["SN","CU"],[118.69,63.546],sorted(set(list(range(100,1121,5))+[226.8,415,638.4,756.5,796]))),
 "pbsnbi":(["BI","PB","SN"],[208.98,207.2,118.69],sorted(set(list(range(20,351,2))+[98.0,135.7]))),
}
components,masses,temperatures=systems[options.system]
comps=components+["VA"]
seed=calculate(db,comps,list(db.phases),P=101325,T=500,output="GM",pdens=options.density)
point_sets={}
for name,bounds in seed.attrs["phase_indices"].items():
 size=len(Model(db,comps,name).site_fractions)
 point_sets[name]=seed.Y.values.reshape(-1,seed.Y.shape[-1])[bounds,:size]
# Common regular supports avoid directional noise in the single-sublattice solutions.
if len(components)==3:
 n=options.grid
 grid=np.asarray([[a/n,b/n,1-(a+b)/n] for a in range(n+1) for b in range(n+1-a)])
 for name in ["LIQUID","FCC_A1","BCT_A5"]:
  if name not in point_sets: continue
  model=Model(db,comps,name)
  sites=model.site_fractions
  if [str(s.species) for s in sites[:3]]==sorted(components):
   values=np.hstack([grid,np.ones((len(grid),len(sites)-3))])
   point_sets[name]=np.vstack([point_sets[name],values])
if options.refine and len(components)==3:
 cache=root/"qa"/(options.system+"-equilibrium-support-v2-"+hashlib.sha256(raw.encode()).hexdigest()[:10]+".npz")
 cache.parent.mkdir(exist_ok=True)
 if cache.exists():
  supports=dict(np.load(cache))
 else:
  supports={name:[] for name in point_sets}
  w=Workspace(db,comps,list(db.phases),{v.P:101325,v.N:1,v.T:500,v.X(components[0]):.3,v.X(components[1]):.3})
  step=50 if options.system=="sac" else 20
  temperatures_to_refine=list(range(int(min(temperatures)),int(max(temperatures))+1,step))
  sample_x=[[a/8,b/8,1-(a+b)/8] for a in range(9) for b in range(9-a)]
  # Additional dilute states, independent of any test compositions.
  sample_x += [[a,b,1-a-b] for a in [.005,.02,.05,.1] for b in [.005,.02,.05,.1]]
  if options.system=="sac":
   for absent in range(3):
    for dilute in [.005,.02,.05,.1]:
     for ratio in np.linspace(.05,.95,10):
      cx=[0.,0.,0.];cx[absent]=dilute;cx[(absent+1)%3]=(1-dilute)*ratio;cx[(absent+2)%3]=(1-dilute)*(1-ratio);sample_x.append(cx)
  for tc in temperatures_to_refine:
   for cx in sample_x:
    w.conditions={v.P:101325,v.N:1,v.T:tc+273.15,v.X(components[0]):cx[0],v.X(components[1]):cx[1]}
    for cs in w.get_composition_sets():
     name=cs.phase_record.phase_name
     if name in supports:
      supports[name].append(np.array(cs.dof[len(cs.phase_record.state_variables):],dtype=float))
   print("optimized supports",options.system,tc,flush=True)
  supports={name:np.unique(np.round(np.asarray(points),10),axis=0) for name,points in supports.items() if len(points)}
  np.savez_compressed(cache,**supports)
 for name,values in supports.items():
  if len(values):point_sets[name]=np.vstack([point_sets[name],values])
fine=None
if options.system=="sac":
 fine=np.asarray([[ag/1000,cu/1000,1-(ag+cu)/1000] for ag in range(101) for cu in range(51)])
frames=[];phase_names=None;start=time.time()
for ti,temperature in enumerate(temperatures):
 points=dict(point_sets)
 if fine is not None and temperature<310:
  for name in ["LIQUID","BCT_A5"]: points[name]=np.vstack([point_sets[name],fine])
 energy=calculate(db,comps,list(points),P=101325,T=temperature+273.15,output="GM",points=points)
 enthalpy=calculate(db,comps,list(points),P=101325,T=temperature+273.15,output="HM",points=points)
 names=energy.Phase.values.ravel()
 g=energy.GM.values.ravel();h=enthalpy.HM.values.ravel()
 y=energy.Y.values.reshape(-1,energy.Y.shape[-1])
 order=[list(energy.component.values).index(c) for c in components]
 x=np.clip(energy.X.values.reshape(-1,len(components))[:,order],0,1)
 valid=np.isfinite(g)&np.isfinite(h)&np.all(np.isfinite(x),axis=1)&(np.abs(x.sum(axis=1)-1)<1e-7)
 x,g,h,y,names=x[valid],g[valid],h[valid],y[valid],names[valid]
 if phase_names is None: phase_names=sorted(set(names))
 x[x<1e-10]=0;x[x>1-1e-10]=1
 hull=ConvexHull(np.column_stack([x[:,:-1],g/10000]))
 facets=hull.simplices[hull.equations[:,-2]<-1e-9]
 used=np.unique(facets);lookup={int(index):j for j,index in enumerate(used)}
 # A same-phase chord is one homogeneous phase only if an actual homogeneous
 # midpoint is at or below the chord. Positive excess indicates a miscibility gap.
 edges={}
 for facet in facets:
  for ia in range(len(facet)):
   for ib in range(ia+1,len(facet)):
    a,b=sorted([int(facet[ia]),int(facet[ib])])
    if names[a]==names[b]: edges[(a,b)]=False
 for name in set(names[used]):
  pairs=[pair for pair in edges if names[pair[0]]==name]
  if not pairs: continue
  size=len(Model(db,comps,str(name)).site_fractions)
  mid=np.asarray([(y[a,:size]+y[b,:size])/2 for a,b in pairs])
  values=calculate(db,comps,[str(name)],P=101325,T=temperature+273.15,output="GM",points={str(name):mid}).GM.values.ravel()
  for pair,value in zip(pairs,values):
   edges[pair]=bool(value<=(g[pair[0]]+g[pair[1]])/2+1e-5)
 groups=[]
 for facet in facets:
  parent=list(range(len(facet)))
  def find(i):
   while parent[i]!=i: i=parent[i]
   return i
  for ia in range(len(facet)):
   for ib in range(ia+1,len(facet)):
    a,b=sorted([int(facet[ia]),int(facet[ib])])
    if edges.get((a,b),False): parent[find(ib)]=find(ia)
  groups.append([find(i) for i in range(len(facet))])
 vertices=[[phase_names.index(str(names[i])),*np.round(x[i,:-1],10).tolist(),round(float(h[i]),4)] for i in used]
 frames.append(dict(vertices=vertices,faces=[[lookup[int(i)] for i in facet] for facet in facets],groups=groups))
 if ti%10==0: print(options.system,ti+1,len(temperatures),len(vertices),round(time.time()-start,1),flush=True)
result=dict(version=3,components=components,masses=masses,T=temperatures,phases=phase_names,frames=frames,
 pressure=101325,density=options.density,grid=options.grid,refined=options.refine,source="NIST solder database, update 2017-08-04",
 sha256=hashlib.sha256(raw.encode()).hexdigest(),
 method="Gibbs-energy lower hull with homogeneous-midpoint curvature test for phase grouping",
 compositionResolution="Regular simplex plus phase samples and fine tin-rich supports; phase grouping preserves nonconvex chords")
if options.system=="pbsnbi": result["phaseLabels"]={"FCC_A1":"α-Pb", "HCP_A3":"ε-Pb", "BCT_A5":"β-Sn", "RHOMBO_A7":"Bi"}
target=root/(options.system+"-hulls.json.gz")
with gzip.GzipFile(str(target), "wb",mtime=0) as f: f.write(json.dumps(result,separators=(",",":"),allow_nan=False).encode())
print(target.name,target.stat().st_size,"bytes",flush=True)
