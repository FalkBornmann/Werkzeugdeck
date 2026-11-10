import {readFileSync, statSync, mkdirSync, copyFileSync} from 'node:fs';
import {join, resolve, sep, basename} from 'node:path';
import {createHash} from 'node:crypto';
import {escapeHtml as e, renderPage} from './site.mjs';

// Only explicitly listed local files are published; never copy a whole working directory.
export function prepareDownloads(manifest, catalog, source, output) {
  const categories = new Set();
  const ids = new Set();
  const validId = id => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
  for (const category of manifest.categories) {
    if (!validId(category.id) || categories.has(category.id) || !category.title || !category.description) throw new Error('Invalid download category');
    categories.add(category.id);
  }
  const items = manifest.items.map(item => {
    if (!validId(item.id) || ids.has(item.id) || !categories.has(item.category) || !item.title || !item.description || !['planned','available'].includes(item.status)) throw new Error('Invalid download entry: '+item.id);
    ids.add(item.id);
    if (item.tool && !catalog.tools.some(tool=>tool.id===item.tool)) throw new Error('Unknown download tool: '+item.tool);
    if (item.status === 'planned') {
      if (item.file) throw new Error('Planned download must not publish a file: '+item.id);
      return {...item};
    }
    if (!item.version || !/^\d{4}-\d{2}-\d{2}$/.test(item.updated || '') || !item.format || !item.requirements || !item.license || !item.instructions) throw new Error('Missing release metadata: '+item.id);
    if (typeof item.file !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(item.file) || item.file.split('/').some(part=>!part || part==='.' || part==='..')) throw new Error('Unsafe download path: '+item.id);
    const file = resolve(source,item.file);
    if (!file.startsWith(resolve(source)+sep) || !statSync(file).isFile()) throw new Error('Missing download file: '+item.id);
    const bytes = readFileSync(file);
    if (!bytes.length || bytes.length > 24*1024*1024) throw new Error('Download must contain 1 byte to 24 MiB: '+item.id);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const url = `/downloads/dateien/${item.id}/${basename(file)}`;
    if (output) {
      const destination = join(output,'dateien',item.id);
      mkdirSync(destination,{recursive:true});
      copyFileSync(file,join(destination,basename(file)));
    }
    return {...item, bytes:bytes.length, sha256, url};
  });
  return {...manifest,items};
}

export function renderDownloads(catalog, manifest) {
  const count = manifest.items.filter(item=>item.status==='available').length;
  const sections = manifest.categories.map(category=>`<section class="topic" id="${category.id}" aria-labelledby="title-${category.id}"><h2 id="title-${category.id}">${e(category.title)}</h2><p>${e(category.description)}</p><div class="grid">${manifest.items.filter(item=>item.category===category.id).map(item=>{
    return `<article class="tool-card"><div class="meta"><span class="${item.status==='planned'?'planned':''}">${item.status==='available'?'Verfügbar':'In Vorbereitung'}</span></div><h3>${e(item.title)}</h3><p>${e(item.description)}</p>${item.status==='available'?`<dl class="download-meta"><dt>Version / Stand</dt><dd>${e(item.version)} · ${e(item.updated)}</dd><dt>Datei</dt><dd>${e(item.format)} · ${new Intl.NumberFormat('de-DE').format(item.bytes)} Byte</dd><dt>Voraussetzungen</dt><dd>${e(item.requirements)}</dd><dt>Nutzung / Lizenz</dt><dd>${e(item.license)}</dd></dl><p>${e(item.instructions)}</p><a class="open" href="${e(item.url)}" download>${e(item.format)} herunterladen ↓</a><details><summary>SHA-256-Prüfsumme</summary><code class="checksum">${item.sha256}</code></details>`:'<p class="hint">Noch kein Download verfügbar.</p>'}</article>`;
  }).join('') || `<article class="intro"><h3>Noch keine Dateien veröffentlicht</h3><p>Hier werden künftig ${e(category.title)} bereitgestellt.</p>${category.id==='theorie'?`<p>Die Fachtheorie kannst du bereits online lesen:</p><ul>${catalog.domains.map(domain=>`<li><a href="/bereiche/${domain.id}/theorie/">${e(domain.title)}</a></li>`).join('')}</ul>`:''}</article>`}</div><a class="hint" href="#download-kategorien">Zur Kategorienübersicht ↑</a></section>`).join('');
  const main = `<main class="wrap" id="inhalt"><section class="intro"><h2>Zum Mitnehmen</h2><p>Hier entsteht die Sammlung für Offlineanwendungen, Anleitungen, Theorie und weitere Materialien zum Werkzeugdeck.</p><p><strong>${count ? `${count} Downloads verfügbar.` : 'Der Downloadbereich ist eingerichtet. Aktuell sind noch keine Dateien veröffentlicht.'}</strong> Einträge in Vorbereitung haben noch keinen Download.</p></section><nav class="filters" aria-label="Downloadkategorien" id="download-kategorien">${manifest.categories.map(category=>`<a href="#${category.id}">${e(category.title)}</a>`).join('')}</nav>${sections}<section class="intro"><h2>Hinweise zu Downloads</h2><p>Version, Voraussetzungen und Nutzungshinweise stehen bei jeder veröffentlichten Datei. Offlinefähigkeit wird erst am geprüften Paket bestätigt; eine gespeicherte Webseite oder ein Quellcodearchiv ersetzt kein Offlinepaket.</p><p>Die Dateien werden von Cloudflare ausgeliefert. Beim Herunterladen werden technisch notwendige Verbindungsdaten verarbeitet; Messdaten werden dabei nicht übermittelt. Prüfe Ergebnisse unabhängig und beachte die Hinweise der jeweiligen Anwendung. Ältere Offlineversionen erhalten Änderungen erst durch einen erneuten Download.</p></section></main>`;
  return renderPage(catalog)
    .replace(/<title>.*?<\/title>/,'<title>Downloads · Werkzeugdeck</title>')
    .replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Offlineanwendungen, Anleitungen, Theorie und Materialien zum Werkzeugdeck. Verfügbarkeit, Versionen und Nutzungshinweise an einem Ort.">')
    .replace(`href="${catalog.site.url}/"`,`href="${catalog.site.url}/downloads/"`)
    .replace('<script type="module" src="/assets/catalog.js"></script>','')
    .replace('<h1>Werkzeugdeck</h1>','<h1>Downloads</h1>')
    .replace('Messdaten auswerten, Modelle ausprobieren und Zusammenhänge entdecken – direkt im Browser.','Anwendungen und Wissen zum Mitnehmen.')
    .replace('<a href="/downloads/">Downloads</a>','<a href="/downloads/" aria-current="page">Downloads</a>')
    .replace(/<main class="wrap" id="inhalt">[\s\S]*?<\/main>/,main);
}
