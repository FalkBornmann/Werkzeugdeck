"""Independent hold-out check for the liquid-onset display surface."""
import json,gzip,sys
from pathlib import Path
import numpy as np
source=Path('build-solidus.py').read_text(encoding='utf-8-sig')
exec(source.split("cache=root/")[0])
a=json.load(gzip.open(key+'-solidus.json.gz'));n=a['n']
def sample(x):
 if len(components)==2:
  p=x[0]*n;i=min(n-1,int(p));return (1-p+i)*a['nodes'][i]+(p-i)*a['nodes'][i+1]
 u=x[1]*n;vv=x[2]*n;i=min(n-1,int(u));j=min(n-1-i,int(vv));f=u-i;g=vv-j
 def z(i,j):return a['nodes'][j*(n+1)-j*(j-1)//2+i]
 return (1-f-g)*z(i,j)+f*z(i+1,j)+g*z(i,j+1) if f+g<=1+1e-9 else (1-g)*z(i+1,j)+(f+g-1)*z(i+1,j+1)+(1-f)*z(i,j+1)
rng=np.random.default_rng(75398)
points=rng.dirichlet([1]*len(components),24).tolist()
results=[]
for x in points:
 lo=data['T'][0];hi=data['T'][-1]
 for _ in range(17):
  mid=(lo+hi)/2
  if liquid(x,mid)>1e-7:hi=mid
  else:lo=mid
 t=(lo+hi)/2;results.append(dict(x=x,direct=t))
print(key,'direct solidus references',len(results),'saved; run node validate-solidus-display.mjs to check the branch-aware display.',flush=True)
(root/'tests'/('solidus-reference-'+key+'.json')).write_text(json.dumps(results,indent=2),encoding='utf-8')