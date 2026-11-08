/* Run after npm run build. Checks actual CSS loading and rendered icon bounds. */
const {chromium} = require(process.env.WERKZEUGDECK_PLAYWRIGHT || 'playwright');
const {createServer} = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
(async () => {
  const catalog = JSON.parse((await fs.readFile(path.join(root,'tools.json'),'utf8')).replace(/^\uFEFF/,''));
  const {themes} = await import('./design.mjs');
  const output = path.join(root,'Archiv','Design-Pruefung');
  await fs.mkdir(output,{recursive:true});
  const server = createServer(async(request,response) => {
    const pathname = new URL(request.url,'http://localhost').pathname;
    const file = path.join(root,'dist',pathname.endsWith('/') ? pathname+'index.html' : pathname);
    try {
      response.setHeader('Content-Type',{'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'}[path.extname(file)] || 'application/octet-stream');
      response.end(await fs.readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve=>server.listen(8895,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true,...(process.env.EIS_BROWSER ? {executablePath:process.env.EIS_BROWSER} : {})});
    for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
      const page = await browser.newPage({viewport});
      for (const tool of catalog.tools.filter(tool=>tool.status==='available')) {
        const failures = [];
        const listener = response => { if(response.url().endsWith('tool-theme.css') && (response.status()!==200 || !response.headers()['content-type']?.includes('text/css'))) failures.push(response.status()); };
        page.on('response',listener);
        await page.goto(`http://127.0.0.1:8895/tools/${tool.id}/`);
        await page.waitForSelector('.tool-context .wd-icon');
        const layout = await page.evaluate(() => {
          const icon = document.querySelector('.tool-context .wd-icon');
          const bounds = icon.getBoundingClientRect();
          return {
            iconWidth:bounds.width, iconHeight:bounds.height, fill:getComputedStyle(icon).fill,
            barHeight:document.querySelector('.tool-context').getBoundingClientRect().height,
            headColor:getComputedStyle(document.querySelector('header')).backgroundColor,
            themeLoaded:[...document.styleSheets].some(sheet=>sheet.href?.endsWith('/tool-theme.css') && sheet.cssRules.length>0),
            mainTop:document.querySelector('main').getBoundingClientRect().top
          };
        });
        const color = themes[tool.domains[0]].dark;
        const expected = `rgb(${[1,3,5].map(offset=>parseInt(color.slice(offset,offset+2),16)).join(', ')})`;
        assert.equal(layout.themeLoaded,true,tool.id+' shared CSS not loaded');
        assert.deepEqual(failures,[]);
        assert.equal(layout.headColor,expected,tool.id+' wrong subject theme');
        assert.equal(layout.fill,'none',tool.id+' icon unexpectedly filled');
        assert.ok(layout.iconWidth>=20 && layout.iconWidth<=24 && layout.iconHeight>=20 && layout.iconHeight<=24,tool.id+' oversized icon');
        assert.ok(layout.barHeight<180,tool.id+' context bar dominates the viewport');
        assert.ok(layout.mainTop<900,tool.id+' content displaced by navigation');
        if(['eis-fitting','potentialkurven'].includes(tool.id)) await page.screenshot({path:path.join(output,`${tool.id}-${viewport.width}.png`)});
        page.off('response',listener);
        console.log(`${tool.id} ${viewport.width}px: loaded CSS, subject color and bounded icon passed`);
      }
      await page.close();
    }
    const fallback = await browser.newPage({viewport:{width:390,height:844}});
    await fallback.route('**/tool-theme.css',route=>route.abort());
    await fallback.goto('http://127.0.0.1:8895/tools/eis-fitting/');
    const bounds = await fallback.locator('.tool-context .wd-icon').boundingBox();
    assert.ok(bounds.width<=24 && bounds.height<=24,'icon must remain bounded without shared CSS');
    await fallback.close();
    console.log('All five tool designs and the stylesheet-failure fallback passed.');
  } finally { await browser?.close(); server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
