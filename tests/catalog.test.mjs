import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalog, renderPage} from '../scripts/site.mjs';

const catalog = JSON.parse(readFileSync(new URL('../tools.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
test('catalog references and monorepo sources are consistent', () => validateCatalog(catalog));

test('available tools must use the shared repository and safe unique directories', () => {
  const modified=structuredClone(catalog);
  modified.tools[0].repository='Werkzeugdeck/another-tool';
  assert.throws(()=>validateCatalog(modified), /shared Werkzeugdeck repository/);
  modified.tools[0]={...catalog.tools[0],sourceDirectory:'../private'};
  assert.throws(()=>validateCatalog(modified), /Invalid source directory/);
  modified.tools[0]={...catalog.tools[0],sourceDirectory:'C:\\private'};
  assert.throws(()=>validateCatalog(modified), /Invalid source directory/);
  modified.tools[0]={...catalog.tools[0],sourceDirectory:catalog.tools[1].sourceDirectory};
  assert.throws(()=>validateCatalog(modified), /Duplicate source directory/);
});

test('planned tools never receive launch links', () => {
  const modified = structuredClone(catalog);
  modified.tools.push({id:'test-vorhaben',title:'Testvorhaben',description:'Test',status:'planned',domains:['beschichtungen'],activity:'bildanalyse',collections:[],tags:[]});
  const html = renderPage(modified);
  assert.match(html, /Testvorhaben/);
  assert.doesNotMatch(html, /href="\/tools\/test-vorhaben/);
});
test('tool can appear in multiple domains without duplicating its address', () => {
  const modified = structuredClone(catalog);
  modified.tools[0].domains.push('beschichtungen');
  for (const id of ['elektrochemie', 'beschichtungen']) {
    const html = renderPage(modified, modified.domains.find(domain => domain.id === id));
    assert.match(html, /href="\/tools\/eis-fitting\/"/);
  }
});
test('invalid source paths and unknown categories fail before publication', () => {
  const invalid = structuredClone(catalog);
  invalid.tools[0].assets.push('../secret');
  assert.throws(() => validateCatalog(invalid), /Invalid assets/);
  invalid.tools[0] = {...catalog.tools[0], domains: ['missing']};
  assert.throws(() => validateCatalog(invalid), /Unknown domain/);
});
