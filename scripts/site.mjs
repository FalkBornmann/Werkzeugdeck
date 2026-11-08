import {activityIcon, themes} from './design.mjs';
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

export function validateCatalog(catalog) {
  for (const domain of catalog.domains) if (!themes[domain.id]) throw new Error(`Choose a domain design theme: ${domain.id}`);
  const domainIds = new Set(catalog.domains.map(domain => domain.id));
  const collectionIds = new Set(catalog.collections.map(collection => collection.id));
  const ids = new Set();
  for (const tool of catalog.tools) {
    if (!/^[a-z0-9-]+$/.test(tool.id) || ids.has(tool.id)) throw new Error(`Invalid or duplicate tool ID: ${tool.id}`);
    ids.add(tool.id);
    if (!['available', 'planned'].includes(tool.status)) throw new Error(`Invalid status: ${tool.id}`);
    if (!tool.domains.length || tool.domains.some(id => !domainIds.has(id))) throw new Error(`Unknown domain: ${tool.id}`);
    if (!catalog.activities[tool.activity]) throw new Error(`Unknown activity: ${tool.id}`);
    if (tool.collections.some(id => !collectionIds.has(id))) throw new Error(`Unknown collection: ${tool.id}`);
    if (tool.status === 'planned') continue;
    if (!/^[\w-]+\/[\w.-]+$/.test(tool.repository) || !/^[a-f0-9]{40}$/.test(tool.revision)) throw new Error(`Missing pinned source: ${tool.id}`);
    if (!tool.assets.includes('index.html') || tool.assets.some(asset => !/^[\w.-]+$/.test(asset))) throw new Error(`Invalid assets: ${tool.id}`);
  }
}

function card(catalog, tool) {
  const e = escapeHtml;
  const filters = [...tool.domains, ...tool.collections];
  const domain = catalog.domains.find(domain => domain.id === tool.domains[0]);
  const planned = tool.status === 'planned';
  return `<article class="tool-card" data-domain="${domain.id}" data-tool="${tool.id}" data-filters="${filters.join(' ')}" data-keywords="${e(tool.tags.join(' '))}">
    <div class="meta"><span>${e(domain.title)}</span><span class="wd-activity">${activityIcon(tool.activity)}${e(catalog.activities[tool.activity])}</span>${planned ? '<span class="planned">Geplant</span>' : ''}</div>
    <h4>${e(tool.title)}</h4><p>${e(tool.description)}</p>
    ${planned ? '<p class="hint">Noch in Planung</p>' : `<a class="open" href="/tools/${tool.id}/">Werkzeug öffnen →</a><a class="repo" href="https://github.com/${tool.repository}">Quellcode auf GitHub</a>`}
  </article>`;
}

export function renderPage(catalog, domain = null) {
  const e = escapeHtml;
  const tools = domain ? catalog.tools.filter(tool => tool.domains.includes(domain.id)) : catalog.tools;
  const title = domain ? domain.title : 'Werkzeugdeck';
  const grouped = Object.entries(catalog.activities).map(([id, name]) => {
    const group = tools.filter(tool => tool.activity === id);
    return group.length ? `<section class="topic" ${domain ? '' : 'data-group'}><h3>${e(name)}</h3><div class="grid">${group.map(tool => card(catalog, tool)).join('')}</div></section>` : '';
  }).join('');
  const domains = catalog.domains.map(item => `<article class="domain-card" data-domain="${item.id}"><h3><a href="/bereiche/${item.id}/">${e(item.title)}</a></h3><p>${e(item.description)}</p><p class="hint">${catalog.tools.filter(tool => tool.domains.includes(item.id) && tool.status === 'available').length} verfügbar · ${catalog.tools.filter(tool => tool.domains.includes(item.id) && tool.status === 'planned').length} geplant</p><a href="/bereiche/${item.id}/theorie/">Grundlagen & Theorie →</a></article>`).join('');
  return `<!doctype html>
<html lang="de"${domain ? ` data-domain="${domain.id}"` : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}${domain ? ' · Werkzeugdeck' : ' · Wissenschaft verstehen und anwenden'}</title>
<meta name="description" content="${e(domain?.description || 'Interaktive Werkzeuge für Datenauswertung, Simulation und wissenschaftliche Zusammenhänge.')}">
<link rel="canonical" href="${catalog.site.url}${domain ? `/bereiche/${domain.id}/` : '/'}"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/tool-theme.css">
${domain ? '' : '<script type="module" src="/assets/catalog.js"></script>'}</head><body>
<a class="skip" href="#inhalt">Zum Inhalt</a>
<header><div class="wrap"><a class="brand" href="/">Werkzeugdeck</a><p class="eyebrow">Wissenschaft verstehen und anwenden</p>
${domain ? `<nav class="breadcrumbs" aria-label="Orientierung"><a href="/">Werkzeugdeck</a> › ${e(domain.title)}</nav>` : ''}
<h1>${e(title)}</h1><p>${e(domain?.description || 'Messdaten auswerten, Modelle ausprobieren und Zusammenhänge entdecken – direkt im Browser.')}</p></div></header>
<main class="wrap" id="inhalt">
${domain ? `<section class="theory-entry"><div><p class="eyebrow">Verstehen und anwenden</p><h2>Grundlagen & Theorie</h2><p>Vom Einstieg zum Rechenweg: Fachbegriffe, Zusammenhänge, Modellannahmen und eingeordnete Quellen zu ${e(domain.title)}.</p><a class="open" href="/bereiche/${domain.id}/theorie/">Theorie erkunden →</a></div><a href="/#${domain.id}">Alle Werkzeuge dieses Fachgebiets</a></section><h2>Werkzeuge und Vorhaben</h2>${grouped}` : `
<section aria-labelledby="laborwerkzeuge"><h2 id="laborwerkzeuge">Laborwerkzeuge</h2><p>Entdecke die Sammlung nach Fachgebiet oder starte mit den theoretischen Spielereien.</p>
<nav class="filters" aria-label="Werkzeuge filtern"><a data-filter="alle" href="#alle">Alle Werkzeuge</a>${catalog.collections.map(item => `<a data-filter="${item.id}" href="#${item.id}">${e(item.title)}</a>`).join('')}${catalog.domains.map(item => `<a data-filter="${item.id}" href="#${item.id}">${e(item.title)}</a>`).join('')}</nav>
<div class="search-panel"><label for="tool-search">Werkzeug oder Thema suchen</label><input type="search" id="tool-search" placeholder="z. B. Impedanz, Diffusion oder Lack"><p class="hint" id="result-count" role="status" aria-live="polite"></p></div>
<p id="empty" hidden>Keine passenden Werkzeuge gefunden. Wähle „Alle Werkzeuge“ oder einen anderen Suchbegriff.</p>
${grouped}<noscript><p>Die gesamte Sammlung ist sichtbar. Die Themenübersichten funktionieren auch ohne JavaScript.</p></noscript></section>
<section aria-labelledby="fachgebiete"><h2 id="fachgebiete">Fachgebiete entdecken</h2><div class="grid">${domains}</div></section>
<section class="intro topic"><h2>So nutzt du Werkzeugdeck</h2><p>Beginne mit der kurzen Einführung im Werkzeug, probiere ein Beispiel oder eigene Daten aus und lies anschließend die Hinweise zur Ergebnisinterpretation. Vertiefende Theorie, Verfahren und Fachquellen findest du im aufklappbaren Abschnitt der jeweiligen Anwendung.</p><a href="https://github.com/FalkBornmann/Werkzeugdeck">Projekt und weitere Entwicklung auf GitHub</a></section>`}
</main><footer><div class="wrap"><p><strong>Privates Projekt in Entwicklung</strong> · <a href="/">Werkzeugdeck</a> · <a href="https://github.com/FalkBornmann/Werkzeugdeck">GitHub</a></p>
<details><summary>Projekt, Datenverarbeitung und Nutzungshinweise</summary>
<h3>Zweck und Grenzen</h3><p>Die Werkzeuge dienen dem Lernen und der explorativen Auswertung. Prüfe Ergebnisse unabhängig, bevor du sie für Berichte, Freigaben oder sicherheitsrelevante Entscheidungen verwendest. Geplante Werkzeuge sind als Vorhaben gekennzeichnet.</p>
<h3>KI und Verarbeitung</h3><p>Bei der Entwicklung von Code und Texten kommt KI-Unterstützung zum Einsatz. Die aktuell verfügbaren Anwendungen berechnen Auswertungen und Simulationen auf deinem Gerät im Browser. Messdaten und Eingaben werden dabei nicht hochgeladen oder dauerhaft im Browserspeicher abgelegt. Exporte werden auf deinem Gerät erzeugt. Details zu Verfahren und Datenverarbeitung stehen im jeweiligen Werkzeug.</p>
<h3>Hosting und Bibliotheken</h3><p>Cloudflare Pages liefert Werkzeugdeck aus. EIS-Fitting lädt Rechenbibliotheken über jsDelivr. Bei Abrufen erhalten die Anbieter technisch notwendige Verbindungsdaten. Weitere Informationen bieten die Datenschutzhinweise von <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a> und <a href="https://www.jsdelivr.com/terms/privacy-policy">jsDelivr</a>. Werkzeugdeck setzt selbst keine Analyse- oder Werbetracker ein und verlangt kein Benutzerkonto.</p>
<h3>Haftung</h3><p>Für Richtigkeit, Vollständigkeit, Verfügbarkeit und Eignung wird keine Garantie übernommen. Es gelten die gesetzlichen Haftungsregelungen.</p></details></div></footer></body></html>`;
}
