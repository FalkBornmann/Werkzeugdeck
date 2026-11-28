"""Generate native equilibrium samples for the browser. Requires pycalphad 0.12."""
from pathlib import Path
import json
import re
import numpy as np
from pycalphad import Database, equilibrium, variables as v
from io import StringIO

root = Path(__file__).resolve().parent
source = (root / 'NIST-solder.tdb').read_text()
# The legacy file uses omitted upper bounds, references, and metadata.
source = re.sub(r'DATABASE_INFO.*?!', '', source, flags=re.S)
source = source.replace(',,N', ' 6000 N').replace(',, N',' 6000 N')
db = Database(StringIO(source))
for key, comps, axes, temperatures in [
    ('bisn',['BI','SN'], [[.001,.05,.1,.15,.2,.25,.3,.35,.4,.43,.45,.5,.55,.6,.65,.7,.75,.8,.85,.9,.95,.999]], list(range(100,281,2))),
    ('cusn',['CU','SN'], [np.linspace(.01,.99,50).tolist()],list(range(180,1101,5))),
    ('sac',['AG','CU','SN'], [[.0001,.005,.01,.02,.03,.04,.05,.06],[.0001,.005,.01,.015,.02,.025,.03]], list(range(195,271,1)))
]:
    independent = comps[1:] if len(comps)==2 else comps[:2]
    cond = {v.P:101325,v.N:1,v.T:np.array(temperatures)+273.15}
    if key == 'bisn': axes[0]=sorted(axes[0]+[(43.03/118.69)/(43.03/118.69+56.97/208.98)])
    if key == 'sac':
        amounts=np.array([3.73/107.87,.85/63.546,95.42/118.69]); amounts/=amounts.sum()
        axes=[sorted(axis+[float(x)]) for axis,x in zip(axes,amounts)]
    cond.update({v.X(element):values for element,values in zip(independent,axes)})
    result = equilibrium(db,comps+['VA'],list(db.phases),cond,output="HM")
    dims=['X_'+s for s in independent]+['T','vertex']
    names=result.Phase.squeeze(drop=True).transpose(*dims).values
    fractions=result.NP.squeeze(drop=True).transpose(*dims).values
    phases=sorted(set(names.ravel())-{''})
    rows=[]
    for ids,fs in zip(names.reshape(-1,names.shape[-1]),fractions.reshape(-1,names.shape[-1])):
        row=[[phases.index(n),round(float(f),5)] for n,f in zip(ids,fs) if n and f>1e-8]
        if abs(sum(f for _,f in row)-1)>.001: row=[]  # Preserve failed equilibria as data gaps.
        rows.append(row)
    (root/(key+'.json')).write_text(json.dumps(dict(components=comps,independent=independent,axes=axes,T=temperatures,phases=phases,rows=rows,H=[round(float(h)) if np.isfinite(h) else None for h in result.HM.squeeze(drop=True).transpose(*dims[:-1]).values.ravel()]),separators=(',',':')))
    print(key,len(rows),flush=True)


