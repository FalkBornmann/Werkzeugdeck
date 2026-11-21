"""Direct equilibrium and boundary hold-outs for the open Al/Si/Cu/Ni models."""
from pathlib import Path
from io import StringIO
import json,re,gzip
import numpy as np
from pycalphad import Database,Workspace,variables as v
root=Path(__file__).resolve().parent;out=[]
for key in ['alsi','alcu','cuni']:
 m=json.load(gzip.open(root/(key+'-hulls.json.gz')));comps=m['components']
 db=Database(str(root/m['database']));phases=[p for p in db.phases if p not in m.get('excludedPhases',[])]
 w=Workspace(db,comps+['VA'],phases,{v.P:101325,v.N:1,v.T:1000,v.X(comps[0]):.5})
 def state(x,t):
  w.conditions={v.P:101325,v.N:1,v.T:t+273.15,v.X(comps[0]):x[0]}
  amounts={}
  for cs in w.get_composition_sets():amounts[cs.phase_record.phase_name]=amounts.get(cs.phase_record.phase_name,0)+float(cs.NP)
  return amounts
 cases=[]
 requests={'alsi':[300,570,580,650,1000,1400],'alcu':[300,540,550,650,800,1000],'cuni':[300,900,1100,1250,1350,1450]}[key]
 for a in [.08,.31,.57,.82,.97]:
  for requested in requests:
   t=min(m['T'],key=lambda t:abs(t-requested));x=[a,1-a];cases.append(dict(x=x,t=t,amounts=state(x,t)))
 rng=np.random.default_rng(90183);boundaries=[]
 for a in rng.uniform(.012,.988,20):
  x=[float(a),float(1-a)];row=dict(x=x)
  for name,criterion in [('solidus',lambda q:q>1e-7),('liquidus',lambda q:q>1-1e-7)]:
   lo=m['T'][0];hi=m['T'][-1]
   for _ in range(19):
    mid=(lo+hi)/2
    if criterion(state(x,mid).get('LIQUID',0)):hi=mid
    else:lo=mid
   row[name]=(lo+hi)/2
  boundaries.append(row)
 out.append(dict(system=key,cases=cases,boundaries=boundaries))
 print(key,len(cases),'phase states',len(boundaries),'boundary holdouts',flush=True)
(root/'tests/reference-materials.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
