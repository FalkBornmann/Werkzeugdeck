import {readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {validateCatalog, renderPage} from './site.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, 'tools.json'), 'utf8').replace(/^\uFEFF/, ''));
validateCatalog(catalog);
const output = resolve(root, 'dist');
if (output !== join(root, 'dist')) throw new Error('Unexpected build output directory');
rmSync(output, {recursive: true, force: true});
mkdirSync(join(output, 'assets'), {recursive: true});
for (const file of ['site.css', 'catalog.js']) copyFileSync(join(root, 'assets', file), join(output, 'assets', file));
const home = renderPage(catalog);
writeFileSync(join(output, 'index.html'), home);
writeFileSync(join(root, 'index.html'), home);
for (const domain of catalog.domains) {
  const directory = join(output, 'bereiche', domain.id);
  mkdirSync(directory, {recursive: true});
  writeFileSync(join(directory, 'index.html'), renderPage(catalog, domain));
}
const redirects = [];
for (const tool of catalog.tools.filter(tool => tool.status === 'available')) {
  let source = resolve(root, tool.sourceDirectory);
  if (!existsSync(join(source, '.git'))) {
    source = join(root, '.build-sources', tool.id);
    if (!existsSync(join(source, '.git'))) {
      mkdirSync(join(root, '.build-sources'), {recursive: true});
      execFileSync('git', ['clone', '--no-checkout', `https://github.com/${tool.repository}.git`, source], {stdio: 'inherit'});
    }
  }
  try {
    execFileSync('git', ['-C', source, 'cat-file', '-e', `${tool.revision}^{commit}`]);
  } catch {
    execFileSync('git', ['-C', source, 'fetch', 'origin', tool.revision], {stdio: 'inherit'});
  }
  const destination = join(output, 'tools', tool.id);
  mkdirSync(destination, {recursive: true});
  for (const asset of tool.assets) {
    let content = execFileSync('git', ['-C', source, 'show', `${tool.revision}:${asset}`], {maxBuffer: 32 * 1024 * 1024});
    if (asset === 'index.html' && tool.browserRuntime) {
      let html = content.toString('utf8');
      if (!/<meta\b[^>]*name=["']eis-runtime["']/i.test(html)) html = html.replace('<title>', '<meta name="eis-runtime" content="browser">\n<title>');
      content = Buffer.from(html);
    }
    writeFileSync(join(destination, asset), content);
  }
  for (const alias of tool.aliases) {
    redirects.push(`${alias} /tools/${tool.id}/ 301`);
    redirects.push(`${alias}* /tools/${tool.id}/:splat 301`);
  }
}
writeFileSync(join(output, '_redirects'), redirects.join('\n') + '\n');
writeFileSync(join(output, '404.html'), '<!doctype html><html lang="de"><meta charset="utf-8"><title>Seite nicht gefunden · Werkzeugdeck</title><h1>Diese Seite wurde nicht gefunden.</h1><p><a href="/">Zum Werkzeugkatalog</a></p></html>');
console.log(`Built Werkzeugdeck with ${catalog.tools.filter(tool => tool.status === 'available').length} tools and ${catalog.domains.length} domains.`);
