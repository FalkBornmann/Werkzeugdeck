import {escapeHtml, renderPage} from './site.mjs';

export function validateTheory(catalog, theory) {
  const toolIds = new Set(catalog.tools.map(tool => tool.id));
  for (const domain of catalog.domains) {
    const content = theory[domain.id];
    if (!content?.intro || content.chapters.length < 4) throw new Error(`Theory introduction/chapters missing: ${domain.id}`);
    const sources = new Set(content.sources.map(source => source.id));
    const chapters = new Set();
    for (const chapter of content.chapters) {
      if (chapters.has(chapter.id)) throw new Error(`Duplicate theory chapter: ${chapter.id}`);
      chapters.add(chapter.id);
      if (chapter.paragraphs.length < 2 || !chapter.detail || !chapter.equation) throw new Error(`Theory explanation missing: ${chapter.id}`);
      if (!chapter.sources.length || chapter.sources.some(id => !sources.has(id))) throw new Error(`Theory sources missing: ${chapter.id}`);
      if (chapter.tools.some(id => !toolIds.has(id))) throw new Error(`Unknown theory tool: ${chapter.id}`);
    }
    for (const tool of catalog.tools.filter(tool => tool.status === 'available' && tool.domains.includes(domain.id))) {
      if (!content.chapters.some(chapter => chapter.tools.includes(tool.id))) throw new Error(`Extend ${domain.id} theory for new tool: ${tool.id}`);
    }
  }
}

export function renderTheoryPage(catalog, domain, content) {
  const e = escapeHtml;
  const sourceMap = new Map(content.sources.map(source => [source.id, source]));
  const chapters = content.chapters.map(chapter => `<section class="theory-chapter" id="${chapter.id}"><h2>${e(chapter.title)}</h2>${chapter.paragraphs.map(paragraph => `<p>${e(paragraph)}</p>`).join('')}<details><summary>Vertiefung · Modell und Rechenweg</summary><p class="equation">${e(chapter.equation)}</p><p>${e(chapter.detail)}</p></details>
    <p class="hint">Fachquellen: ${chapter.sources.map(id => `<a href="${e(sourceMap.get(id).url)}">${e(sourceMap.get(id).title)}</a>`).join(' · ')}</p>
    <p>Passende Werkzeuge: ${chapter.tools.map(id => catalog.tools.find(tool => tool.id === id)).map(tool => tool.status === 'available' ? `<a href="/tools/${tool.id}/">${e(tool.title)}</a>` : `${e(tool.title)} (geplant)`).join(' · ')}</p><a class="hint" href="#theorie-inhalt">Zum Inhaltsverzeichnis ↑</a></section>`).join('');
  const main = `<main class="wrap theory-layout" id="inhalt"><nav class="theory-toc" aria-label="Theorie-Inhaltsverzeichnis" id="theorie-inhalt"><h2>In diesem Lernweg</h2><ol>${content.chapters.map(chapter => `<li><a href="#${chapter.id}">${e(chapter.title.replace(/^\d+ · /,''))}</a></li>`).join('')}</ol><a href="/bereiche/${domain.id}/">Zur Werkzeugübersicht</a></nav><article><section class="intro"><h2>Grundlagen & Theorie · ${e(domain.title)}</h2><p>${e(content.intro)}</p><p class="hint">Lies den Lernweg der Reihe nach oder springe direkt zur passenden Frage. Vertiefungen lassen sich einzeln aufklappen.</p></section>${chapters}<section class="theory-chapter"><h2>Fachquellen und ihre Einordnung</h2><ul>${content.sources.map(source => `<li><a href="${e(source.url)}">${e(source.title)}</a><p>${e(source.role)}</p></li>`).join('')}</ul><p>Stand: 8. November 2026. Neue Werkzeuge erweitern diesen Lernweg um die benötigten Grundlagen, Annahmen und Quellen.</p></section></article></main>`;
  return renderPage(catalog, domain)
    .replace(`<title>${e(domain.title)} · Werkzeugdeck</title>`, `<title>${e(domain.title)} · Grundlagen & Theorie · Werkzeugdeck</title>`)
    .replace(`href="${catalog.site.url}/bereiche/${domain.id}/"`, `href="${catalog.site.url}/bereiche/${domain.id}/theorie/"`)
    .replace(/<main class="wrap" id="inhalt">[\s\S]*?<\/main>/, main);
}
