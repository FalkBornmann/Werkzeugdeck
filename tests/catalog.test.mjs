import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalog, renderPage} from '../scripts/site.mjs';

const catalog = JSON.parse(readFileSync(new URL('../tools.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
test('catalog references are consistent and sources pinned', () => validateCatalog(catalog));
test('planned tools never receive launch links', () => {
  const html = renderPage(catalog);
  assert.match(html, /NSS-Beschichtungsanalyse/);
  assert.doesNotMatch(html, /href="\/tools\/nss-beschichtungsanalyse/);
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
