"""Compile NIST Gibbs-energy lower hulls for local mass-balanced browser queries."""
from pathlib import Path
from io import StringIO
import argparse, gzip, hashlib, json, re
import numpy as np
from scipy.spatial import ConvexHull
from pycalphad import Database, calculate, Model

root = Path(__file__).resolve().parent
args = argparse.ArgumentParser()
args.add_argument("--system", choices=["sac","bisn","cusn"], required=True)
args.add_argument("--density", type=int, default=1600)
options = args.parse_args()
raw = (root/"NIST-solder.tdb").read_text()
source = re.sub(r"DATABASE_INFO.*?!", "", raw, flags=re.S).replace(",,N", " 6000 N")
db = Database(StringIO(source))
systems = {
    "sac": (["AG","CU","SN"], [107.87,63.546,118.69], sorted(set(list(range(100,1101,10))+list(range(200,241,2))+[215.9,217.2]))),
    "bisn": (["SN","BI"], [118.69,208.98], sorted(set(list(range(40,301,2))+[138.8]))),
    "cusn": (["SN","CU"], [118.69,63.546], sorted(set(list(range(100,1121,5))+[226.8,415,638.4,756.5,796]))),
}
components, masses, temperatures = systems[options.system]
# All admissible phases are sampled using the published database models.
phase_names = None
frames = []
point_sets = None
if options.system == "sac":
    sample = calculate(db,components+["VA"],list(db.phases),P=101325,T=500,output="GM",pdens=options.density)
    point_sets = {}
    for name, bounds in sample.attrs["phase_indices"].items():
        size=len(Model(db,components+["VA"],name).site_fractions)
        point_sets[name]=sample.Y.values.reshape(-1,sample.Y.shape[-1])[bounds,:size]
    fine=[]
    for ag in np.linspace(0,.1,101):
        for cu in np.linspace(0,.05,51):
            fine.append([ag,cu,1-ag-cu])
    fine=np.asarray(fine)
    point_sets["LIQUID"]=np.vstack([point_sets["LIQUID"],fine])
    point_sets["BCT_A5"]=np.vstack([point_sets["BCT_A5"],fine])
for ti, temperature in enumerate(temperatures):
    extra = {"points":point_sets} if point_sets is not None and temperature<310 else {}
    energy = calculate(db,components+["VA"],list(db.phases),P=101325,T=temperature+273.15,output="GM",pdens=options.density,**extra)
    enthalpy = calculate(db,components+["VA"],list(db.phases),P=101325,T=temperature+273.15,output="HM",pdens=options.density,**extra)
    names = energy.Phase.values.ravel()
    g = energy.GM.values.ravel()
    h = enthalpy.HM.values.ravel()
    x = energy.X.values.reshape(-1,len(components))
    # pycalphad sorts the component coordinate alphabetically.
    order = [list(energy.component.values).index(c) for c in components]
    x = np.clip(x[:,order],0,1)
    valid = np.isfinite(g) & np.isfinite(h) & np.all(np.isfinite(x),axis=1)
    valid &= np.abs(x.sum(axis=1)-1)<1e-7
    x,g,h,names=x[valid],g[valid],h[valid],names[valid]
    if phase_names is None: phase_names=sorted(set(names))
    # Normalize roundoff at pure endpoints without excluding Reinstoffe.
    x[x<1e-10]=0
    x[x>1-1e-10]=1
    coords = np.column_stack([x[:,:-1],g/10000])
    hull = ConvexHull(coords)
    facets = hull.simplices[hull.equations[:,-2]<-1e-9]
    used = np.unique(facets)
    lookup = {int(index):j for j,index in enumerate(used)}
    vertices = [[phase_names.index(str(names[i])), *np.round(x[i,:-1],10).tolist(), round(float(h[i]),4)] for i in used]
    faces = [[lookup[int(i)] for i in facet] for facet in facets]
    frames.append(dict(vertices=vertices,faces=faces))
    if ti%10==0: print(options.system,ti+1,len(temperatures),len(vertices),flush=True)
result = dict(version=2,components=components,masses=masses,T=temperatures,phases=phase_names,frames=frames,
              pressure=101325,density=options.density,source="NIST solder database, update 2017-08-04",
              sha256=hashlib.sha256(raw.encode()).hexdigest(),
              method="Lower convex hull of sampled published Gibbs-energy functions; barycentric phase balance",
              compositionResolution="Adaptive samples; density controls numerical approximation")
target=root/(options.system+"-hulls.json.gz")
with gzip.GzipFile(str(target),"wb",mtime=0) as f:
    f.write(json.dumps(result,separators=(",",":"),allow_nan=False).encode())
print(target.name,target.stat().st_size,flush=True)


