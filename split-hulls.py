"""Split large precomputed models into individually cacheable static data files."""
from pathlib import Path
import json,gzip,sys
root=Path(__file__).resolve().parent
for key in sys.argv[1:]:
 model=json.load(gzip.open(root/(key+'-hulls.json.gz')))
 frames=model.pop('frames')
 # Time-contiguous chunks keep every temperature state unchanged.
 files=[]
 for start in range(0,len(frames),40):
  name=f'{key}-hulls-part-{start//40+1}.json.gz'
  with gzip.GzipFile(str(root/name),'wb',mtime=0) as f:f.write(json.dumps(dict(frames=frames[start:start+40]),separators=(',',':'),allow_nan=False).encode())
  size=(root/name).stat().st_size
  if size>=24*1024*1024:raise ValueError(f'Chunk too large: {name} {size}')
  files.append(name)
 (root/(key+'-hulls-index.json')).write_text(json.dumps(dict(version=1,model=model,parts=files),separators=(',',':'))+'\n',encoding='utf-8')
 print(key,'static model chunks',len(files),'max bytes',max((root/f).stat().st_size for f in files),flush=True)
