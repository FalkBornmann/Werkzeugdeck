import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {theory} from '../content/theory.mjs';
import {validateTheory, renderTheoryPage} from '../scripts/theory.mjs';
import {renderPage} from '../scripts/site.mjs';
const catalog = JSON.parse(readFileSync(new URL('../tools.json', import.meta.url),'utf8').replace(/^\uFEFF/,''));
test('every domain has a sourced learning path and every available tool is covered', () => validateTheory(catalog, theory));
test('adding a tool requires a deliberate theory integration', () => {
  const changed = structuredClone(catalog);
  changed.tools.push({...changed.tools[0], id:'new-tool'});
  assert.throws(() => validateTheory(changed, theory), /Extend elektrochemie theory for new tool/);
});
test('theory page uses its own canonical address and chapter navigation', () => {
  for (const domain of catalog.domains) {
    const html = renderTheoryPage(catalog, domain, theory[domain.id]);
    assert.ok(html.includes(`rel="canonical" href="${catalog.site.url}/bereiche/${domain.id}/theorie/"`));
    for (const chapter of theory[domain.id].chapters) assert.ok(html.includes(`href="#${chapter.id}"`));
    assert.ok(renderPage(catalog, domain).includes(`/bereiche/${domain.id}/theorie/`));
  }
});
