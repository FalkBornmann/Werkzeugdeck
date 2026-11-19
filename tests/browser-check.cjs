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
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message)});
 await page.goto('http://127.0.0.1:8896/');
 await page.waitForFunction(()=>document.querySelector('#plot svg'),null,{timeout:90000}).catch(async e=>{console.error('STATUS:',await page.locator('#status').innerText());throw e});
 await page.waitForFunction(()=>document.querySelectorAll('#triangle [data-isotherm]').length>4&&document.querySelectorAll('#phase3D [data-surface-face]').length>10,null,{timeout:90000});
 await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});

 assert.equal(await page.locator('#triangle [data-axis]').count(),3);
 const endpointValues=await page.locator('#endpointA input').evaluateAll(nodes=>nodes.map(n=>n.value));
 const triangleBox=await page.locator('#triangle svg').boundingBox();
 await page.mouse.click(triangleBox.x+triangleBox.width*.6,triangleBox.y+triangleBox.height*.5);
 assert.deepEqual(await page.locator('#endpointA input').evaluateAll(nodes=>nodes.map(n=>n.value)),endpointValues);
 await page.locator('#dockPoint').selectOption('s1');
 assert.equal(await page.locator('#active').inputValue(),'s1');
 assert.match(await page.locator('#fractions').innerText(),/S₁/);
 assert.ok(await page.locator('#positionNumber').isDisabled());
 await page.locator('#dockPoint').selectOption('s2');
 assert.match(await page.locator('#microstructure').innerText(),/S₂/);
 await page.locator('#active').selectOption('x0');
 await page.locator('#plot').scrollIntoViewIfNeeded();
 const posBefore=Number(await page.locator('#positionNumber').inputValue());
 const handle=await page.locator('#plot [data-point="0"]').first().boundingBox();
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+35,handle.y+handle.height/2,{steps:5});await page.mouse.up();
 assert.ok(Number(await page.locator('#positionNumber').inputValue())>posBefore);
 const posDragged=await page.locator('#positionNumber').inputValue(),plotBox=await page.locator('#plot svg').boundingBox();
 await page.mouse.click(plotBox.x+plotBox.width*.8,plotBox.y+plotBox.height*.7);
 assert.equal(await page.locator('#positionNumber').inputValue(),posDragged);
 await page.locator('#triangle').scrollIntoViewIfNeeded();
 const endpointBox=await page.locator('#triangle [data-endpoint="S₁"]').boundingBox();
 const oldA=await page.locator('#endpointA input').evaluateAll(nodes=>nodes.map(n=>n.value));
 await page.mouse.move(endpointBox.x+endpointBox.width/2,endpointBox.y+endpointBox.height/2);await page.mouse.down();await page.mouse.move(endpointBox.x+endpointBox.width/2+20,endpointBox.y+endpointBox.height/2+20,{steps:5});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'));
 assert.notDeepEqual(await page.locator('#endpointA input').evaluateAll(nodes=>nodes.map(n=>n.value)),oldA);

 assert.equal(await page.locator('#dockPoint').inputValue(),'x0');
 await page.locator('[data-visible-point="s1"]').check();
 assert.ok((await page.locator('#cool').innerText()).includes('S₁'));
 await page.locator('[data-visible-point="s1"]').uncheck();
 assert.equal(await page.locator('#fractions svg').textContent().then(text=>(text.match(/\d+(?:,\d+)? %/g)||[]).length),0);
 await page.locator('#phase3D').scrollIntoViewIfNeeded();
 await page.locator('#phase3D').press('ArrowRight');
 await page.locator('#phase3D').screenshot({path:path.join(out,'phase-space.png')});
 await page.locator('[data-export-object]').selectOption('phase3D');
 await page.locator('[data-export-format]').selectOption('svg');
 let spaceDownload=page.waitForEvent('download');await page.locator('[data-export-save]').click();await (await spaceDownload).saveAs(path.join(out,'phase-space.svg'));
 await page.locator('#favorite').click();
 await page.locator('#favoritesOnly').check();
 assert.equal(await page.locator('#system option').count(),1);
 await page.locator('#favoritesOnly').uncheck();
 console.log('Ternary model, three axes, endpoint comparisons, fixed triangle clicks, 3D export and favorites passed');
 const before=await page.locator('#results article').first().innerText();
 await page.locator('#basis').selectOption('mass');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'),{timeout:60000});
 const after=await page.locator('#results article').first().innerText();
 assert.notEqual(before,after);
 await page.locator('#triangleMode').selectOption('isothermal');

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

 await page.locator('[data-visible-point="s1"]').uncheck();
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

 assert.equal(await page.locator('[data-export-format] option[value="video"]').count(),0);
 assert.equal(await page.locator('#play').count(),0);
 for(const id of ['triangle','cool','fractions','microstructure']){
   if(id==='triangle')continue; // binary systems hide the triangle; the ternary export is checked separately below
   await page.locator('[data-export-object]').selectOption(id);
   for(const type of ['svg','png']){
     await page.locator('[data-export-format]').selectOption(type);
     const download=page.waitForEvent('download');await page.locator('[data-export-save]').click();
     const file=await download,destination=path.join(out,id+'.'+type);await file.saveAs(destination);
     assert.ok((await fs.stat(destination)).size>1000);
     if(type==='svg')assert.ok(!(await fs.readFile(destination,'utf8')).includes('<image'));
   }
 }
 await page.locator('#system').selectOption('bisn');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'));
 await page.locator('#positionNumber').fill('50');await page.locator('#positionNumber').press('Tab');
 await page.locator('#temperatureNumber').fill('100');await page.locator('#temperatureNumber').press('Tab');
 assert.match(await page.locator('#microstructure').innerText(),/Lamellares|eutektisches/);
 assert.match(await page.locator('#fractionReadout').innerText(),/100 °C/);
 const total=await page.locator('#fractionReadout tbody td:last-child').allTextContents();
 assert.ok(Math.abs(total.reduce((sum,s)=>sum+parseFloat(s.replace(',','.')),0)-100)<.05);
 await page.locator('#fractions').scrollIntoViewIfNeeded();
 const box=await page.locator('#fractions svg').boundingBox();
 await page.mouse.click(box.x+box.width*.2,box.y+box.height*.45);
 assert.notEqual(await page.locator('#temperatureNumber').inputValue(),'100');
 await page.locator('#fractionMode').selectOption('stacked');
 assert.ok(await page.locator('#fractions [data-phase-curve]').first().getAttribute('fill')!=='none');
 await page.locator('#morphology').selectOption('shells');
 await page.locator('#temperatureNumber').fill('400');await page.locator('#temperatureNumber').press('Tab');
 assert.match(await page.locator('#microstructure').innerText(),/Einphasige Schmelze/);
 await page.locator('#microstructure').screenshot({path:path.join(out,'all-liquid.png')});
 await page.locator('#temperatureNumber').fill('100');await page.locator('#temperatureNumber').press('Tab');
 await page.locator('#morphology').selectOption('auto');
 await page.locator('#microstructure').screenshot({path:path.join(out,'microstructure.png')});
 await page.locator('#plot').screenshot({path:path.join(out,'smooth-section.png')});
 await page.locator('#fractions').screenshot({path:path.join(out,'phase-fractions.png')});
 assert.ok(await page.locator('#plot [data-phase-field]').first().getAttribute('d').then(d=>d.includes('C')));
 assert.ok(!/\b(AG|CU|SN|BI)\b/.test(await page.locator('body').innerText()));
 console.log('Phase fractions, temperature cursor, schematic microstructures and five diagram exports passed');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal mobile overflow');
 for(const selector of ['#plot','#cool','#fractions','#microstructure']){
 await page.locator(selector).scrollIntoViewIfNeeded();
 const box=await page.locator('#dock').boundingBox();assert.ok(box.y+box.height<=845);
 }
 await page.locator('#system').selectOption('salt');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('ORNL'));
 await page.locator('#basis').selectOption('mole');
 await page.locator('#basis').selectOption('mass');
 await page.screenshot({path:path.join(out,'salt-mobile.png'),fullPage:true});

 await page.locator('#supportPoints').check();
 await page.locator('#system').selectOption('sac');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'));
 await page.locator('#triangleMode').selectOption('projection');
 await page.waitForFunction(()=>document.querySelectorAll('#triangle [data-isotherm]').length>4,null,{timeout:90000});
 await page.locator('#supportPoints').uncheck();
 await page.locator('#basis').selectOption('mole');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'));
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#triangle').screenshot({path:path.join(out,'smooth-isotherms.png')});
 await page.locator('[data-export-object]').selectOption('triangle');
 await page.locator('[data-export-format]').selectOption('svg');
 const ternaryExport=page.waitForEvent('download');await page.locator('[data-export-save]').click();
 const ternaryFile=await ternaryExport;await ternaryFile.saveAs(path.join(out,'triangle.svg'));
 assert.ok(!/\b(AG|CU|SN|BI)\b/.test(await fs.readFile(path.join(out,'triangle.svg'),'utf8')));
 assert.deepEqual(errors,[]);

 await page.locator('#temperatureWindow').selectOption('all');
 const userA=['1.61663','96.09284','2.29053'],userB=['96.32585','.95486','2.71929'];
 for(let i=0;i<3;i++){await page.locator('#endpointA input').nth(i).fill(userA[i]);await page.locator('#endpointB input').nth(i).fill(userB[i])}
 await page.locator('#applyCut').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'));
 await page.locator('#positionNumber').fill('50');await page.locator('#positionNumber').press('Tab');
 await page.locator('#temperatureNumber').fill('1030');await page.locator('#temperatureNumber').press('Tab');
 const chartText=await page.locator('#fractions').innerText();assert.ok(!/L \(Ag\)|L \(Cu\)/.test(chartText));
 await page.locator('#plot').screenshot({path:path.join(out,'corrected-user-section.png')});
 await page.locator('#fractionSection').screenshot({path:path.join(out,'corrected-user-fractions.png')});
 await page.locator('#triangle').screenshot({path:path.join(out,'corrected-user-triangle.png')});
 await page.locator('#phase3D').screenshot({path:path.join(out,'phase-space-fitted.png')});
 await page.locator('#systemSearch').fill('Bismut Blei');
 await page.waitForFunction(()=>document.querySelector('#system').value==='pbsnbi'&&document.querySelector('#status').textContent.includes('abgeschlossen'),null,{timeout:90000});
 assert.equal(await page.locator('#system option').count(),1);
 await page.locator('#systemSearch').fill('');
 await page.locator('#special').selectOption('0');await page.locator('#useSpecial').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('abgeschlossen'));
 await page.locator('#temperatureNumber').fill('110');await page.locator('#temperatureNumber').press('Tab');
 assert.ok(!(await page.locator('#fractions').innerText()).includes('L ('));
 await page.locator('#triangle').screenshot({path:path.join(out,'bipbsn-triangle.png')});
 console.log('Mobile, dock, salt conversion, searchable library and simpler ternary model passed');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
