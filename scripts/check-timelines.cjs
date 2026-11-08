/* Run after npm run build. Uses an isolated browser and local static files. */
const {chromium} = require(process.env.WERKZEUGDECK_PLAYWRIGHT || 'playwright');
const {createServer} = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

(async () => {
  const output = path.join(root, 'Archiv', 'Timeline-Pruefung');
  await fs.mkdir(output, {recursive: true});
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.join(root, 'dist', pathname.endsWith('/') ? pathname + 'index.html' : pathname);
    try {
      response.setHeader('Content-Type', {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'}[path.extname(file)] || 'application/octet-stream');
      response.end(await fs.readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(8898, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true, ...(process.env.EIS_BROWSER ? {executablePath: process.env.EIS_BROWSER} : {})});
    const tools = [
      {id: 'keks-und-tee', graphics: ['scene', 'profile-chart', 'chart'], clock: 'clock'},
      {id: 'winand-diagramm', graphics: ['diagram', 'surface', 'morphology', 'history'], clock: 'timeLabel'},
      {id: 'gefuegerechner', graphics: ['ztu', 'equilibrium', 'schematic', 'temperature', 'scene', 'profile', 'fractions'], clock: 'clock'}
    ];
    for (const viewport of [{width: 1365, height: 900}, {width: 390, height: 844}]) {
      const context = await browser.newContext({viewport, hasTouch: viewport.width < 600});
      for (const tool of tools) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:8898/tools/${tool.id}/`);
        if (tool.id === 'winand-diagramm') {
          await page.locator('#mode').selectOption('process');
          await page.locator('#processMode').selectOption('time');
        }
        if (tool.id === 'gefuegerechner') await page.locator('#run').click();
        await page.waitForFunction(() => document.body.classList.contains('has-timeline-dock'), {}, {timeout: 120000});
        assert.equal(await page.locator('#timeline').count(), 1);
        for (const graphic of tool.graphics) {
          await page.locator('#' + graphic).scrollIntoViewIfNeeded();
          const bounds = await page.evaluate(() => {
            const dock = document.querySelector('.timeline-dock').getBoundingClientRect();
            const slider = document.getElementById('timeline').getBoundingClientRect();
            const play = document.getElementById('play').getBoundingClientRect();
            return {height: innerHeight, width: innerWidth, dock: {top: dock.top, bottom: dock.bottom}, slider: {top: slider.top, bottom: slider.bottom, left: slider.left, right: slider.right}, play: {top: play.top, bottom: play.bottom}, overflow: document.documentElement.scrollWidth > innerWidth};
          });
          assert.ok(bounds.slider.top >= 0 && bounds.slider.bottom <= bounds.height, `${tool.id}/${graphic}: slider outside viewport`);
          assert.ok(bounds.play.top >= 0 && bounds.play.bottom <= bounds.height, `${tool.id}/${graphic}: play outside viewport`);
          if (bounds.overflow) {
            console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(element => ({tag: element.tagName, id: element.id, class: element.className, right: element.getBoundingClientRect().right}))));
            await page.screenshot({path: path.join(output, 'overflow.png')});
          }
          assert.ok(!bounds.overflow, `${tool.id}: horizontal overflow at ${viewport.width}px`);
          const scrollY = await page.evaluate(() => scrollY);
          await page.locator('#timeline').focus();
          await page.locator('#timeline').press('Home');
          assert.equal(await page.locator('#timeline').inputValue(), '0');
          const start = await page.locator('#' + tool.clock).textContent();
          await page.locator('#timeline').press('End');
          assert.equal(await page.locator('#timeline').inputValue(), await page.locator('#timeline').getAttribute('max'));
          assert.notEqual(await page.locator('#' + tool.clock).textContent(), start);
          assert.ok(await page.locator('#timeline').getAttribute('aria-valuetext'));
          assert.ok(Math.abs(await page.evaluate(() => scrollY) - scrollY) < 2, `${tool.id}: timeline use scrolled the page`);
        }
        const slider = await page.locator('#timeline').boundingBox();
        if (viewport.width < 600) await page.touchscreen.tap(slider.x + slider.width * 0.55, slider.y + slider.height / 2);
        else await page.mouse.click(slider.x + slider.width * 0.55, slider.y + slider.height / 2);
        const selected = Number(await page.locator('#timeline').inputValue());
        assert.ok(selected > 0 && selected < Number(await page.locator('#timeline').getAttribute('max')), 'pointer/touch must select an intermediate frame');
        await page.locator('#timeline').press('Home');
        await page.locator('#play').click();
        await page.waitForFunction(() => Number(document.getElementById('timeline').value) > 0);
        await page.locator('#play').click();
        const paused = await page.locator('#timeline').inputValue();
        await page.waitForTimeout(200);
        assert.equal(await page.locator('#timeline').inputValue(), paused);
        if (tool.id === 'gefuegerechner') {
          await page.locator('[data-zoom="fractions"]').click();
          assert.equal(await page.locator('dialog .timeline-dock').isVisible(), true);
          await page.locator('#timeline').press('End');
          const atEnd = await page.locator('#zoom-canvas').evaluate(canvas => canvas.toDataURL());
          await page.locator('#timeline').press('Home');
          const atStart = await page.locator('#zoom-canvas').evaluate(canvas => canvas.toDataURL());
          assert.notEqual(atEnd, atStart, 'enlarged graphic must follow the timeline');
          const visible = await page.locator('#timeline').evaluate(input => input.getBoundingClientRect().bottom <= innerHeight);
          assert.equal(visible, true);
          await page.screenshot({path: path.join(output, `zoom-${viewport.width}.png`)});
          await page.locator('#close-zoom').click();
          await page.locator('body > .timeline-dock').waitFor({state: 'visible'});
          assert.equal(await page.locator('body > .timeline-dock').isVisible(), true);
        }
        await page.screenshot({path: path.join(output, `${tool.id}-${viewport.width}.png`)});
        if (tool.id === 'keks-und-tee') {
          await page.locator('#calculate').click();
          await page.waitForFunction(() => document.body.classList.contains('has-timeline-dock') && !document.getElementById('timeline').disabled);
          assert.equal(await page.locator('#timeline').inputValue(), '0');
        }
        if (tool.id === 'winand-diagramm') {
          await page.locator('#mode').selectOption('compare');
          assert.equal(await page.locator('.timeline-dock').isVisible(), false);
          await page.locator('#mode').selectOption('process');
          assert.equal(await page.locator('.timeline-dock').isVisible(), true);
        }
        if (tool.id === 'gefuegerechner') {
          await page.locator('#size').fill('15');
          await page.locator('#size').dispatchEvent('change');
          assert.equal(await page.locator('.timeline-dock').isVisible(), false);
          assert.equal(await page.locator('#timeline').isDisabled(), true);
        }
        assert.deepEqual(errors, []);
        console.log(`${tool.id}: ${tool.graphics.length} graphics, keyboard, play/pause, ${viewport.width}px passed`);
        await page.close();
      }
      await context.close();
    }
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
