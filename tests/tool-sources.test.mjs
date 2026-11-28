import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {copyToolAssets} from '../scripts/tool-sources.mjs';

test('a checkout without nested Git repositories builds its current local tool files', () => {
  const root=mkdtempSync(join(tmpdir(),'werkzeugdeck-source-'));
  try {
    mkdirSync(join(root,'Thema','Tool'),{recursive:true});
    writeFileSync(join(root,'Thema','Tool','index.html'),'<h1>Version 1</h1>');
    const tool={sourceDirectory:'Thema/Tool',assets:['index.html']};
    copyToolAssets(root,tool,join(root,'dist'));
    assert.equal(readFileSync(join(root,'dist','index.html'),'utf8'),'<h1>Version 1</h1>');
    writeFileSync(join(root,'Thema','Tool','index.html'),'<h1>Version 2</h1>');
    copyToolAssets(root,tool,join(root,'dist'));
    assert.match(readFileSync(join(root,'dist','index.html'),'utf8'),/Version 2/);
    assert.throws(()=>copyToolAssets(root,{...tool,assets:['../private']},join(root,'dist')),/Invalid asset/);
    assert.throws(()=>copyToolAssets(root,{...tool,sourceDirectory:'..'},join(root,'dist')),/Source must remain inside/);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('the shared repository keeps paid services and Actions disabled', () => {
  const policy=JSON.parse(readFileSync(new URL('../project-repository.json',import.meta.url),'utf8'));
  assert.equal(policy.mode,'monorepo');
  assert.equal(policy.actionsEnabled,false);
  assert.equal(policy.paidServicesAllowed,false);
  const workflows=new URL('../.github/workflows/',import.meta.url);
  let files=[];
  try {files=readdirSync(workflows);} catch(error) {if(error.code!=='ENOENT')throw error;}
  assert.equal(files.filter(name=>/\.ya?ml$/i.test(name)).length,0,'GitHub workflows are forbidden; run checks locally');
});
