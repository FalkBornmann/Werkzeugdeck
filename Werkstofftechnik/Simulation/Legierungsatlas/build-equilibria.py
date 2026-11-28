"""Compile sampled NIST Gibbs hulls and thermodynamic phase grouping for local queries."""
from pathlib import Path
from io import StringIO
import argparse, gzip, hashlib, json, re, time
import numpy as np
from scipy.spatial import ConvexHull
from pycalphad import Database, calculate, Model, Workspace, variables as v
root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument("--system", choices=["sac","bisn","cusn","pbsnbi",*json.loads((root/"model-config.json").read_text(encoding="utf-8"))], required=True)
parser.add_argument("--density", type=int, default=1600)
parser.add_argument("--grid", type=int, default=60)
parser.add_argument("--refine", action="store_true")
options=parser.parse_args()
config=json.loads((root/"model-config.json").read_text(encoding="utf-8")).get(options.system,{})
database_file=config.get("database","NIST-solder.tdb")
raw=(root/database_file).read_text(encoding="utf-8-sig")
db=Database(StringIO(re.sub(r"DATABASE_INFO.*?!","",raw,flags=re.S).replace(",,N"," 6000 N")))
systems={
 "sac":(["AG","CU","SN"],[107.87,63.546,118.69],sorted(set(list(range(100,1101,10))+list(range(200,241,2))+[215.9,217.2]))),
 "bisn":(["SN","BI"],[118.69,208.98],sorted(set(list(range(40,301,2))+[138.8]))),
 "cusn":(["SN","CU"],[118.69,63.546],sorted(set(list(range(100,1121,5))+[226.8,415,638.4,756.5,796]))),
 "pbsnbi":(["BI","PB","SN"],[208.98,207.2,118.69],sorted(set(list(range(20,351,2))+[98.0,135.7]))),
}
extra_configs=json.loads((root/"model-config.json").read_text(encoding="utf-8"))
for key,cfg in extra_configs.items():
 temps=set(range(cfg["range"][0],cfg["range"][1]+1,cfg["range"][2]))|set(cfg["extra"])
 if "fine" in cfg:temps.update(range(cfg["fine"][0],cfg["fine"][1]+1,cfg["fine"][2]))
 systems[key]=(cfg["components"],cfg["masses"],sorted(temps))
components,masses,temperatures=systems[options.system]
comps=components+["VA"]
available_phases=[p for p in config.get("phases",list(db.phases)) if p not in config.get("excludePhases",[])]
seed=calculate(db,comps,available_phases,P=101325,T=500,output="GM",pdens=options.density)
point_sets={}
for name,bounds in seed.attrs["phase_indices"].items():
 size=len(Model(db,comps,name).site_fractions)
 point_sets[name]=seed.Y.values.reshape(-1,seed.Y.shape[-1])[bounds,:size]
# Common regular supports avoid directional noise in the single-sublattice solutions.
if len(components)==3:
 n=options.grid
 grid=np.asarray([[a/n,b/n,1-(a+b)/n] for a in range(n+1) for b in range(n+1-a)])
 for name in ["LIQUID","FCC_A1","BCT_A5","HCP_A3","DIAMOND_A4"]:
  if name not in point_sets: continue
  model=Model(db,comps,name)
  sites=model.site_fractions
  if [str(s.species) for s in sites[:3]]==sorted(components):
   values=np.hstack([grid,np.ones((len(grid),len(sites)-3))])
   point_sets[name]=np.vstack([point_sets[name],values])
if options.system in ["almgsi","alcusi","alcumg","agpbsn"]:
 # Resolve strong solution curvature at dilute corners independently of the equilibrium support set.
 trace=[0.,.00001,.0001,.0005,.001,.002,.003,.005,.0075,.01,.015,.02,.03,.04,.05,.075,.1,.125,.15,.2,.25,.3]
 dense=[]
 for major in range(3):
  for a in trace:
   for b in trace:
    cx=[0.,0.,0.];cx[major]=1-a-b;cx[(major+1)%3]=a;cx[(major+2)%3]=b;dense.append(cx)
 dense=np.unique(np.asarray(dense),axis=0)
 for name in ["LIQUID","FCC_A1","BCT_A5","HCP_A3","DIAMOND_A4"]:
  if name not in point_sets:continue
  sites=Model(db,comps,name).site_fractions
  if [str(s.species) for s in sites[:3]]==sorted(components):
   point_sets[name]=np.vstack([point_sets[name],np.hstack([dense,np.ones((len(dense),len(sites)-3))])])
if options.refine and len(components)==3:
 cache=root/"qa"/(options.system+("-equilibrium-support-v3-" if options.system in ["agbisn","bicusn","almgsi","alcusi","alcumg","agpbsn"] else "-equilibrium-support-v2-")+hashlib.sha256(raw.encode()).hexdigest()[:10]+".npz")
 cache.parent.mkdir(exist_ok=True)
 if cache.exists():
  supports=dict(np.load(cache))
 else:
  supports={name:[] for name in point_sets}
  w=Workspace(db,comps,available_phases,{v.P:101325,v.N:1,v.T:500,v.X(components[0]):.3,v.X(components[1]):.3})
  step=50 if max(temperatures)>500 else 20
  temperatures_to_refine=list(range(int(min(temperatures)),int(max(temperatures))+1,step))
  if options.system in ["agbisn","bicusn"]: temperatures_to_refine=sorted(set(temperatures_to_refine+list(range(int(min(temperatures)),351,10))))
  sample_x=[[a/8,b/8,1-(a+b)/8] for a in range(9) for b in range(9-a)]
  # Additional dilute states, independent of any test compositions.
  sample_x += [[.98,.01,.01],[.95,.04,.01],[.9,.07,.03],[.8,.12,.08]]
  sample_x += [[a,b,1-a-b] for a in [.005,.02,.05,.1] for b in [.005,.02,.05,.1]]
  if options.system in ["sac","agbisn","bicusn","almgsi","alcusi","alcumg","agpbsn"]:
   for absent in range(3):
    for dilute in ([.001,.005,.01,.02,.05,.1] if options.system in ["agbisn","bicusn","almgsi","alcusi","alcumg","agpbsn"] else [.005,.02,.05,.1]):
     for ratio in (np.linspace(.025,.975,20) if options.system in ["agbisn","bicusn","almgsi","alcusi","alcumg","agpbsn"] else np.linspace(.05,.95,10)):
      cx=[0.,0.,0.];cx[absent]=dilute;cx[(absent+1)%3]=(1-dilute)*ratio;cx[(absent+2)%3]=(1-dilute)*(1-ratio);sample_x.append(cx)
  if options.system in ["almgsi","alcusi","alcumg","agpbsn"]:
   # Fixed dilute vertex supports resolve homogeneous solution curvature near pure corners.
   for major in range(3):
    for a in [.0001,.0005,.001,.003,.005,.01,.015,.02,.03,.05]:
     for b in [.0001,.001,.005,.01,.03]:
      cx=[0.,0.,0.];cx[major]=1-a-b;cx[(major+1)%3]=a;cx[(major+2)%3]=b;sample_x.append(cx)
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
frame_refiner=None
if options.system in ["almgsi","alcusi","alcumg","agpbsn"]:
 frame_refiner=Workspace(db,comps,available_phases,{v.P:101325,v.N:1,v.T:500,v.X(components[0]):.3,v.X(components[1]):.3})
 frame_bulk=[[a/4,b/4,1-(a+b)/4] for a in range(5) for b in range(5-a)]
 for major in range(3):
  for a,b in [(.015,.005),(.005,.015),(.03,.01),(.01,.03),(.075,.025),(.025,.075),(.15,.05),(.05,.15)]:
   cx=[0.,0.,0.];cx[major]=1-a-b;cx[(major+1)%3]=a;cx[(major+2)%3]=b;frame_bulk.append(cx)
frames=[];phase_names=None;start=time.time()
for ti,temperature in enumerate(temperatures):
 points=dict(point_sets)
 if frame_refiner is not None:
  local={name:[] for name in point_sets}
  for cx in frame_bulk:
   frame_refiner.conditions={v.P:101325,v.N:1,v.T:temperature+273.15,v.X(components[0]):cx[0],v.X(components[1]):cx[1]}
   for cs in frame_refiner.get_composition_sets():
    name=cs.phase_record.phase_name
    if cs.NP>1e-7 and name in local:local[name].append(np.array(cs.dof[len(cs.phase_record.state_variables):],dtype=float))
  for name,values in local.items():
   if values:points[name]=np.vstack([points[name],np.asarray(values)])
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
 # Infinitesimal optimizer endpoint bounds are numerical limits, not extra phases.
 x[x<1e-8]=0;x[x>1-1e-8]=1
 x=np.round(x,10);x/=x.sum(axis=1)[:,None]
 # At identical composition only the lowest Gibbs energy can enter the lower hull.
 # Remove redundant coincident points before Qhull rather than perturbing the data.
 order_g=np.argsort(g);_,unique=np.unique(x[order_g,:-1],axis=0,return_index=True)
 keep=order_g[unique];x,g,h,y,names=x[keep],g[keep],h[keep],y[keep],names[keep]
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
 phaseTolerance=config.get("phaseTolerance",1e-7),directBoundaries=config.get("directBoundaries",False),activePhases=available_phases,pressure=101325,density=options.density,grid=options.grid,refined=options.refine,source=config.get("source","NIST solder database, update 2017-08-04"),database=database_file,excludedPhases=config.get("excludePhases",[]),
 sha256=hashlib.sha256(raw.encode()).hexdigest(),
 method="Gibbs-energy lower hull with homogeneous-midpoint curvature test for phase grouping",
 compositionResolution="Regular simplex, dilute supports, and per-temperature optimized states for new ternaries; phase grouping preserves nonconvex chords")
if options.system=="pbsnbi": result["phaseLabels"]={"FCC_A1":"ÃƒÅ½Ã‚Â±-Pb", "HCP_A3":"ÃƒÅ½Ã‚Âµ-Pb", "BCT_A5":"ÃƒÅ½Ã‚Â²-Sn", "RHOMBO_A7":"Bi"}
if options.system in extra_configs: result["phaseLabels"]=extra_configs[options.system].get("labels",{})
target=root/(options.system+"-hulls.json.gz")
with gzip.GzipFile(str(target), "wb",mtime=0) as f: f.write(json.dumps(result,separators=(",",":"),allow_nan=False).encode())
print(target.name,target.stat().st_size,"bytes",flush=True)
