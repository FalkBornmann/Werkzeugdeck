const {chromium}=require(process.env.WERKZEUGDECK_PLAYWRIGHT);
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../../Archiv/Aluminium-Logzeit');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname,file=path.join(root,pathname==='/'?'index.html':pathname);try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(8906,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.EIS_BROWSER,headless:true});
 try{
  const errors=[],page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8906/');
  assert.equal(await page.locator('#time-scale').inputValue(),'log');await page.locator('#preset').selectOption('natural');await page.locator('#run').click();await page.getByText('Berechnung abgeschlossen.',{exact:false}).waitFor();
  const download=async(button,name)=>{const p=page.waitForEvent('download');await page.locator(button).click();const d=await p,file=path.join(out,name||d.suggestedFilename());await d.saveAs(file);return file;};
  const csvBefore=await fs.readFile(await download('#csv','log-data.csv'));
  for(const id of ['thermal','reservoirs','hardening','comparison','reference']){
   assert.equal(await page.locator('#'+id).evaluate(c=>c.height),720);
   await page.locator('[data-export-object]').selectOption(id);
   for(const type of ['png','svg']){await page.locator('[data-export-format]').selectOption(type);const file=await download('[data-export-save]',id+'.'+type);const bytes=await fs.readFile(file);assert.ok(bytes.length>1000);
    if(type==='svg'){const text=bytes.toString();for(const unit of ['Sekunden [s]','Minuten [min]','Stunden [h]'])assert.ok(text.includes(unit));assert.match(text,/height="720"/);assert.match(text,/t = 0 s separat/);assert.doesNotMatch(text,/<image|NaN|Infinity/);assert.ok(await page.evaluate(s=>!new DOMParser().parseFromString(s,'image/svg+xml').querySelector('parsererror'),text));}
   }
  }
  await page.locator('#first').click();await page.locator('[data-export-object]').selectOption('thermal');await page.locator('[data-export-format]').selectOption('svg');const start=await fs.readFile(await download('[data-export-save]','start.svg'),'utf8');assert.match(start,/t = 0 s separat/);
  await page.getByRole('button',{name:'Temperaturverlauf vergrößern',exact:true}).click();assert.equal(await page.locator('#large-canvas').evaluate(c=>c.height),720);assert.ok(await page.locator('#figure-dialog .timeline-dock').isVisible());await page.locator('#last').click();await page.locator('#close-dialog').click();
  await page.locator('#compare-axis').selectOption('relative');assert.equal(await page.locator('#comparison').evaluate(c=>c.height),560);await page.locator('#compare-axis').selectOption('absolute');assert.equal(await page.locator('#comparison').evaluate(c=>c.height),720);
  await page.locator('#time-scale').selectOption('linear');assert.equal(await page.locator('#thermal').evaluate(c=>c.height),560);assert.equal(await page.locator('#reference').evaluate(c=>c.height),560);
  const csvAfter=await fs.readFile(await download('#csv','linear-data.csv'));assert.ok(csvBefore.equals(csvAfter),'display scale must not modify numerical data');
  const project=await download('#json','project-linear.json');assert.equal(JSON.parse(await fs.readFile(project,'utf8')).view.timeScale,'linear');
  await page.locator('#time-scale').selectOption('log');await page.locator('#import').setInputFiles(project);await page.getByText('Vergleichsprozesse wiederhergestellt.',{exact:false}).waitFor();assert.equal(await page.locator('#time-scale').inputValue(),'linear');assert.equal(await page.locator('#thermal').evaluate(c=>c.height),560);
  await page.locator('#time-scale').selectOption('log');await page.locator('[data-export-object]').selectOption('thermal');await page.locator('[data-export-format]').selectOption('video');await page.locator('[data-video-duration] select').selectOption('5');
  const before=await page.locator('#time').inputValue(),video=await download('[data-export-save]','log-thermal.webm');await page.getByText('Video gespeichert.',{exact:true}).waitFor();assert.equal(await page.locator('#time').inputValue(),before);assert.ok((await fs.stat(video)).size>5000);
  const bytes=await fs.readFile(video),played=await page.evaluate(async b64=>{const v=document.createElement('video'),url=URL.createObjectURL(new Blob([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],{type:'video/webm'}));v.src=url;await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j;});const c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d');async function at(t){v.currentTime=t;await new Promise(r=>v.onseeked=r);ctx.drawImage(v,0,0);return c.toDataURL();}const a=await at(.1),b=await at(3);URL.revokeObjectURL(url);return {width:v.videoWidth,changes:a!==b};},bytes.toString('base64'));assert.equal(played.width,1280);assert.ok(played.changes);
  await page.locator('#thermal').screenshot({path:path.join(out,'thermal-desktop.png')});await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  for(const width of [390,768]){await page.setViewportSize({width,height:844});await page.locator('#thermal').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.timeline-dock').isVisible());await page.screenshot({path:path.join(out,'mobile-'+width+'.png'),fullPage:true});}
  assert.deepEqual(errors,[]);console.log('LOG_TIME_OK: five three-axis charts; true zero marker; PNG/SVG dimensions/XML; linear and relative fallback; unchanged CSV; project restore; enlarged view; independent video playback and mobile.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
