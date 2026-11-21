"""Smooth binary liquidus from direct all-liquid onset, no ideal-solution assumption."""
from pathlib import Path
import sys,json,gzip,re,time
from io import StringIO
import numpy as np
from scipy.interpolate import PchipInterpolator
from pycalphad import Database,Workspace,variables as v
root=Path(__file__).resolve().parent
key=sys.argv[1];m=json.load(gzip.open(root/(key+'-hulls.json.gz')))
raw=(root/m.get('database','NIST-solder.tdb')).read_text(encoding='utf-8-sig')
db=Database(StringIO(re.sub(r'DATABASE_INFO.*?!','',raw,flags=re.S).replace(',,N',' 6000 N')))
comps=m['components'];phases=[p for p in db.phases if p not in m.get('excludedPhases',[])]
w=Workspace(db,comps+['VA'],phases,{v.P:101325,v.N:1,v.T:1000,v.X(comps[0]):.5})
seeds=json.loads((root/'qa'/(key+'-solidus-seeds.json')).read_text())['seeds']
points=[q['x'] for q in seeds]
if key=='alsi':points.append([.874/26.98154/(.874/26.98154+.126/28.0855),.126/28.0855/(.874/26.98154+.126/28.0855)])
if key=='alcu':points.append([.67/26.98154/(.67/26.98154+.33/63.546),.33/63.546/(.67/26.98154+.33/63.546)])
cache=root/'qa'/(key+'-binary-liquidus-direct.json')
rows=json.loads(cache.read_text()) if cache.exists() else []
done={tuple(np.round(q['x'],10)) for q in rows};start=time.time()
def melt(x,t):
 w.conditions={v.P:101325,v.N:1,v.T:t+273.15,v.X(comps[0]):float(x[0])}
 return sum(cs.NP for cs in w.get_composition_sets() if cs.phase_record.phase_name=='LIQUID')
for i,original in enumerate(points):
 if tuple(np.round(original,10)) in done:continue
 x=np.clip(original,1.01e-10,1-1.01e-10);x/=sum(x)
 lo=m['T'][0];hi=m['T'][-1]
 for _ in range(18):
  mid=(lo+hi)/2
  if melt(x,mid)>1-1e-7:hi=mid
  else:lo=mid
 rows.append(dict(x=original,t=(lo+hi)/2))
 if i%80==0:print(key,'liquidus',i,round(time.time()-start,1),flush=True);cache.write_text(json.dumps(rows))
cache.write_text(json.dumps(rows));rows.sort(key=lambda q:q['x'][0])
out=json.load(gzip.open(root/(key+'-solidus.json.gz')));n=out['n']
out['liquidusNodes']=np.round(PchipInterpolator([q['x'][0] for q in rows],[q['t'] for q in rows])(np.linspace(0,1,n+1)),5).tolist()
out['liquidusMethod']='Direct all-liquid onset and shape-preserving binary interpolation'
with gzip.GzipFile(str(root/(key+'-solidus.json.gz')),'wb',mtime=0) as f:f.write(json.dumps(out,separators=(',',':'),allow_nan=False).encode())
print(key,'binary liquidus saved',flush=True)
