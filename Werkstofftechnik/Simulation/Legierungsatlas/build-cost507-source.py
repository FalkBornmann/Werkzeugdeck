"""Adapt COST507 syntax for pycalphad without changing selected-system parameters."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
s=(root/'sources/COST507-original.tdb').read_text(encoding='utf-8')
s=re.sub(r'DATABASE_INFO.*?!','',s,flags=re.S)
s=s.replace('8.89059+01','8.89059E+01')
s=re.sub(r'REF:\s*(\d+)',r'REF\1',s)
seen={}
def dedup(m):
 name=m[1];value=re.sub(r'\s+','',m[0].split(name,1)[1])
 if name in seen:
  if seen[name]!=value:raise ValueError('Different duplicate function '+name)
  return ''
 seen[name]=value;return m[0]
s=re.sub(r'(?mi)^FUNCTION\s+(\w+)\s+[^!]*!',dedup,s)
# Malformed unused B-Hf-Ti parameter: remove the entire physical line.
s=re.sub(r'(?mi)^PARAMETER L\(B4M3,B:HF,TI;0\)[^\n]*','',s)
(root/'sources/COST507-compatible.tdb').write_text(s,encoding='utf-8',newline='\n')
