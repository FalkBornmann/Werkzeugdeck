"""Digitize numerical isotherm controls from Robelin et al., Fig.21; no source illustration is redistributed."""
from pathlib import Path
import json,gzip,sys,numpy as np
from scipy.interpolate import CloughTocher2DInterpolator,PchipInterpolator,RectBivariateSpline,splprep,splev
from scipy.ndimage import gaussian_filter
from scipy.spatial import Delaunay
import pdfplumber
root=Path(__file__).resolve().parent
if len(sys.argv)<2:raise SystemExit('Usage: python build-salt-diagram.py path/to/Robelin2004.pdf')
p=pdfplumber.open(sys.argv[1]).pages[13]
curves=[c for c in p.curves if c['x0']>335 and c['top']>82 and c['bottom']<255]
vertices=np.array([[338.926,249.413],[526.365,249.413],[432.525,86.214]])
matrix=np.vstack([vertices.T,np.ones(3)])
def composition(q):
 x=np.linalg.solve(matrix,np.r_[q,1]);x=np.maximum(0,x);return (x/sum(x)).tolist()
levels={3:500,4:575,5:625,6:625,7:650,8:675,9:675,10:700,11:700,12:725,13:725,14:750,15:750,16:775,17:600,22:225,23:200,24:175,25:150,26:150,27:250,28:150,29:125,30:125,31:175}
controls=[]
for i,t in levels.items():
 for q in curves[i]['pts'][::2]:controls.append([*composition(q)[:2],t])
refs=[
 dict(label='E₁',kind='E',t=132.1,x=[.364,.138,.498],reaction='L → NaCl-reich + NaAlCl₄ + KAlCl₄'),
 dict(label='E₂',kind='E',t=91.4,x=[.255,.142,.603],reaction='L → AlCl₃ + NaAlCl₄ + KAlCl₄'),
 dict(label='E₃',kind='E',t=241.47,x=[.002,.512,.486],reaction='L → NaCl-reich + KCl-reich + KAlCl₄'),
 dict(label='Q',kind='Q',t=133.2,x=[.361,.139,.5],reaction='L → NaAlCl₄ + KAlCl₄ · quasibinärer Referenzpunkt')]
special=[([1,0,0],800.7),([0,1,0],770.9),([.5,.5,0],657),([.5,0,.5],156.7),([0,.5,.5],257.3),([.388,0,.612],108.7),([0,.345,.655],130.1)]
special += [(q['x'],q['t']) for q in refs]
controls.extend([[*x[:2],t] for x,t in special])
controls=np.array(controls);_,idx=np.unique(np.round(controls[:,:2],7),axis=0,return_index=True);controls=controls[idx]
# Loft the digitized isotherms along fixed alkali ratios. This avoids oscillatory
# gradients when a very steep neutral-composition wall is triangulated globally.
paths=[]
for index,level in levels.items():
 pts=np.array([composition(q) for q in curves[index]['pts']])
 pts=pts[np.r_[True,np.linalg.norm(np.diff(pts[:,:2],axis=0),axis=1)>1e-7]]
 if len(pts)>3:
  spl,u=splprep(pts[:,:2].T,s=2e-6,k=3)
  xy=np.array(splev(np.linspace(0,1,max(80,len(pts)*3)),spl)).T
  pts=np.c_[xy,1-xy.sum(axis=1)]
 pts=np.maximum(0,pts);pts/=pts.sum(axis=1)[:,None]
 paths.append((level,pts))
rs=np.linspace(0,1,401);als=np.linspace(0,.74,741);grid=[]
binary=PchipInterpolator([0,.5,1],[800.7,657,770.9])
def quasi(r):
 return 133.2+(156.7-133.2)*(1-r/.278)**1.4 if r<=.278 else 133.2+(257.3-133.2)*((r-.278)/(.722))**1.25
for ratio in rs:
 support=[[0,float(binary(ratio))],[.5,quasi(ratio)]]
 for temp,path in paths:
  for left,right in zip(path,path[1:]):
   fa=left[1]-ratio*(1-left[2]);fb=right[1]-ratio*(1-right[2])
   if fa*fb>0 or abs(fa-fb)<1e-12:continue
   u=fa/(fa-fb)
   if 0<=u<=1:
    al=left[2]+u*(right[2]-left[2])
    if abs(al-.5)>.0008:support.append([float(al),temp])
 support.sort()
 unique=[]
 for p in support:
  if unique and abs(p[0]-unique[-1][0])<.0003:
   unique[-1]=[(p[0]+unique[-1][0])/2,(p[1]+unique[-1][1])/2]
  else:unique.append(p)
 augmented=[]
 for j,pair in enumerate(unique):
  augmented.append(pair)
  if j+1<len(unique):
   other=unique[j+1];gap=other[0]-pair[0]
   if abs(other[1]-pair[1])<1e-6 and gap>.002:
    augmented.append([(pair[0]+other[0])/2,pair[1]-12.5*min(1,(gap/.08)**2)])
 p=np.array(augmented)
 profile=PchipInterpolator(p[:,0],p[:,1],extrapolate=True)(als)
 grid.append(np.clip(profile,91.4,805))
grid=gaussian_filter(np.array(grid),sigma=[1.2,.6],mode='nearest')
loft=RectBivariateSpline(rs,als,grid,kx=3,ky=3,s=0)
def fit(query):
 q=np.atleast_2d(query);al=1-q.sum(axis=1);ratio=q[:,1]/np.maximum(1e-10,q.sum(axis=1))
 out=loft.ev(np.clip(ratio,0,1),np.clip(al,0,.74))
 for x,t in special:
  al0=x[2];r0=x[1]/max(1e-10,1-al0)
  delta=t-float(loft.ev(r0,min(.74,al0)))
  distance=((ratio-r0)/.035)**2+((al-al0)/.018)**2
  out+=delta*np.maximum(0,1-distance)**3
 return np.maximum(91.4,out)
n=180;xs=[[1-(i+j)/n,i/n,j/n] for j in range(n+1) for i in range(n+1-j)]
xs.extend([x for x,t in special if min(np.linalg.norm(np.array(x)-np.array(q)) for q in xs)>1e-6])
xs=np.array(xs);temps=fit(xs[:,:2]);temps=np.maximum(91.4,temps)
for x,t in special:
 k=np.argmin(np.linalg.norm(xs-np.array(x),axis=1));temps[k]=t
valid=(xs[:,2]<=.74+1e-8)&np.isfinite(temps)
tri=Delaunay(xs[:,:2]);faces=tri.simplices.tolist()
# Source reaction boundaries are digitized as geometry; their temperatures come from the same interpolated scalar.
segments={}
for i in [18,19,20,21,33]:
 pts=[composition(q) for q in curves[i]['pts']]
 segments[str(i)]=[[[*a[:2],float(fit(a[:2])[0])],[*b[:2],float(fit(b[:2])[0])]] for a,b in zip(pts,pts[1:])]
lookup=lambda i,j:j*(n+1)-j*(j-1)//2+i
draw=[]
for j in range(0,n,3):
 for i in range(0,n-j,3):
  draw.append([lookup(i,j),lookup(i+3,j),lookup(i,j+3)])
  if i+j<n-3:draw.append([lookup(i+3,j),lookup(i+3,j+3),lookup(i,j+3)])
out=dict(version=1,components=['NaCl','KCl','AlCl₃'],masses=[58.4428,74.5513,133.3405],maxAl=.74,
 nodes=[dict(x=x.tolist(),value=round(float(t),5) if ok else None,primary='') for x,t,ok in zip(xs,temps,valid)],
 triangles=faces,drawTriangles=draw,sourceIsotherms=[dict(t=t,paths=[pts.tolist()]) for t,pts in paths],reactionSegments=segments,references=refs,
 controls=[[round(float(v),7) for v in q] for q in controls],source='Robelin, Chartrand & Pelton (2004), Fig.21 and Table6',
 method='Digitized isotherms; Smoothed source-isotherm loft with shape-preserving profiles; geometric maximum-liquid reconstruction')
with gzip.GzipFile(str(root/'salt-diagram.json.gz'),'wb',mtime=0) as f:f.write(json.dumps(out,separators=(',',':'),allow_nan=False).encode())
print('salt controls',len(controls),'nodes',len(xs),'supported',int(valid.sum()))