"""Independent direct-equilibrium validation of four ternary additions."""
from pathlib import Path
from io import StringIO
import json,re,gzip,sys,time
import numpy as np
from pycalphad import Database,Workspace,variables as v
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parent
target=root/'tests/reference-ternary-expansion.json'
out=json.loads(target.read_text(encoding='utf-8')) if target.exists() else []
for key in sys.argv[1:] or ['almgsi','alcusi','alcumg','agpbsn']:
 m=json.load(gzip.open(root/(key+'-hulls.json.gz')));comps=m['components']
 raw=(root/m.get('database','NIST-solder.tdb')).read_text(encoding='utf-8-sig')
 db=Database(StringIO(re.sub(r'DATABASE_INFO.*?!','',raw,flags=re.S).replace(',,N',' 6000 N')))
 def conditions(x,t):return {v.P:101325,v.N:1,v.T:t+273.15,**{v.X(c):x[i] for i,c in enumerate(comps[:-1])}}
 w=Workspace(db,comps+['VA'],m['activePhases'],conditions([.3,.3,.4],500),calc_opts={'pdens':5000 if key=='alcumg' else 1000})
 def direct(x,t):
  w.conditions=conditions(np.maximum(x,1e-10)/np.sum(np.maximum(x,1e-10)),t)
  amounts={}
  for cs in w.get_composition_sets():
   p=cs.phase_record.phase_name;amounts[p]=amounts.get(p,0)+float(cs.NP)
  return amounts
 points=[[.173,.291,.536],[.431,.513,.056],[.971,.017,.012],[.863,.082,.055],[.613,.227,.160],[.07,.88,.05]]
 cases=[]
 for x in points:
  for requested in [125,350,475,550,625,800,1000,min(1450,m['T'][-1])]:
   t=min(m['T'],key=lambda a:abs(a-requested));cases.append(dict(x=x,t=t,amounts=direct(x,t)))
 boundaries=[]
 # Distinct interior and dilute holdouts, plus points near each binary edge.
 xs=[[.913,.051,.036],[.763,.128,.109],[.527,.317,.156],[.219,.143,.638],[.014,.483,.503],[.467,.009,.524],[.478,.513,.009],[.985,.009,.006],[.637,.183,.180],[.081,.851,.068],[.328,.361,.311],[.596,.243,.161]]
 for i,x in enumerate(xs):
  b=[]
  scan=sorted(set(np.arange(m['T'][0],m['T'][-1],25).tolist()+[m['T'][-1]]))
  amounts=[direct(x,t).get('LIQUID',0) for t in scan]
  for limit in [1e-7,1-1e-7]:
   first=next((j for j,a in enumerate(amounts) if a>limit),None)
   if first is None or first==0:b.append(None);continue
   lo,hi=scan[first-1],scan[first]
   for _ in range(17):
    mid=(lo+hi)/2
    if direct(x,mid).get('LIQUID',0)>limit:hi=mid
    else:lo=mid
   b.append((lo+hi)/2)
  boundaries.append(dict(x=x,solidus=b[0],liquidus=b[1]))
 print(key,len(cases),'phase states',len(boundaries),'boundary holdouts',flush=True)
 out=[q for q in out if q['system']!=key]
 out.append(dict(system=key,referencePdens=5000 if key=="alcumg" else 1000,scanStepK=25,cases=cases,boundaries=boundaries))
(root/'tests/reference-ternary-expansion.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
