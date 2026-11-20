import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {temperatureWindow} from '../temperature-window.js';
import {surfaceTemperature} from '../boundary.js';
import {profile,solve,nearest} from '../equilibrium.js';
import {solidificationHistory} from '../solidification.js';
import {constructionChart} from '../construction.js';
const model=JSON.parse(gunzipSync(readFileSync(new URL('../bisn-hulls.json.gz',import.meta.url))));
test('automatic section window includes the lowest transition with margin and ignores cursor changes',()=>{
 const columns=[{series:[{temperature:40,phases:[],signature:'A'},{temperature:50,phases:[],signature:'B'},{temperature:200,phases:[],signature:'B'}]}];
 const m={T:[0,40,50,200,300]};
 assert.deepEqual(temperatureWindow(m,columns),[25,65]);
 assert.deepEqual(temperatureWindow(m,columns,'all'),[0,300]);
 assert.deepEqual(temperatureWindow(m,columns,'manual',[1000,1200]),[0,300]);
 assert.deepEqual(temperatureWindow(m,[{series:[{temperature:0,signature:'A',phases:[]}]}]),[0,300]);
});
test('eutectic constituents differ from phase fractions and preserve their total',()=>{
 const x=[.45,.55],series=profile(model,x),ti=nearest(model.T,100),current=solve(model,x,ti);
 const s={model,profiles:[series],points:[x],labels:['X1'],selected:0,basis:'mole',ti,current,binary:true};
 const h=solidificationHistory(s);
 assert.ok(h.constituent.eutectic>0&&h.constituent.eutectic<1);
 assert.ok(Math.abs(h.constituent.primary+h.constituent.eutectic-1)<1e-10);
 assert.ok(!h.peritectic);
 const graphic=constructionChart(s);assert.ok(!/NaN|Infinity|<image/.test(graphic));
 assert.ok(graphic.includes('Bilanz'));
});
for(const key of ['sac','pbsnbi']){
 test(key+' liquidus display agrees with independent direct-equilibrium hold-out points',()=>{
  const a=JSON.parse(gunzipSync(readFileSync(new URL('../'+key+'-liquidus.json.gz',import.meta.url))));
  const n=a.n,surface={n,nodes:a.nodes.map(p=>({value:p[0]}))};
  const reference=JSON.parse(readFileSync(new URL('./liquidus-reference-'+key+'.json',import.meta.url)));
  const errors=reference.map(q=>Math.abs(surfaceTemperature(surface,q.x)-q.direct));
  console.log(key+' liquidus hold-out max deviation '+Math.max(...errors).toFixed(3)+' K');
  assert.ok(Math.max(...errors)<3);
  assert.ok(a.sampleCount>2000);
 });
}

