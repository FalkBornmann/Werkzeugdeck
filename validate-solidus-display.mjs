import{readFileSync,writeFileSync}from'node:fs';
import{gunzipSync}from'node:zlib';
import{profile}from'./equilibrium.js';
import{boundaryFromSeries}from'./boundary.js';
import{displayedSolidus}from'./solidus-display.js';
for(const k of ['sac','pbsnbi','bisn','cusn']){
 const m=JSON.parse(gunzipSync(readFileSync(k+'-hulls.json.gz')));m.solidusDisplay=JSON.parse(gunzipSync(readFileSync(k+'-solidus.json.gz')));
 const file='tests/solidus-reference-'+k+'.json',refs=JSON.parse(readFileSync(file));
 const checked=refs.map(({x,direct})=>{const p=profile(m,x),root=boundaryFromSeries(p,'solidus')[0],display=displayedSolidus(m,x,root,p);return{x,direct,display,error:Math.abs(display-direct)}});
 writeFileSync(file,JSON.stringify(checked,null,2));console.log(k,'branch-aware solidus display maximum deviation / K',Math.max(...checked.map(q=>q.error)).toFixed(4));
}