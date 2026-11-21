"""Reconstruct Villada et al. (2022), Fig. 4 from its color-calibrated isotherms.
Only numerical controls are published; the source illustration remains in qa/.
"""
from pathlib import Path
import sys,json,gzip,hashlib
import numpy as np
import pypdfium2 as pdfium
from PIL import Image
from matplotlib.colors import rgb_to_hsv
from scipy.interpolate import RBFInterpolator,CloughTocher2DInterpolator,PchipInterpolator
from scipy.ndimage import gaussian_filter
from scipy.spatial import Delaunay,cKDTree
root=Path(__file__).resolve().parent
pdf=Path(sys.argv[1]);page=pdfium.PdfDocument(str(pdf))[5]
im=np.array(page.render(scale=2.5).to_pil().convert('RGB'))/255
# Pixel locations in a fixed 2.5x rendering, calibrated against the printed corners.
vertices=np.array([[1028.5,1054.5],[420.,1054.5],[724.,549.5]])
matrix=np.vstack([vertices.T,np.ones(3)])
legend=im[570:915,1092:1096].mean(axis=1)
lh=rgb_to_hsv(legend)[:,0];lt=850-(np.arange(570,915)-568.5)*500/(916-568.5)
ok=(rgb_to_hsv(legend)[:,1]>.65)&(lh>.02)
# Some printed color bands are constant in hue over a temperature interval.
# Use their midpoint rather than an arbitrary duplicate interpolation coordinate.
rounded=np.round(lh[ok],4);hs=np.unique(rounded);ts=np.array([np.median(lt[ok][rounded==h]) for h in hs])
hsv=rgb_to_hsv(im);ys,xs=np.where((hsv[:,:,1]>.38)&(hsv[:,:,2]>.45)&(hsv[:,:,0]>.09)&(hsv[:,:,0]<.85))
inside=(xs>=420)&(xs<=1029)&(ys>=549)&(ys<=1055)
xs,ys=xs[inside],ys[inside]
coords=np.linalg.solve(matrix,np.vstack([xs,ys,np.ones(len(xs))])).T
temp=np.interp(hsv[ys,xs,0],hs,ts)
valid=(coords.min(axis=1)>.009)&(temp>=390)&(temp<=805)&(((xs-750)**2+(ys-818)**2)>23**2)
coords,temp=coords[valid],temp[valid]
# Median temperature in composition bins suppresses anti-aliasing and crossing pixels.
bins={}
for x,t in zip(coords,temp):bins.setdefault(tuple(np.round(x[:2]*100).astype(int)),[]).append((x,t))
controls=[]
for entries in bins.values():
 if len(entries)<2:continue
 x=np.mean([q[0] for q in entries],axis=0);t=np.median([q[1] for q in entries])
 controls.append([*x[:2],float(t)])
refs=[dict(label='M',kind='M',t=385.4,x=[.302,.227,.471],reaction='Minimum der FactSage-Projektion · keine DSC-Endtemperatur'),
 dict(label='Eₖ₁',kind='E',t=472.72,x=[0,.4158,.5842],reaction='L → MgCl₂ + KMgCl₃ · binäre Referenz'),
 dict(label='Pₖ',kind='P',t=440.09,x=[0,.6253,.3747],reaction='L + KMgCl₃ → K₃Mg₂Cl₇ · binäre Referenz'),
 dict(label='Eₖ₂',kind='E',t=428.96,x=[0,.6541,.3459],reaction='L → K₃Mg₂Cl₇ + K₂MgCl₄ · binäre Referenz'),
 dict(label='Eₖ₃',kind='E',t=422.68,x=[0,.6987,.3013],reaction='L → K₂MgCl₄ + KCl · binäre Referenz'),
 dict(label='Eₙ',kind='E',t=459.14,x=[.5704,0,.4296],reaction='L → Na₂MgCl₄ + NaMgCl₃ · binäre Referenz'),
 dict(label='Pₙ₁',kind='P',t=474.95,x=[.6338,0,.3662],reaction='L + NaCl → Na₂MgCl₄ · binäre Referenz'),
 dict(label='Pₙ₂',kind='P',t=465.67,x=[.5182,0,.4818],reaction='L + MgCl₂ → NaMgCl₃ · binäre Referenz')]
anchors=[([1,0,0],800.7),([0,1,0],770.9),([0,0,1],714),([.5023,.4977,0],656.35)]+[(r['x'],r['t']) for r in refs]
controls=np.asarray(controls)
# Overlay/anti-aliasing outliers must not become thermodynamic extrema.
tree=cKDTree(controls[:,:2]);near=tree.query(controls[:,:2],k=13)[1]
median=np.median(controls[near,2],axis=1)
controls=controls[np.abs(controls[:,2]-median)<35]
# Local thin-plate fits avoid a global high-order polynomial and keep changes local.
fit=RBFInterpolator(controls[:,:2],controls[:,2],neighbors=36,kernel='thin_plate_spline',smoothing=2e-5)
anchor_x=np.array([q[0][:2] for q in anchors]);delta=np.array([q[1] for q in anchors])-fit(anchor_x)
# Compact corrections preserve every tabulated anchor exactly without offsetting distant contours.
distance=np.linalg.norm(anchor_x[:,None,:]-anchor_x[None,:,:],axis=2)
width=np.minimum(.045,np.min(np.where(distance>1e-8,distance,np.inf),axis=1)*.45)
def evaluate(points):
 points=np.asarray(points);z=fit(points[:,:2])
 for (x,t),d,w in zip(anchors,delta,width):
  r=np.linalg.norm(points[:,:2]-np.array(x[:2]),axis=1)/w
  z+=d*np.maximum(0,1-r*r)**3
 return np.clip(z,385.4,805)
n=120
xs=[[1-(i+j)/n,i/n,j/n] for j in range(n+1) for i in range(n+1-j)]
# Exact tabulated compositions are explicit vertices, not approximate nearest grid nodes.
xs.extend([x for x,t in anchors if min(np.linalg.norm(np.array(x)-q) for q in xs)>1e-9])
xs=np.array(xs);temps=evaluate(xs)
# Smooth one common scalar field, not each displayed isotherm independently.
# Normalized filtering respects the triangular support; a coarse C1 interpolant
# suppresses raster/neighbor-selection noise before contours and 3D are derived.
raster=np.zeros((n+1,n+1));mask=np.zeros_like(raster)
k=0
for j in range(n+1):
 for i in range(n+1-j):raster[j,i]=temps[k];mask[j,i]=1;k+=1
smooth=gaussian_filter(raster,2.5)/np.maximum(1e-12,gaussian_filter(mask,2.5))
coarse=[]
for j in range(0,n+1,3):
 for i in range(0,n+1-j,3):coarse.append([xs[(j*(n+1)-j*(j-1)//2+i)][0],xs[(j*(n+1)-j*(j-1)//2+i)][1],smooth[j,i]])

coarse=np.array(coarse);c1=CloughTocher2DInterpolator(coarse[:,:2],coarse[:,2])
query=xs[:,:2]*(1-3e-10)+1e-10
temps=np.clip(c1(query),385.4,805)
# Reconcile exact tabulated controls with compact neighborhoods after smoothing.
for x,t in anchors:
 base=float(c1(np.array(x[:2])*(1-3e-10)+1e-10)[0]);r=np.linalg.norm(xs[:,:2]-x[:2],axis=1)/.025
 temps+=(t-base)*np.maximum(0,1-r*r)**3
# Printed edge colors are particularly coarse. Reconcile the boundary curves
# with the tabulated binary invariant liquid compositions and pure endpoints.
edge_curves=[
 (2,0,[0,.5023,1],[770.9,656.35,800.7]),
 (0,2,[0,.3013,.3459,.3747,.5842,1],[770.9,422.68,428.96,440.09,472.72,714]),
 (1,2,[0,.3662,.4296,.4818,1],[800.7,474.95,459.14,465.67,714])]
for absent,variable,xx,tt in edge_curves:
 target=PchipInterpolator(xx,tt)(xs[:,variable]/np.maximum(1e-12,1-xs[:,absent]))
 weight=np.maximum(0,1-xs[:,absent]/.06)**3
 temps=temps*(1-weight)+target*weight
temps=np.clip(temps,385.4,805)
tri=Delaunay(xs[:,:2]);faces=tri.simplices.tolist()
for x,t in anchors:temps[np.argmin(np.linalg.norm(xs-x,axis=1))]=t
lookup=lambda i,j:j*(n+1)-j*(j-1)//2+i
draw=[]
for j in range(0,n,3):
 for i in range(0,n-j,3):
  draw.append([lookup(i,j),lookup(i+3,j),lookup(i,j+3)])
  if i+j<n-3:draw.append([lookup(i+3,j),lookup(i+3,j+3),lookup(i,j+3)])
skeleton=[[1,0,0],[0,1,0],[0,0,1],[.5,0,.5],[0,.5,.5],[2/3,0,1/3],[0,2/3,1/3],[0,.6,.4]]
solidNames=['NaCl-reich','KCl-reich','MgCl₂','NaMgCl₃','KMgCl₃','Na₂MgCl₄','K₂MgCl₄','K₃Mg₂Cl₇']
regions=Delaunay(np.array(skeleton)[:,:2]).simplices.tolist()
special=[dict(name='NaMgCl₃ · Bilanzpunkt',x=skeleton[3]),dict(name='KMgCl₃ · Bilanzpunkt',x=skeleton[4]),dict(name='Na₂MgCl₄ · Bilanzpunkt',x=skeleton[5]),dict(name='K₂MgCl₄ · Bilanzpunkt',x=skeleton[6])]
for label,x,onset,end in [('A',[.325,.185,.49],388.2,404.9),('B',[.33,.216,.454],388.33,410.55),('C',[.313,.222,.465],388.47,411.17),('D',[.294,.258,.447],388.45,426.35),('E',[.302,.227,.471],388.55,415.9)]:
 x=np.array(x);x=x/x.sum();special.append(dict(name=f'DSC {label} · Beginn {onset} °C / Ende {end} °C bei 10 K/min',x=x.tolist()))
T=sorted(set(range(350,851,5))|{round(r['t']+d,2) for r in refs for d in [-.02,0,.02]})
# Reaction boundaries are reconstructed from the change of geometric primary field.
# They are deliberately not labelled as traced thermodynamic univariant equilibria.
boundary_pixels=[
 [[601,761],[630,781],[660,797],[690,807],[720,813],[747,817]],
 [[747,817],[790,816],[840,813],[884,810]],
 [[535,857],[590,868],[650,865],[700,848],[725,833],[747,817]],
 [[510,906],[570,913],[625,913],[700,891],[780,870],[840,863],[900,868],[915,874]]]
reaction_segments={}
for i,path in enumerate(boundary_pixels):
 xx=np.linalg.solve(matrix,np.c_[np.array(path),np.ones(len(path))].T).T
 xx=np.maximum(0,xx);xx/=xx.sum(axis=1)[:,None];tt=evaluate(xx)
 reaction_segments[str(i)]=[[[*a[:2],float(ta)],[*b[:2],float(tb)]] for a,b,ta,tb in zip(xx,xx[1:],tt,tt[1:])]
# Schematic primary fields follow the same digitized boundary graph.
def branch(path):
 xx=np.linalg.solve(matrix,np.c_[np.array(path),np.ones(len(path))].T).T
 pairs=sorted((q[0]/max(1e-12,q[0]+q[1]),q[2]) for q in xx)
 return PchipInterpolator(*np.array(pairs).T,extrapolate=True)
top=branch(boundary_pixels[0]+boundary_pixels[1][1:]);lower=branch(boundary_pixels[3]);middle=branch(boundary_pixels[2])
r_end=np.linalg.solve(matrix,np.r_[boundary_pixels[2][-1],1]);r_end=r_end[0]/(r_end[0]+r_end[1])
def primary(x):
 r=x[0]/max(1e-12,x[0]+x[1])
 if x[2]>=float(top(r)):return 'MgCl₂'
 if x[2]<=float(lower(r)):return 'NaCl–KCl-MK'
 if r<r_end and x[2]>=float(middle(r)):return '(Na,K)MgCl₃-MK'
 return '(Na,K)₂MgCl₄-MK'
out=dict(version=2,system='nakmg',components=['NaCl','KCl','MgCl₂'],masses=[58.4428,74.5513,95.211],maxThird=1,T=T,
 nodes=[dict(x=x.tolist(),value=round(float(t),5),primary=primary(x)) for x,t in zip(xs,temps)],triangles=faces,drawTriangles=draw,
 reactionSegments=reaction_segments,skeleton=skeleton,solidNames=solidNames,regions=regions,families={'NaMgCl₃':'(Na,K)MgCl₃-MK','KMgCl₃':'(Na,K)MgCl₃-MK','Na₂MgCl₄':'(Na,K)₂MgCl₄-MK','K₂MgCl₄':'(Na,K)₂MgCl₄-MK'},
 references=refs,specialPoints=special,controls=np.round(controls,7).tolist(),
 source='Villada, Ding, Bonk & Bauer (2022), Fig. 4, Tables 1 and 3, doi:10.3389/fenrg.2022.809663',
 sourceLabel='Villada et al. (2022), Abb. 4 und Tabellen 1/3',
 note='Farbdigitalisierte Literaturisothermen; lokale glatte Interpolation mit geglätteten Farbbändern. Die Farbgrafik erlaubt örtlich nur eine ungefähre Temperaturzuordnung; eine abgesicherte Fehlergrenze fehlt. Temperaturen unter dem publizierten Projektionsminimum werden begrenzt, wodurch breite Talbereiche entstehen können. Randsysteme sind formtreue Näherungen aus tabellierten invarianten Schmelzgehalten und Endgliedern; nicht belegte lokale Maxima fehlen. Maximale geometrisch zulässige Restschmelze mit festen Chlorid-Bilanzpunkten und angenommenen linearen Na/K-Mischkristallen. Keine ternäre Gibbs-Minimierung. Das Projektionsminimum 385,4 °C und die DSC-Endtemperaturen 405–426 °C sind verschiedene Referenzen. Gas, Wasser/Hydrolyse und Korrosion fehlen.',
 method='Color-calibrated numerical isotherm reconstruction; local thin-plate interpolation; geometric maximum-liquid balance',
 provenance=dict(pdf_sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),render_scale=2.5,triangle_pixels=vertices.tolist(),colorbar_pixels=[1094,568.5,916]))
with gzip.GzipFile(str(root/'nakmg-diagram.json.gz'),'wb',mtime=0) as f:f.write(json.dumps(out,separators=(',',':'),allow_nan=False).encode())
print('nakmg',len(controls),'isotherm controls',len(xs),'surface vertices',len(regions),'solid balance regions',flush=True)
