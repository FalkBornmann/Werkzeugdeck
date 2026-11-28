import sys,re,json,time
from pathlib import Path
from io import StringIO
import numpy as np
from pycalphad import Database,Workspace,variables as v
sys.stdout.reconfigure(encoding="utf-8",errors="replace")
raw=Path("NIST-solder.tdb").read_text()
db=Database(StringIO(re.sub(r"DATABASE_INFO.*?!","",raw,flags=re.S).replace(",,N"," 6000 N")))
rows=[]
cases={
 "sac":(["AG","CU","SN"],[([.5,.48,.02],t) for t in [100,500,700,750,800,850,900,1000,1030,1100]]+[([.04,.015,.945],220),([.2,.4,.4],400),([.1,.1,.8],400),([.7,.2,.1],800),([.01,.05,.94],260)]),
 "pbsnbi":(["BI","PB","SN"],[([.3,.3,.4],t) for t in [40,90,100,120,140,180,250,330]]+[([.5,.35,.15],100),([.1,.1,.8],180),([.05,.8,.15],200)])
}
for key,(components,samples) in cases.items():
 for x,t in samples:
  w=Workspace(db,components+["VA"],list(db.phases),{v.P:101325,v.N:1,v.T:t+273.15,**{v.X(c):x[i] for i,c in enumerate(components[:-1])}})
  amounts={}
  for cs in w.get_composition_sets():
   name=cs.phase_record.phase_name;amounts[name]=amounts.get(name,0)+cs.NP
  rows.append(dict(system=key,x=x,t=t,amounts=amounts))
Path("tests/reference-v3.json").write_text(json.dumps(rows,indent=2),encoding="utf-8")
print("Saved",len(rows),"direct-equilibrium reference states.")
