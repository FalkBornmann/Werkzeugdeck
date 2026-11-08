import test from 'node:test';
import assert from 'node:assert/strict';
import {validateToolDocument} from '../scripts/validate-document.mjs';
const assets = ['index.html','tool-theme.css','app.js'];
const document = '<html><head><link rel="stylesheet" href="./tool-theme.css"><script src="./app.js"></script></head><body><svg class="wd-icon" width="22" height="22"></svg></body></html>';
test('tool documents explicitly load the shared theme and package their dependencies', () => validateToolDocument(document,assets,'test'));
test('implicit head and unlinked theme fail the build', () => {
  assert.throws(() => validateToolDocument(document.replace('<head>','').replace('</head>',''),assets,'test'), /Explicit HTML head missing/);
  assert.throws(() => validateToolDocument(document.replace('<link rel="stylesheet" href="./tool-theme.css">',''),assets,'test'), /Shared tool theme not linked/);
});
test('missing assets and unbounded icons fail the build', () => {
  assert.throws(() => validateToolDocument(document,assets.filter(file=>file!=='app.js'),'test'), /not packaged/);
  assert.throws(() => validateToolDocument(document.replace(' width="22"',''),assets,'test'), /fallback dimensions/);
});
