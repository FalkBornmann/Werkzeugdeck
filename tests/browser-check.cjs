const { chromium } = require(process.env.WERKZEUGDECK_PLAYWRIGHT);
const fs = require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa');
const server=require('node:http').createServer(async(req,res)=>{
 try{const f=path.join(root,new URL(req.url,'http://localhost').pathname==='/'?'index.html':new URL(req.url,'http://localhost').pathname);
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webm':'video/webm','.mp4':'video/mp4'})[path.extname(f)]||'application/octet-stream');
 res.end(await fs.readFile(f))}catch{res.writeHead(404);res.end()}
});
(async()=>{
 await fs.mkdir(out,{recursive:true});await new Promise(r=>server.listen(8896,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8896/');
 await page.waitForFunction(()=>document.querySelector('#plot svg'),{timeout:90000});
 await page.waitForFunction(()=>document.querySelector('#triangle svg path')&&document.querySelectorAll('#triangle svg path').length>30,{timeout:90000});
 await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 console.log('Ternary model, section and liquidus contours loaded');
 const before=await page.locator('#results article').first().innerText();
 await page.locator('#basis').selectOption('mass');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'),{timeout:60000});
 const after=await page.locator('#results article').first().innerText();
 assert.notEqual(before,after);
 await page.locator('#triangleMode').selectOption('isothermal');
 await page.locator('#chooseB').click();
 await page.locator('#endpointA input').nth(0).fill('0');
 await page.locator('#endpointA input').nth(1).fill('0');
 await page.locator('#endpointA input').nth(2).fill('100');
 await page.locator('#endpointB input').nth(0).fill('20');
 await page.locator('#endpointB input').nth(1).fill('20');
 await page.locator('#endpointB input').nth(2).fill('60');
 await page.locator('#applyCut').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'),{timeout:60000});
 assert.match(await page.locator('#cutDescription').innerText(),/20/);
 await page.locator('#add').click();assert.equal(await page.locator('#results article').count(),3);
 await page.locator('#positionNumber').fill('100');await page.locator('#positionNumber').press('Tab');
 assert.equal(await page.locator('#position').inputValue(),'100');
 console.log('Mass basis, free cut, third point and endpoint 100 passed');
 await page.locator('#special').selectOption('0');
 await page.locator('#useSpecial').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'),{timeout:60000});
 const exact=Number(await page.locator('#position').inputValue());
 await page.locator('#rightCompare').click();
 assert.ok(Number(await page.locator('#position').inputValue())>exact);
 await page.locator('#exactCompare').click();
 assert.ok(Math.abs(Number(await page.locator('#position').inputValue())-exact)<.001);
 await page.locator('#triangle').screenshot({path:path.join(out,'isothermal.png')});
 console.log('Eutectic target and nearby composition comparison passed');

 for(const key of ['bisn','cusn']){
 await page.locator('#system').selectOption(key);
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'),{timeout:60000});
 for(const value of ['0','100']){
 await page.locator('#positionNumber').fill(value);await page.locator('#positionNumber').press('Tab');
 assert.equal(await page.locator('#position').inputValue(),value);
 assert.match(await page.locator('#results article').first().innerText(),/100 %/);
 }
 console.log(key+' both pure endpoints passed');
 }
 await page.locator('#style').selectOption('liquid');
 await page.locator('#style').selectOption('fields');
 await page.locator('[data-export-object]').selectOption('plot');
 for(const type of ['svg','png']){
 await page.locator('[data-export-format]').selectOption(type);
 const download=page.waitForEvent('download');await page.locator('[data-export-save]').click();
 const file=await download;const destination=path.join(out,'section.'+type);await file.saveAs(destination);
 assert.ok((await fs.stat(destination)).size>1000);
 if(type==='svg'){const content=await fs.readFile(destination,'utf8');assert.ok(!content.includes('<image'))}
 }
 console.log('PNG and vector SVG downloads passed');
 await page.locator('[data-export-object]').selectOption('fractions');
 await page.locator('[data-export-format]').selectOption('video');
 await page.locator('[data-video-duration] select').selectOption('5');
 const originalTemperature=await page.locator('#temperature').inputValue();
 await page.locator('[data-export-save]').click();
 await page.locator('[data-export-cancel]').click();
 await page.waitForFunction(()=>document.querySelector('[data-export-message]').textContent.includes('abgebrochen'),{timeout:60000});
 assert.equal(await page.locator('#temperature').inputValue(),originalTemperature);
 const video=page.waitForEvent('download',{timeout:120000});
 await page.locator('[data-export-save]').click();
 const movie=await video;await movie.saveAs(path.join(out,movie.suggestedFilename()));
 assert.equal(await page.locator('#temperature').inputValue(),originalTemperature);
 assert.ok(await page.locator('#system').isEnabled());
 console.log('Local video export, cancellation and state restoration passed');
 await page.evaluate(()=>{
   window.atlasOriginalRecorder=window.MediaRecorder;
   window.atlasTracks=[];
   const capture=HTMLCanvasElement.prototype.captureStream;
   window.atlasCapture=capture;
   HTMLCanvasElement.prototype.captureStream=function(...args){const stream=capture.apply(this,args);window.atlasTracks.push(...stream.getTracks());return stream};
   window.MediaRecorder=class extends window.atlasOriginalRecorder {start(){throw Error('Test-Aufnahmefehler')}};
 });
 await page.locator('[data-export-save]').click();
 await page.waitForFunction(()=>document.querySelector('[data-export-message]').textContent.includes('Test-Aufnahmefehler'),{timeout:60000});
 assert.equal(await page.locator('#temperature').inputValue(),originalTemperature);
 assert.ok(await page.evaluate(()=>window.atlasTracks.every(track=>track.readyState==='ended')));
 await page.evaluate(()=>{window.MediaRecorder=window.atlasOriginalRecorder;HTMLCanvasElement.prototype.captureStream=window.atlasCapture});
 const videoPage=await browser.newPage();
 await videoPage.goto('http://127.0.0.1:8896/qa/'+movie.suggestedFilename());
 await videoPage.waitForFunction(()=>document.querySelector('video')?.readyState>=2,{timeout:30000});
 assert.ok(await videoPage.locator('video').evaluate(video=>video.videoWidth>0));
 await videoPage.close();
 await page.evaluate(()=>{window.MediaRecorder=undefined});
 await page.locator('[data-export-object]').selectOption('cool');
 const unsupported=page.locator('[data-export-format] option[value="video"]');
 assert.ok(await unsupported.evaluate(option=>option.disabled));
 await page.evaluate(()=>{window.MediaRecorder=window.atlasOriginalRecorder});
 console.log('Video error cleanup, playback and unsupported-browser fallback passed');


 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal mobile overflow');
 for(const selector of ['#plot','#cool','#fractions']){
 await page.locator(selector).scrollIntoViewIfNeeded();
 const box=await page.locator('#dock').boundingBox();assert.ok(box.y+box.height<=845);
 }
 await page.locator('#system').selectOption('salt');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('ORNL'));
 await page.locator('#basis').selectOption('mole');
 await page.locator('#basis').selectOption('mass');
 await page.screenshot({path:path.join(out,'salt-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('Mobile, synchronized dock and salt conversion passed');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});

