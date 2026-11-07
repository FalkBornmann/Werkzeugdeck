/* Browser regression check. Requires Playwright and an installed Chromium browser.
 * WERKZEUGDECK_PLAYWRIGHT can point to the Playwright package, EIS_BROWSER to a browser.
 */
const {chromium} = require(process.env.WERKZEUGDECK_PLAYWRIGHT || 'playwright');
const {spawn} = require('node:child_process');
const {createServer} = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'Archiv', 'Export-Pruefung');
const eis = path.join(root, 'Elektrochemie', 'Datenauswertung', 'EIS-Fitting');

async function ready(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await new Promise((resolve, reject) => require('node:http').get(url, response => {
        response.resume();
        response.on('end', () => response.statusCode === 200 ? resolve() : reject(new Error('HTTP ' + response.statusCode)));
      }).on('error', reject));
      return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Test server did not start');
}

(async () => {
  await fs.mkdir(output, {recursive: true});
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.join(root, 'dist', pathname.endsWith('/') ? pathname + 'index.html' : pathname);
    const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
    try { response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); response.end(await fs.readFile(file)); }
    catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(8896, '127.0.0.1', resolve));
  const python = process.env.EIS_PYTHON || path.join(eis, '.venv', 'Scripts', 'python.exe');
  const api = spawn(python, ['app.py', '--port', '8897'], {cwd: eis, windowsHide: true, stdio: 'ignore'});
  let browser;
  try {
    await ready('http://127.0.0.1:8897/');
    browser = await chromium.launch({headless: true, ...(process.env.EIS_BROWSER ? {executablePath: process.env.EIS_BROWSER} : {})});
    const page = await browser.newPage({acceptDownloads: true, viewport: {width: 1440, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const saved = [];
    async function download(id, extension) {
      const promise = page.waitForEvent('download');
      await page.locator('#' + id).click();
      const item = await promise;
      assert.ok(item.suggestedFilename().endsWith('.' + extension));
      const destination = path.join(output, item.suggestedFilename());
      await item.saveAs(destination);
      const data = await fs.readFile(destination);
      if (extension === 'svg') {
        const svg = data.toString('utf8');
        const parsed = await page.evaluate(text => {
          const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
          return {errors: doc.querySelectorAll('parsererror').length, paths: doc.querySelectorAll('path,polyline,line,rect,circle').length, text: doc.querySelectorAll('text').length};
        }, svg);
        assert.equal(parsed.errors, 0, destination);
        assert.ok(parsed.paths > 0 && parsed.text > 0, destination);
        assert.doesNotMatch(svg, /<image\b|data:image|foreignObject/);
        await page.evaluate(async text => {
          const url = URL.createObjectURL(new Blob([text], {type: 'image/svg+xml'}));
          try { const image = new Image(); image.src = url; await image.decode(); if (!(image.width > 0 && image.height > 0)) throw new Error('Empty SVG'); }
          finally { URL.revokeObjectURL(url); }
        }, svg);
      } else {
        assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      }
      saved.push(destination);
      return data.toString('utf8');
    }

    await page.goto('http://127.0.0.1:8897/');
    await page.locator('#limit').selectOption('3');
    await page.locator('#demo').click();
    await page.waitForFunction(() => !document.getElementById('results').hidden, {}, {timeout: 180000});
    await page.locator('#project').check();
    await page.locator('#extend-low').click();
    for (const kind of ['bode', 'nyquist', 'schaltbild', 'uebersicht']) {
      await download('save-' + kind, 'png');
      await download('save-' + kind + '-svg', 'svg');
    }

    await page.goto('http://127.0.0.1:8896/tools/potentialkurven/');
    const curve = type => ['test', type, '0', '0', '0', '1', 'VoltaLab', '0', '41', ...Array.from({length: 41}, (_, index) => {
      const e = (index - 20) * 0.015;
      return type === 'TE' ? `${index} ${-0.2 + index * 0.0001}` : `${e} ${1e-6 * (10 ** (e / 0.1) - 10 ** (-e / 0.12))} ${index}`;
    })].join('\n');
    for (const type of ['TE', 'EIT']) {
      await page.locator('#file').setInputFiles({name: `synthetic-${type}.crv`, mimeType: 'text/plain', buffer: Buffer.from(curve(type))});
      await page.locator('#analysis').waitFor({state: 'visible'});
      if (type === 'EIT') {
        await page.locator('#area').fill('1');
        await page.locator('#area').dispatchEvent('change');
        await page.getByText('Passivierung und Grenzstrom markieren', {exact: true}).click();
        await page.locator('#passivation').fill('100');
      }
      await download('png', 'png');
      const svg = await download('svg', 'svg');
      assert.match(svg, type === 'TE' ? /Zeit \(s\)/ : /E Passivierung/);
    }

    await page.goto('http://127.0.0.1:8896/tools/keks-und-tee/');
    await page.waitForFunction(() => !document.getElementById('png').disabled, {}, {timeout: 120000});
    await page.locator('#end').click();
    await page.locator('#view').selectOption('soft');
    await page.locator('#profile-offset').fill('1');
    await page.locator('#profile-offset').dispatchEvent('input');
    for (const [png, svg] of [['png', 'scene-svg'], ['chart-png', 'chart-svg'], ['profile-png', 'profile-svg']]) {
      await download(png, 'png');
      const graphic = await download(svg, 'svg');
      assert.match(graphic, /Keks und Tee · t =/);
      assert.match(graphic, /Violett:|Türkis:/);
    }
    assert.deepEqual(errors, []);
    console.log(`Verified ${saved.length} PNG/SVG downloads, XML, vector content, labels and standalone SVG decoding.`);
  } finally {
    await browser?.close();
    api.kill();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
