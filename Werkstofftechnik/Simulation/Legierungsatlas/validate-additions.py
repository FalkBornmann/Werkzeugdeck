"""Independent direct-equilibrium states for the expanded material library."""
from pathlib import Path
from io import StringIO
import json,re,gzip,sys
import numpy as np
from pycalphad import Database,Workspace,variables as v
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parent
raw=(root/'NIST-solder.tdb').read_text()
db=Database(StringIO(re.sub(r'DATABASE_INFO.*?!','',raw,flags=re.S).replace(',,N',' 6000 N')))
rows=[]
for key in ['agcu','agsn','pbsn','bipb','agbisn','bicusn']:
 model=json.load(gzip.open(root/(key+'-hulls.json.gz')))
 comps=model['components'];T=model['T']
 points=[[.17,.83],[.5,.5],[.83,.17]] if len(comps)==2 else [[.17,.29,.54],[.43,.51,.06],[.008,.012,.98],[.02,.55,.43]]
 if key=='bicusn':points[-1]=[.55,.02,.43]
 temperatures={'agcu':[500,775,800,1000,1120],'agsn':[100,210,225,470,500,730,1000],'pbsn':[50,180,190,250,350],'bipb':[50,120,140,190,250,350],'agbisn':[80,130,150,250,500,900,1000],'bicusn':[80,130,150,250,500,900,1120]}[key]
 w=Workspace(db,comps+['VA'],list(db.phases),{v.P:101325,v.N:1,v.T:500,**{v.X(c):points[0][i] for i,c in enumerate(comps[:-1])}})
 for x in points:
  for requested in temperatures:
   tc=min(T,key=lambda t:abs(t-requested))
   w.conditions={v.P:101325,v.N:1,v.T:tc+273.15,**{v.X(c):x[i] for i,c in enumerate(comps[:-1])}}
   amounts={}
   for cs in w.get_composition_sets():
    name=cs.phase_record.phase_name;amounts[name]=amounts.get(name,0)+float(cs.NP)
   rows.append(dict(system=key,x=x,t=tc,amounts=amounts))
 print(key,'reference states saved in batch',flush=True)
(root/'tests'/'reference-additions.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
print(len(rows),'direct equilibrium reference states')
