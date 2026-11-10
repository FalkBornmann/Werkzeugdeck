import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareDownloads, renderDownloads} from '../scripts/downloads.mjs';
const catalog=JSON.parse(readFileSync(new URL('../tools.json',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../content/downloads.json',import.meta.url),'utf8'));
test('empty download area never invents packages or download links',()=>{
  const data=prepareDownloads(manifest,catalog,'unused');
  const html=renderDownloads(catalog,data);
  assert.equal(data.items.length,0);
  assert.match(html,/noch keine Dateien veröffentlicht/);
  assert.doesNotMatch(html,/href="\/tools\/| download[ >]/);
  for(const category of data.categories) assert.ok(html.includes(`id="${category.id}"`));
});
test('only explicitly listed releases are copied with real sizes and checksums',()=>{
  const dir=mkdtempSync(join(tmpdir(),'werkzeugdeck-downloads-'));
  try {
    writeFileSync(join(dir,'guide.txt'),'Test');
    writeFileSync(join(dir,'private.txt'),'Not published');
    const entry={id:'guide',category:'anleitungen',title:'Anleitung',description:'Beispiel',status:'available',file:'guide.txt',version:'1.0',updated:'2026-11-10',format:'TXT',requirements:'Textbetrachter',license:'Test',instructions:'Datei öffnen.'};
    const input={...manifest,items:[entry]};
    const result=prepareDownloads(input,catalog,dir,join(dir,'out'));
    assert.equal(result.items[0].bytes,4);
    assert.match(result.items[0].sha256,/^[a-f0-9]{64}$/);
    assert.equal(readFileSync(join(dir,'out/dateien/guide/guide.txt'),'utf8'),'Test');
    assert.match(renderDownloads(catalog,result),/href="\/downloads\/dateien\/guide\/guide.txt" download/);
    assert.throws(()=>prepareDownloads({...input,items:[{...entry,file:'../secret'}]},catalog,dir),/Unsafe/);
    assert.throws(()=>prepareDownloads({...input,items:[{...entry,file:'missing.txt'}]},catalog,dir));
    assert.throws(()=>prepareDownloads({...input,items:[{...entry,version:''}]},catalog,dir),/metadata/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
