/* Integration check for subject theory, compact exports and real video files. */
const {chromium}=require(process.env.WERKZEUGDECK_PLAYWRIGHT || 'playwright');
const {createServer}=require('node:http');
const fs=require('node:fs/promises'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const out=path.join(root,'Archiv','UI-Video-Pruefung'); await fs.mkdir(out,{recursive:true});
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost'); const file=path.join(root,'dist',url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname);
    try{res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(8899,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.EIS_BROWSER?{executablePath:process.env.EIS_BROWSER}:{})});
    const context=await browser.newContext({acceptDownloads:true,viewport:{width:1365,height:1000}});
    const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const domain of ['elektrochemie','stofftransport','beschichtungen','werkstofftechnik']){
      await page.goto(`http://127.0.0.1:8899/bereiche/${domain}/`);
      await page.getByRole('link',{name:'Theorie erkunden →'}).click();
      assert.ok(page.url().endsWith(`/bereiche/${domain}/theorie/`));
      assert.equal(await page.locator('.theory-chapter[id]').count(),5);
      assert.ok(await page.locator('.theory-toc a').count()>=5);
      await page.getByText('Vertiefung · Modell und Rechenweg',{exact:true}).first().click();
      assert.equal(await page.locator('.theory-chapter details').first().getAttribute('open'),'');
      assert.ok((await page.locator('.equation').first().textContent()).length>20);
      if(domain==='elektrochemie')await page.screenshot({path:path.join(out,'theorie-desktop.png')});
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.setViewportSize({width:1365,height:1000});
    }
    for(const [id,defaultItem,count]of [['eis-fitting','uebersicht',4],['potentialkurven','diagramm',1],['keks-und-tee','scene',3],['winand-diagramm','diagram',4],['gefuegerechner','temperature',7]]){
      await page.goto(`http://127.0.0.1:8899/tools/${id}/`);
      await page.waitForSelector('[data-export-object]',{state:'attached'});
      assert.equal(await page.locator('[data-export-object]').inputValue(),defaultItem);
      assert.equal(await page.locator('[data-export-object] option').count(),count);
      assert.equal(await page.locator('[data-export-format]').inputValue(),'png');
      assert.equal(await page.locator('.tool-context .wd-icon').count(),1);
      const theoryLink=await page.locator('.tool-context a').last().getAttribute('href');assert.ok(theoryLink.endsWith('/theorie/'));
    }
    for(const id of process.env.SKIP_VIDEO ? [] : ['keks-und-tee','winand-diagramm','gefuegerechner']){
      await page.goto(`http://127.0.0.1:8899/tools/${id}/`);
      if(id==='winand-diagramm'){await page.locator('#mode').selectOption('process');await page.locator('#processMode').selectOption('time');}
      if(id==='gefuegerechner')await page.locator('#run').click();
      await page.waitForFunction(()=>document.body.classList.contains('has-timeline-dock'),{},{timeout:120000});
      await page.locator('#timeline').press('Home');await page.locator('#timeline').press('ArrowRight');
      const before=await page.locator('#timeline').inputValue();
      await page.locator('[data-export-format]').selectOption('video');
      await page.locator('[data-video-duration] select').selectOption('5');
      const downloading=page.waitForEvent('download',{timeout:90000});
      await page.locator('[data-export-save]').click();
      await page.locator('[data-export-cancel]').waitFor({state:'visible'});
      assert.equal(await page.locator('#timeline').isDisabled(),true);
      const item=await downloading; const name=item.suggestedFilename();assert.match(name,/\.(webm|mp4)$/);
      const dest=path.join(out,name);await item.saveAs(dest);
      await page.locator('[data-export-cancel]').waitFor({state:'hidden'});
      assert.equal(await page.locator('#timeline').inputValue(),before);
      assert.equal(await page.locator('#timeline').isDisabled(),false);
      const data=await fs.readFile(dest);assert.ok(data.length>1000);
      const mime=name.endsWith('.mp4')?'video/mp4':'video/webm';
      const decoded=await page.evaluate(async({base64,mime})=>{
        const binary=atob(base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
        const url=URL.createObjectURL(new Blob([bytes],{type:mime}));const video=document.createElement('video');video.muted=true;
        try{
          await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(new Error('Video cannot be decoded'));video.src=url;});
          const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');
          ctx.drawImage(video,0,0,320,180);const first=canvas.toDataURL();await video.play();await new Promise(r=>setTimeout(r,1200));video.pause();ctx.drawImage(video,0,0,320,180);
          return {width:video.videoWidth,height:video.videoHeight,changed:first!==canvas.toDataURL(),time:video.currentTime};
        }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
      },{base64:data.toString('base64'),mime});
      assert.equal(decoded.width,1280);assert.equal(decoded.height,720);assert.ok(decoded.changed&&decoded.time>0,'video must show changing simulation frames');
      await page.locator('[data-export-save]').click();
      await page.locator('[data-export-cancel]').click();
      await page.getByText('Videoexport abgebrochen.',{exact:true}).waitFor();
      assert.equal(await page.locator('#timeline').inputValue(),before);
      assert.equal(await page.locator('#timeline').isDisabled(),false);
      await page.setViewportSize({width:390,height:844});
      await page.locator('[data-export-format]').selectOption('png');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.locator('[data-export-object]').focus();
      await page.screenshot({path:path.join(out,`${id}-mobil.png`)});
      await page.setViewportSize({width:1365,height:1000});
      console.log(`${id}: playable changing video, cancellation, state restoration, mobile export menu passed`);
    }
    const unsupported=await browser.newPage();await unsupported.addInitScript(()=>{Object.defineProperty(window,'MediaRecorder',{value:undefined,configurable:true});});
    await unsupported.goto('http://127.0.0.1:8899/tools/keks-und-tee/');
    await unsupported.locator('[data-export-format]').waitFor({state:'attached'});
    assert.equal(await unsupported.locator('[data-export-format] option[value=video]').evaluate(option=>option.disabled),true);
    await unsupported.close();
    assert.deepEqual(errors,[]);console.log(process.env.SKIP_VIDEO ? 'Theory routes, five export menus and unsupported-browser fallback passed.' : 'All theory routes, five export menus, three video files and unsupported-browser fallback passed.');
  }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
