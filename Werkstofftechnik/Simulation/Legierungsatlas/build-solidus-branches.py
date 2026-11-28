"""Preserve thermodynamic solid-assemblage branches instead of smoothing across solidus jumps."""
from pathlib import Path
import sys,json,gzip,numpy as np
from scipy.interpolate import RBFInterpolator
from scipy.spatial import cKDTree
exec(Path('build-solidus.py').read_text(encoding='utf-8-sig').split("cache=root/")[0])
cache=root/'qa'/(key+'-solidus-direct.json');rows=json.loads(cache.read_text())
def signature(sets):
 out=[]
 for cs in sets:
  if cs.NP<1e-6 or cs.phase_record.phase_name=='LIQUID':continue
  name=cs.phase_record.phase_name
  if name in ['FCC_A1','BCC_A2','HCP_A3','BCT_A5']:name+='#'+components[int(np.argmax(np.array(cs.X)))]
  out.append(name)
 return '|'.join(sorted(out))
for i,q in enumerate(rows):
 if q['t'] is None or 'signature' in q:continue
 x=np.maximum(q['x'],1.01e-10);x/=sum(x);w.conditions=conditions(x,q['t']-.1)
 q['signature']=signature(w.get_composition_sets())
 if i%200==0:print(key,'branch',i,flush=True)
cache.write_text(json.dumps(rows))
out=json.load(gzip.open(key+'-solidus.json.gz'));n=out['n']
coords=np.array([[1-(i+j)/n,i/n] for j in range(n+1) for i in range(n+1-j)])
branches={};direct_fits={}
for name in sorted(set(q.get('signature','') for q in rows)):
 data=np.array([[*q['x'][:2],q['t']] for q in rows if q.get('signature')==name and q['t'] is not None])
 if not len(data):continue
 tree=cKDTree(data[:,:2]);distance,idx=tree.query(coords)
 if np.ptp(data[:,2])<.1:values=np.full(len(coords),np.median(data[:,2]))
 elif len(data)>=4 and np.linalg.matrix_rank(data[:,:2]-data[:,:2].mean(axis=0))==2:
  fit=RBFInterpolator(data[:,:2],data[:,2],kernel='thin_plate_spline',smoothing=1e-5,degree=1)
  values=fit(coords);values=np.clip(values,min(data[:,2]),max(data[:,2]))
 else:values=data[idx,2]
 if np.ptp(data[:,2])<.1:direct_fits[name]={'constant':float(np.median(data[:,2]))}
 elif len(data)>=4 and np.linalg.matrix_rank(data[:,:2]-data[:,:2].mean(axis=0))==2:
  direct_fits[name]={'centers':data[:,:2].tolist(),'weights':fit._coeffs[:len(data),0].tolist(),'poly':fit._coeffs[len(data):,0].tolist(),'shift':fit._shift.tolist(),'scale':fit._scale.tolist(),'low':float(min(data[:,2])),'high':float(max(data[:,2]))}
 branches[name]=[round(float(t),5) if d<.18 else None for t,d in zip(values,distance)]
out['directFits']=direct_fits;out['branches']=branches;out['method']='Direct liquid onset, branch-aware C1 reconstruction; solid-assemblage branches retained'
with gzip.GzipFile(str(root/(key+'-solidus.json.gz')),'wb',mtime=0) as f:f.write(json.dumps(out,separators=(',',':'),allow_nan=False).encode())
print(key,'solidus branches',len(branches),flush=True)