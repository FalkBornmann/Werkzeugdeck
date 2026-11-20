import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {reactionReferences} from './reaction-data.js';
import {profile,thresholds} from './equilibrium.js';
for(const key of ['sac','pbsnbi']){
 const m=JSON.parse(gunzipSync(readFileSync(key+'-hulls.json.gz'))),map=new Map();
 const add=x=>map.set(x.map(v=>v.toFixed(9)).join(','),x);
 const n=60;
 for(let a=0;a<=n;a++)for(let b=0;b<=n-a;b++)add([a/n,b/n,1-(a+b)/n]);
 for(let edge=0;edge<3;edge++)for(let i=0;i<=80;i++){const x=[0,0,0];x[edge]=i/80;x[(edge+1)%3]=1-i/80;add(x)}
 if(key==='sac')for(let a=0;a<=16;a++)for(let b=0;b<=16-a;b++)add([a/160,b/160,1-(a+b)/160]);
 for(const r of reactionReferences({...m,system:key}))add(r.x);
 const rows=[...map.values()].map(x=>({x,bracket:thresholds(profile(m,x)).liquidus}));
 writeFileSync('qa/'+key+'-surface-seeds.json',JSON.stringify(rows));
 console.log(key,rows.length);
}





