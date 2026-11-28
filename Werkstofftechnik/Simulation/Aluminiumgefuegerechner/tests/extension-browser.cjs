const {chromium}=require(process.env.WERKZEUGDECK_PLAYWRIGHT);
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../../Archiv/Aluminium-Erweiterung');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,file=path.join(root,pathname==='/'?'index.html':pathname);
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}
 });await new Promise(resolve=>server.listen(8903,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.EIS_BROWSER,headless:true});
 try{
  const errors=[],page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8903/');
  const calculate=async()=>{await page.locator('#run').click();await page.getByText('Berechnung abgeschlossen.',{exact:false}).waitFor();};
  const download=async(button,name)=>{const promise=page.waitForEvent('download');await page.locator(button).click();const d=await promise;const destination=path.join(out,name||d.suggestedFilename());await d.saveAs(destination);return destination;};
  await calculate();await page.locator('#comparison-name').fill('Wasser · 8 h');await page.locator('#remember').click();
  await page.locator('#preset').selectOption('overaged');assert.ok(await page.locator('#comparisons table').isVisible());await calculate();await page.locator('#comparison-name').fill('Lang · 48 h');await page.locator('#remember').click();
  assert.equal(await page.locator('#comparisons table tr').count(),3);assert.match(await page.locator('[data-value="0"]').textContent(),/beendet/);
  await page.locator('#compare-axis').selectOption('relative');assert.doesNotMatch(await page.locator('[data-value="0"]').textContent(),/beendet/);
  await page.locator('#compare-location').selectOption('probe');await page.locator('#compare-metric').selectOption('fine');await page.locator('#profile-metric').selectOption('fine');
  const fieldBox=await page.locator('#field').boundingBox();await page.locator('#field').click({position:{x:fieldBox.width*.55,y:fieldBox.height*.6}});
  const beforeKey=await page.locator('#readout').textContent();await page.locator('#field').press('ArrowRight');assert.notEqual(await page.locator('#readout').textContent(),beforeKey);
  const profileBox=await page.locator('#profile').boundingBox();await page.locator('#profile').click({position:{x:profileBox.width*.7,y:profileBox.height*.4}});assert.ok(Number(await page.locator('#probe-x').inputValue())>50);
  await page.getByRole('button',{name:'Ortsprofil auf der Schnittlinie vergrößern',exact:true}).click();assert.ok(await page.locator('#figure-dialog .timeline-dock').isVisible());
  const beforeDialog=await page.locator('#readout').textContent();await page.locator('#large-canvas').press('ArrowLeft');assert.notEqual(await page.locator('#readout').textContent(),beforeDialog);await page.locator('#close-dialog').click();
  await page.locator('#first').click();await page.locator('#play').click();await page.waitForTimeout(180);await page.locator('#play').click();assert.ok(Number(await page.locator('#time').inputValue())>0);await page.locator('#last').click();
  const projectFile=await download('#json','vergleich-projekt.json'),projectData=JSON.parse(await fs.readFile(projectFile,'utf8'));
  assert.equal(projectData.schema,2);assert.equal(projectData.comparisons.length,2);assert.equal(projectData.result,undefined);assert.equal(projectData.comparisons[1].parameters.stages.at(-2).duration,48*3600);
  const csv=await download('#compare-csv','vergleich.csv'),csvText=await fs.readFile(csv,'utf8');assert.match(csvText,/Lang · 48 h/);assert.match(csvText,/progress_percent/);
  await page.locator('#clear-comparisons').click();assert.equal(await page.locator('#comparisons table').count(),0);
  await page.locator('#import').setInputFiles(projectFile);await page.getByText('Vergleichsprozesse wiederhergestellt.',{exact:false}).waitFor();assert.equal(await page.locator('#comparisons table tr').count(),3);assert.equal(await page.locator('#compare-metric').inputValue(),'fine');
  await page.getByRole('button',{name:'Wasser · 8 h als aktuellen Prozess anzeigen',exact:true}).click();assert.match(await page.locator('#status').textContent(),/Wasser · 8 h/);assert.equal(await page.locator('#preset').inputValue(),'custom');
  for(const name of ['Zusatz 3','Zusatz 4']){await page.locator('#comparison-name').fill(name);await page.locator('#remember').click();}assert.equal(await page.locator('#comparisons table tr').count(),5);assert.ok(await page.locator('#remember').isDisabled());
  for(const name of ['Zusatz 3','Zusatz 4'])await page.getByRole('button',{name:name+' entfernen',exact:true}).click();assert.equal(await page.locator('#comparisons table tr').count(),3);
  await page.locator('#field-view').selectOption('index');await page.locator('[data-export-object]').selectOption('field');await page.locator('[data-export-format]').selectOption('svg');
  const fieldFile=await download('[data-export-save]','field-index.svg');assert.match(await fs.readFile(fieldFile,'utf8'),/Aushärtungsindex im Querschnitt/);
  for(const id of ['comparison','profile']){
   await page.locator('[data-export-object]').selectOption(id);
   for(const type of ['png','svg']){
    await page.locator('[data-export-format]').selectOption(type);const file=await download('[data-export-save]',id+'.'+type),data=await fs.readFile(file);assert.ok(data.length>300);
    if(type==='svg'){assert.doesNotMatch(data.toString(),/<image|NaN/);assert.match(data.toString(),/Zellmitten|Prozessfortschritt/);}
   }
  }
  await page.locator('#profile').screenshot({path:path.join(out,'profile.png')});await page.locator('#comparison').screenshot({path:path.join(out,'comparison.png')});await page.locator('#field').screenshot({path:path.join(out,'field.png')});
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await page.locator('[data-export-object]').selectOption('comparison');await page.locator('[data-export-format]').selectOption('video');await page.locator('[data-video-duration] select').selectOption('5');
  const beforeVideo=await page.locator('#time').inputValue(),movie=await download('[data-export-save]','comparison.webm');await page.getByText('Video gespeichert.',{exact:true}).waitFor();assert.ok((await fs.stat(movie)).size>5000);assert.equal(await page.locator('#time').inputValue(),beforeVideo);
  await page.locator('[data-export-save]').click();await page.locator('[data-export-cancel]').click();await page.getByText('Videoexport abgebrochen.',{exact:true}).waitFor();assert.equal(await page.locator('#time').inputValue(),beforeVideo);
  const relativeSVG=await fs.readFile(path.join(out,'comparison.svg'),'utf8');assert.match(relativeSVG,/Wasser · 8 h/);assert.match(relativeSVG,/Lang · 48 h/);assert.match(relativeSVG,/Prozessfortschritt/);
  await page.locator('#size').fill('50');assert.equal(await page.locator('#comparisons table tr').count(),3);await page.locator('[data-export-format]').selectOption('png');assert.ok(await page.locator('[data-export-save]').isEnabled());assert.equal(await page.locator('.timeline-dock').isVisible(),false);
  await page.getByRole('button',{name:'Lang · 48 h entfernen',exact:true}).click();assert.equal(await page.locator('#comparisons table tr').count(),2);
  // Invalid imported comparison must not replace the saved valid run.
  await page.locator('#import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...projectData,comparisons:[{name:'Bad',parameters:{...projectData.parameters,size:0}}]}))});
  await page.getByText('Projekt nicht geladen:',{exact:false}).waitFor();assert.equal(await page.locator('#comparisons table tr').count(),2);
  for(const width of [390,768]){
   await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile-'+width+'.png'),fullPage:true});
  }
  const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});touch.on('pageerror',e=>errors.push(e.message));await touch.goto('http://127.0.0.1:8903/');await touch.locator('#run').click();await touch.getByText('Berechnung abgeschlossen.',{exact:false}).waitFor();
  await touch.locator('#field').scrollIntoViewIfNeeded();const box=await touch.locator('#field').boundingBox();await touch.touchscreen.tap(box.x+box.width*.55,box.y+box.height*.55);assert.ok(Number(await touch.locator('#probe-x').inputValue())>0);
  await touch.locator('#profile').scrollIntoViewIfNeeded();assert.ok(await touch.locator('.timeline-dock').isVisible());await touch.screenshot({path:path.join(out,'touch.png'),fullPage:true});await touch.close();
  assert.deepEqual(errors,[]);console.log('Extension passed: full unequal-duration histories; relative/absolute time; cell picking/keyboard/touch/dialog; project v2 restore/invalid input; profile/comparison PNG/SVG and video/cancel; mobile layout.');
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify({passed:true,storedRuns:2,exports:['profile PNG/SVG','comparison PNG/SVG/video'],viewports:[1440,390,768],projectRoundtrip:true},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
