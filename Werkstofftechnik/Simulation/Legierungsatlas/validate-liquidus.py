"""Hold-out direct equilibrium check of the display surface, independent of the surface samples."""
import sys,json,gzip
from pathlib import Path
import numpy as np
key=sys.argv[1]
source=Path('build-liquidus.py').read_text(encoding='utf-8-sig')
exec(source.split('rows=json.loads(cache.read_text())')[0])
a=json.load(gzip.open(key+'-liquidus.json.gz'));n=a['n']
def sample(x):
 u=x[1]*n;v0=x[2]*n;i=min(n-1,int(u));j=min(n-1-i,int(v0));f=u-i;g=v0-j
 def z(i,j):return a['nodes'][j*(n+1)-j*(j-1)//2+i][0]
 return (1-f-g)*z(i,j)+f*z(i+1,j)+g*z(i,j+1) if f+g<=1+1e-9 else (1-g)*z(i+1,j)+(f+g-1)*z(i+1,j+1)+(1-f)*z(i,j+1)
rng=np.random.default_rng(63117)
points=rng.dirichlet([1,1,1],32).tolist()
if key=='sac':points += [[.025,.009,.966],[.045,.025,.93],[.5,.48,.02],[.001,.001,.998]]
else:points += [[.3,.3,.4],[.05,.8,.15]]
results=[]
for x in points:
 bounds=json.load(gzip.open(root/(key+'-hulls.json.gz')))['T'];lo=bounds[0]-20;hi=bounds[-1]
 for _ in range(18):
  mid=(lo+hi)/2
  if liquid_amount(sets_at(x,mid))>1-1e-7:hi=mid
  else:lo=mid
 t=(hi+lo)/2;display=sample(x)
 results.append(dict(x=x,direct=t,display=display,error=abs(t-display)))
print(key,'hold-out max K',max(q['error'] for q in results),'mean K',np.mean([q['error'] for q in results]),flush=True)
(root/'tests'/('liquidus-reference-'+key+'.json')).write_text(json.dumps(results,indent=2),encoding='utf-8')

