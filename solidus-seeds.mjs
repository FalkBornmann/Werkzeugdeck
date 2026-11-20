import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {profile,thresholds} from './equilibrium.js';
for(const key of ['sac','pbsnbi','bisn','cusn']){
 const m=JSON.parse(gunzipSync(readFileSync(key+'-hulls.json.gz'))),points=new Map();
 const add=x=>points.set(x.map(v=>v.toFixed(10)).join(','),x);
 if(m.components.length===3){
  const n=40;for(let j=0;j<=n;j++)for(let i=0;i<=n-j;i++)add([1-(i+j)/n,i/n,j/n]);
  for(let e=0;e<3;e++)for(let i=0;i<=160;i++){const x=[0,0,0];x[e]=i/160;x[(e+1)%3]=1-i/160;add(x)}
 }else for(let i=0;i<=240;i++)add([i/240,1-i/240]);
 const rows=[...points.values()].map(x=>({x,bracket:thresholds(profile(m,x)).solidus}));
 writeFileSync('qa/'+key+'-solidus-seeds.json',JSON.stringify({components:m.components,T:m.T,seeds:rows}));
 console.log(key,rows.length);
}