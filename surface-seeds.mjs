import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {reactionReferences} from './reaction-data.js';
import {profile,thresholds} from './equilibrium.js';
for(const key of (process.argv.length>2?process.argv.slice(2):['sac','pbsnbi'])){
 const m=JSON.parse(gunzipSync(readFileSync(key+'-hulls.json.gz'))),map=new Map();
 const add=x=>map.set(x.map(v=>v.toFixed(9)).join(','),x);
 const n=key==="bicusn"?90:60;
 for(let a=0;a<=n;a++)for(let b=0;b<=n-a;b++)add([a/n,b/n,1-(a+b)/n]);
 for(let edge=0;edge<3;edge++)for(let i=0;i<=80;i++){const x=[0,0,0];x[edge]=i/80;x[(edge+1)%3]=1-i/80;add(x)}
 if(key==='sac')for(let a=0;a<=16;a++)for(let b=0;b<=16-a;b++)add([a/160,b/160,1-(a+b)/160]);
 if(['agbisn','bicusn'].includes(key)){
  const trace=key==='agbisn'?0:1;
  for(const dilute of [.0001,.0005,.001,.003,.005,.01,.015,.02,.025,.03,.04,.05,.075,.1])for(let j=0;j<=80;j++){
   const x=[0,0,0];x[trace]=dilute;x[(trace+1)%3]=(1-dilute)*j/80;x[(trace+2)%3]=(1-dilute)*(1-j/80);add(x);
  }
 }
 if(['almgsi','alcusi','alcumg','agpbsn'].includes(key))for(let trace=0;trace<3;trace++){
  for(const dilute of [.0001,.0005,.001,.003,.005,.01,.02,.04,.075,.1])for(let j=0;j<=60;j++){
   const x=[0,0,0];x[trace]=dilute;x[(trace+1)%3]=(1-dilute)*j/60;x[(trace+2)%3]=(1-dilute)*(1-j/60);add(x);
  }
 }
 for(const r of reactionReferences({...m,system:key}))add(r.x);
 const rows=[...map.values()].map(x=>({x,bracket:thresholds(profile(m,x)).liquidus}));
 writeFileSync('qa/'+key+'-surface-seeds.json',JSON.stringify(rows));
 console.log(key,rows.length);
}





