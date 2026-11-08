export function validateToolDocument(html, assets, id) {
  if (!/<head(?:\s[^>]*)?>[\s\S]*?<\/head>/i.test(html)) throw new Error(`Explicit HTML head missing: ${id}`);
  let themeLinked = false;
  for (const match of html.matchAll(/<(link|script)\b[^>]*>/gi)) {
    const tag = match[0];
    const source = tag.match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!source || /^(?:https?:|\/\/|#)/i.test(source)) continue;
    if (match[1].toLowerCase() === 'link' && !/\brel\s*=\s*["']stylesheet["']/i.test(tag)) continue;
    const file = source.replace(/^\.\//, '').split(/[?#]/)[0];
    if (!assets.includes(file)) throw new Error(`Referenced asset is not packaged in ${id}: ${file}`);
    if (file === 'tool-theme.css') themeLinked = true;
  }
  if (!themeLinked) throw new Error(`Shared tool theme not linked: ${id}`);
  for (const icon of html.matchAll(/<svg\b[^>]*class=["'][^"']*\bwd-icon\b[^"']*["'][^>]*>/gi)) {
    if (!/\bwidth=["']22["']/.test(icon[0]) || !/\bheight=["']22["']/.test(icon[0])) throw new Error(`Icon fallback dimensions missing: ${id}`);
  }
}
