"""Direct liquid onset temperatures, independent of display temperature quantization."""
from pathlib import Path
from io import StringIO
import sys,re,json,gzip,time
import numpy as np
from scipy.interpolate import CloughTocher2DInterpolator,PchipInterpolator
from pycalphad import Database,Workspace,variables as v
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parent;key=sys.argv[1]
data=json.loads((root/'qa'/(key+'-solidus-seeds.json')).read_text())
components=data['components'];raw=(root/data.get('database','NIST-solder.tdb')).read_text(encoding='utf-8-sig')
db=Database(StringIO(re.sub(r'DATABASE_INFO.*?!','',raw,flags=re.S).replace(',,N',' 6000 N')))
def conditions(x,t):return {v.P:101325,v.N:1,v.T:t+273.15,**{v.X(c):x[i] for i,c in enumerate(components[:-1])}}
w=Workspace(db,components+['VA'],[p for p in db.phases if p not in data.get('excludedPhases',[])],conditions([1/len(components)]*len(components),300))
def liquid(x,t):
 w.conditions=conditions(x,t)
 return sum(cs.NP for cs in w.get_composition_sets() if cs.phase_record.phase_name=='LIQUID')
cache=root/'qa'/(key+'-solidus-direct.json')
rows=json.loads(cache.read_text()) if cache.exists() else []
done={tuple(np.round(q['x'],10)) for q in rows};start=time.time()
for i,seed in enumerate(data['seeds']):
 if tuple(np.round(seed['x'],10)) in done:continue
 x=np.maximum(seed['x'],1.01e-10);x/=sum(x)
 bracket=seed['bracket']
 if bracket is None or liquid(x,data['T'][0])>1e-7:rows.append(dict(x=seed['x'],t=None));continue
 lo,hi=bracket[0]-2,bracket[1]+2
 while liquid(x,lo)>1e-7:lo-=5
 while liquid(x,hi)<=1e-7:hi+=5
 for _ in range(12):
  mid=(lo+hi)/2
  if liquid(x,mid)>1e-7:hi=mid
  else:lo=mid
 rows.append(dict(x=seed['x'],t=(lo+hi)/2))
 if i%100==0:print(key,i,len(data['seeds']),round(time.time()-start,1),flush=True);cache.write_text(json.dumps(rows))
cache.write_text(json.dumps(rows))
valid=[q for q in rows if q['t'] is not None]
if len(components)==3:
 n=240;p=np.array([q['x'][:2] for q in valid]);temps=np.array([q['t'] for q in valid])
 fit=CloughTocher2DInterpolator(p,temps)
 coords=np.array([[1-(i+j)/n,i/n] for j in range(n+1) for i in range(n+1-j)])
 values=fit(coords)
 # Do not invent sub-eutectic minima through interpolator overshoot.
 values=np.clip(values,min(temps),max(temps))
else:
 n=800;valid.sort(key=lambda q:q['x'][0]);fit=PchipInterpolator([q['x'][0] for q in valid],[q['t'] for q in valid]);values=fit(np.linspace(0,1,n+1))
out=dict(version=1,n=n,components=components,nodes=[round(float(t),5) if np.isfinite(t) else None for t in values],sampleCount=len(rows),method='Direct liquid-onset equilibrium; C1 display interpolation')
with gzip.GzipFile(str(root/(key+'-solidus.json.gz')),'wb',mtime=0) as f:f.write(json.dumps(out,separators=(',',':'),allow_nan=False).encode())
print(key,'saved',len(rows),flush=True)