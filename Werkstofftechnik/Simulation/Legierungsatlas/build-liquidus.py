"""Direct liquidus saturation calculations and continuous branch interpolation.
The offline solve fixes a solid phase at zero amount and frees temperature;
the maximum saturation temperature is checked against all-phase equilibrium.
"""
from pathlib import Path
from io import StringIO
import sys,re,copy,json,gzip,time
import numpy as np
from scipy.interpolate import RBFInterpolator,CloughTocher2DInterpolator
from scipy.spatial import cKDTree,Delaunay
from pycalphad import Database,Workspace,variables as v
from pycalphad.core.solver import Solver
from pycalphad.core.composition_set import CompositionSet
from pycalphad.mapping.utils import update_cs_phase_frac
sys.stdout.reconfigure(encoding="utf-8",errors="replace")
root=Path(__file__).resolve().parent
key=sys.argv[1]
model=json.load(gzip.open(root/(key+"-hulls.json.gz")))
components=model["components"]
raw=(root/model.get("database","NIST-solder.tdb")).read_text(encoding="utf-8-sig")
db=Database(StringIO(re.sub(r"DATABASE_INFO.*?!","",raw,flags=re.S).replace(",,N"," 6000 N")))
active=model.get("activePhases",list(db.phases))
seeds=json.loads((root/"qa"/(key+"-surface-seeds.json")).read_text())
cache=root/"qa"/(key+"-saturation-points-v2.json")
solver=Solver(remove_metastable=False)
base={v.P:101325,v.N:1}
w=Workspace(db,components+["VA"],active,{**base,v.T:800,v.X(components[0]):.3,v.X(components[1]):.3})
def cond(x,t):
 return {**base,v.T:t+273.15,**{v.X(c):x[i] for i,c in enumerate(components[:-1])}}
def sets_at(x,t):
 w.conditions=cond(x,t)
 return w.get_composition_sets()
def liquid_amount(sets):
 return sum(cs.NP for cs in sets if cs.phase_record.phase_name=="LIQUID")
def branch_name(cs):
 name=cs.phase_record.phase_name
 if name in ["FCC_A1","HCP_A3","BCT_A5","BCC_A2"]:name+="#"+components[int(np.argmax(np.array(cs.X)))]
 return name
def saturation(x,tc,solid0):
 solid=copy.deepcopy(solid0);solid.fixed=True;update_cs_phase_frac(solid,0.)
 liquid=CompositionSet(w.phase_record_factory["LIQUID"])
 liquid.update(np.array(x),1.,np.array([float(cond(x,tc)[k]) for k in liquid.phase_record.state_variables]))
 conditions=cond(x,tc);del conditions[v.T]
 try:
  result=solver.solve([liquid,solid],conditions)
  t=float(liquid.dof[list(liquid.phase_record.state_variables).index(v.T)]-273.15)
  if result.converged and -50<t<max(model["T"])+100 and np.max(np.abs(np.array(liquid.X)-x))<1e-6:
   return dict(t=t,branch=branch_name(solid),solid=list(np.array(solid.X)),raw=solid.phase_record.phase_name)
 except Exception:pass
 return None
rows=json.loads(cache.read_text()) if cache.exists() else []
done={tuple(np.round(r['x'],9)) for r in rows}
pending=[s for s in seeds if tuple(np.round(s['x'],9)) not in done]
if pending:
 start=time.time()
 for i,seed in enumerate(pending):
  # Keep the 0/100 percent vertices, but numerical solvers use an infinitesimal interior limit.
  original=np.array(seed["x"]);x=np.maximum(original,1e-10);x/=x.sum()
  bracket=seed["bracket"] or [0,1100];tc=float(bracket[0]-2)
  sets=sets_at(x,tc)
  if not any(cs.phase_record.phase_name!="LIQUID" for cs in sets):
   tc-=20;sets=sets_at(x,tc)
  candidates=[saturation(x,tc,cs) for cs in sets if cs.phase_record.phase_name!="LIQUID"]
  candidates=[q for q in candidates if q and abs(q["t"]-np.mean(bracket))<100]
  best=max(candidates,key=lambda q:q["t"]) if candidates else None
  if best is None or liquid_amount(sets_at(x,best["t"]+.1))<.99999 or liquid_amount(sets_at(x,best["t"]-.2))>.9999999:
   lo=bracket[0]-30;hi=bracket[1]+30
   while liquid_amount(sets_at(x,hi))<.99999:hi+=50
   for _ in range(10):
    mid=(lo+hi)/2
    if liquid_amount(sets_at(x,mid))>.99999:hi=mid
    else:lo=mid
   sets=sets_at(x,lo-.2)
   extra=[saturation(x,lo,cs) for cs in sets if cs.phase_record.phase_name!="LIQUID"]
   extra=[q for q in extra if q and abs(q["t"]-hi)<5]
   candidates.extend(extra)
   best=max(extra,key=lambda q:q["t"]) if extra else dict(t=(lo+hi)/2,branch="fallback",raw="fallback",solid=list(x))
  rows.append(dict(x=original.tolist(),t=best["t"],branch=best["branch"],candidates=candidates))
  if i%40==0:print(key,"saturation",i,len(seeds),round(time.time()-start,1),flush=True)
 cache.write_text(json.dumps(rows),encoding="utf-8")
points=np.array([r["x"][:2] for r in rows]);temps=np.array([r["t"] for r in rows])
global_fit=CloughTocher2DInterpolator(points,temps)
primary=sorted(set(r["branch"] for r in rows if r["branch"]!="fallback"))
fits=[];branch_points=[]
for name in primary:
 data=[]
 for r in rows:
  for q in r["candidates"]:
   if q["branch"]==name and q["t"]>=r["t"]-65:data.append([*r["x"][:2],q["t"]])
 data=np.array(data)
 if len(data)<4:continue
 _,idx=np.unique(np.round(data[:,:2],10),axis=0,return_index=True);data=data[idx]
 if len(data)<4 or np.linalg.matrix_rank(data[:,:2]-data[:,:2].mean(axis=0))<2:continue
 fits.append((name,RBFInterpolator(data[:,:2],data[:,2],kernel="thin_plate_spline",smoothing=1e-7,degree=1,neighbors=min(80,len(data)) if key in ["almgsi","alcusi","alcumg","agpbsn"] else None),cKDTree(data[:,:2])))
 branch_points.append(data)
n=240
coords=np.array([[1-(i+j)/n,i/n] for j in range(n+1) for i in range(n+1-j)])
reference=global_fit(coords)
# Qhull may classify floating-point edge coordinates a few ulps outside the hull.
# Evaluate only these boundary limits infinitesimally inside the same simplex.
invalid=~np.isfinite(reference)
if np.any(invalid):
 reference[invalid]=global_fit(coords[invalid]*(1-3e-10)+1e-10)
if not np.all(np.isfinite(reference)):raise ValueError("Non-finite interior liquidus interpolation")

scores=np.full((len(coords),len(fits)),-1e6)
for k,(name,fit,tree) in enumerate(fits):
 values=fit(coords);distance=tree.query(coords)[0]
 labels=np.array([r['branch'] for r in rows])
 tessellation=Delaunay(points)
 cells=tessellation.simplices[np.maximum(0,tessellation.find_simplex(coords,tol=1e-8))]
 allowed=np.any(labels[cells]==name,axis=1)
 scores[:,k]=np.where(allowed,values,-1e6)
ids=np.argmax(scores,axis=1);values=scores[np.arange(len(coords)),ids]
missing=values<-1e5
values[missing]=reference[missing]
# The display scalar interpolates checked liquidus temperatures directly. Branch selection is used for primary-field topology only.
values=reference
# Dense branch-crossing graph; intersections use equality of the two saturation surfaces.
lookup={};index=0
for j in range(n+1):
 for i in range(n+1-j):lookup[(i,j)]=index;index+=1
triangles=[]
for j in range(n):
 for i in range(n-j):
  triangles.append([lookup[(i,j)],lookup[(i+1,j)],lookup[(i,j+1)]])
  if i+j<n-1:triangles.append([lookup[(i+1,j)],lookup[(i+1,j+1)],lookup[(i,j+1)]])
segments={}
for face in triangles:
 labels=set(ids[face])
 if len(labels)<2:continue
 crossings=[]
 for ia,ib in [(0,1),(1,2),(2,0)]:
  a,b=face[ia],face[ib];pa,pb=int(ids[a]),int(ids[b])
  if pa==pb:continue
  da=scores[a,pa]-scores[a,pb];dbv=scores[b,pa]-scores[b,pb]
  f=float(np.clip(da/(da-dbv),0,1)) if abs(da-dbv)>1e-12 else .5
  position=(1-f)*coords[a]+f*coords[b];t=(1-f)*values[a]+f*values[b]
  crossings.append((tuple(sorted([pa,pb])),[*position.tolist(),float(t)]))
 if len(crossings)==2:
  pair=crossings[0][0];segments.setdefault(str(pair),[]).append([crossings[0][1],crossings[1][1]])
 elif len(crossings)==3:
  center=np.mean([p[1] for p in crossings],axis=0).tolist()
  for pair,point in crossings:segments.setdefault(str(pair),[]).append([point,center])
atlas=dict(version=1,system=key,components=components,n=n,branches=[name for name,_,_ in fits],
 nodes=[[round(float(t),5),int(k)] for t,k in zip(values,ids)],reactionSegments=segments,
 method="Direct zero-solid-fraction saturation, C1 Clough-Tocher liquidus interpolation; reconstructed primary-field topology",
 sampleCount=len(rows),fallbackCount=int(missing.sum()))
with gzip.GzipFile(str(root/(key+"-liquidus.json.gz")),"wb",mtime=0) as f:f.write(json.dumps(atlas,separators=(",",":"),allow_nan=False).encode())
print(key,"atlas saved",len(fits),"branches",len(rows),"samples",int(missing.sum()),"fallback nodes",flush=True)









