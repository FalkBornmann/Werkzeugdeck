const {chromium}=require(process.env.WERKZEUGDECK_PLAYWRIGHT);
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../../Archiv/Aluminium-Pruefung');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}
 });await new Promise(resolve=>server.listen(8893,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.EIS_BROWSER,headless:true});
 try{
  const errors=[];const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8893/');
  await page.locator('#run').click();await page.getByText('Berechnung abgeschlossen.',{exact:false}).waitFor();
  assert.equal(errors.length,0,errors.join('\n'));assert.ok(await page.locator('.timeline-dock').isVisible());
  await page.locator('#first').click();assert.match(await page.locator('#time-output').textContent(),/0.0 s/);
  await page.locator('#time').focus();await page.keyboard.press('ArrowRight');assert.notEqual(await page.locator('#time').inputValue(),'0');
  await page.locator('#last').click();await page.locator('#remember').click();assert.ok(await page.locator('#comparisons table').isVisible());
  await page.locator('#probe-x').fill('100');await page.locator('#probe-x').dispatchEvent('input');await page.locator('#field-view').selectOption('index');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await page.locator('#field').screenshot({path:path.join(out,'field.png')});
  for(const id of ['thermal','reservoirs','hardening','comparison','field','profile','micro','reference']){
   await page.locator('[data-export-object]').selectOption(id);
   for(const format of ['png','svg']){
    await page.locator('[data-export-format]').selectOption(format);const promise=page.waitForEvent('download');await page.locator('[data-export-save]').click();const d=await promise;const dest=path.join(out,d.suggestedFilename());await d.saveAs(dest);
    const content=await fs.readFile(dest);assert.ok(content.length>200);
    if(format==='svg'){const t=content.toString();assert.ok(!t.includes('<image'));assert.ok(t.includes('<text'));const valid=await page.evaluate(t=>!new DOMParser().parseFromString(t,'image/svg+xml').querySelector('parsererror'),t);assert.ok(valid);}
   }
  }
  console.log('Desktop: eight PNG/SVG exports and XML, timeline, probes, comparison passed');
  await page.locator('[data-export-object]').selectOption('micro');await page.locator('[data-export-format]').selectOption('video');await page.locator('[data-video-duration] select').selectOption('5');
  const before=await page.locator('#time').inputValue(),videoPromise=page.waitForEvent('download');await page.locator('[data-export-save]').click();assert.ok(await page.locator('#run').isDisabled());const video=await videoPromise;const videoPath=path.join(out,video.suggestedFilename());await video.saveAs(videoPath);await page.getByText('Video gespeichert.',{exact:true}).waitFor();assert.equal(await page.locator('#time').inputValue(),before);
  const data=await fs.readFile(videoPath);assert.ok(data.length>5000);assert.match(video.suggestedFilename(),/\.(webm|mp4)$/);
  const playback=await page.evaluate(async b64=>{
   const data=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),v=document.createElement('video');v.src=URL.createObjectURL(new Blob([data],{type:'video/webm'}));await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j;});
   const c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d');
   async function sample(t){v.currentTime=t;await new Promise(r=>v.onseeked=r);ctx.drawImage(v,0,0);return c.toDataURL();}
   const a=await sample(.1),b=await sample(3);URL.revokeObjectURL(v.src);return {width:v.videoWidth,height:v.videoHeight,different:a!==b};
  },data.toString('base64'));assert.equal(playback.width,1280);assert.ok(playback.different);
  await page.locator('[data-export-save]').click();await page.locator('[data-export-cancel]').click();await page.getByText('Videoexport abgebrochen.',{exact:true}).waitFor();assert.equal(await page.locator('#time').inputValue(),before);assert.ok(await page.locator('#run').isEnabled());
  const cleanup=await page.evaluate(async()=>{
   const old=HTMLCanvasElement.prototype.captureStream,Original=globalThis.MediaRecorder,tracks=[];
   HTMLCanvasElement.prototype.captureStream=function(...args){const s=old.apply(this,args);tracks.push(...s.getTracks());return s;};
   class FailRecorder{constructor(){throw Error('Absichtlicher Testfehler');}static isTypeSupported(t){return Original.isTypeSupported(t);}}
   globalThis.MediaRecorder=FailRecorder;
   let restored=false;
   try{await WDExports.recordVideo({title:'Test',caption:()=>'',frame:()=>document.querySelector('#micro')},5,new AbortController().signal,()=>{});}catch(e){restored=e.message.includes('Testfehler');}
   globalThis.MediaRecorder=Original;HTMLCanvasElement.prototype.captureStream=old;return {restored,stopped:tracks.every(t=>t.readyState==='ended'),count:tracks.length};
  });assert.ok(cleanup.restored&&cleanup.stopped&&cleanup.count>0);
  await page.locator('#micro').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Ausscheidungen · schematische Vergrößerung vergrößern',exact:true}).click();assert.ok(await page.locator('#figure-dialog .timeline-dock').isVisible());await page.locator('#first').click();await page.locator('#close-dialog').click();
  await page.locator('#size').fill('50');assert.equal(await page.locator('.timeline-dock').isVisible(),false);assert.equal(await page.locator('#csv').isDisabled(),true);
  await page.locator('#size').fill('0');await page.locator('#run').click();assert.match(await page.locator('#status').textContent(),/Abmessungen/);
  await page.locator('#size').fill('40');await page.locator('#shape').selectOption('rod');await page.locator('#preset').selectOption('natural');await page.locator('#run').click();await page.getByText('Berechnung abgeschlossen.',{exact:false}).waitFor();
  console.log('Video: download, independent playback, changing frames, cancellation, restoration and error track cleanup passed');
  const unsupported=await browser.newPage();await unsupported.addInitScript(()=>{globalThis.MediaRecorder=undefined;});await unsupported.goto('http://127.0.0.1:8893/');assert.match(await unsupported.locator('[data-export-format]').textContent(),/Browser nicht unterstützt/);await unsupported.close();
  for(const viewport of [{width:390,height:844},{width:768,height:1024}]){
   await page.setViewportSize(viewport);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#micro').scrollIntoViewIfNeeded();const dock=await page.locator('.timeline-dock').boundingBox();assert.ok(dock.y>=0&&dock.y+dock.height<=viewport.height+1);
   await page.locator('#time').fill('1');await page.locator('#time').dispatchEvent('input');assert.match(await page.locator('#readout').textContent(),/Zellmitte/);
   await page.screenshot({path:path.join(out,'mobile-'+viewport.width+'.png'),fullPage:true});
  }
  console.log('Mobile/tablet, radial geometry, natural aging, invalidation and browser fallback passed');assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify({passed:true,playback,cleanup,exports:16,viewports:[1440,390,768]},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

