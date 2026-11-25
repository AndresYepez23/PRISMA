const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../dist');
const mime=file=>({'html':'text/html','js':'text/javascript','css':'text/css','svg':'image/svg+xml','json':'application/json'})[file.split('.').pop()]||'application/octet-stream';
const fileFor=pathname=>path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
const server=http.createServer((req,res)=>{const file=fileFor(new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime(file));res.end(fs.readFileSync(file));});
const sdk=`export async function createWorker(language,oem,{logger,errorHandler}){
 globalThis.__ocrStarts=(globalThis.__ocrStarts||0)+1;
 const worker={recognize:async file=>{globalThis.__ocrInput=file.name;logger({status:'recognizing text',progress:.7});return {data:{text:'PRISMA 42',confidence:99}};},terminate:async()=>{globalThis.__ocrTerminated=(globalThis.__ocrTerminated||0)+1;}};
 if(globalThis.__ocrStarts===1){errorHandler('private model failure detail');return worker;}
 logger({status:'loading language traineddata',progress:.4});return new Promise(resolve=>{globalThis.__releaseOcr=()=>resolve(worker);});
}`;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.PRISMA_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [language,route] of [['es','/herramientas/imagen-a-texto/'],['en','/en/tools/convert-image-to-text-with-ocr/']]){
   const context=await browser.newContext({viewport:{width:language==='es'?360:1280,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/'))return route.continue();if(url==='https://esm.sh/tesseract.js@5.1.1')return route.fulfill({contentType:'text/javascript',body:sdk});return route.abort();});
   await page.goto(origin+route);await page.locator('[data-ready=true]').waitFor({state:'attached'});
   const png=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=100;canvas.height=60;canvas.getContext('2d').fillRect(0,0,100,60);return [...new Uint8Array(await(await new Promise(r=>canvas.toBlob(r,'image/png'))).arrayBuffer())];});
   await page.locator('[name=file]').setInputFiles({name:'private-image.png',mimeType:'image/png',buffer:Buffer.from(png)});
   await page.locator('button[type=submit]').click();await page.locator('[data-retry=true]').waitFor({state:'visible'});
   assert.match(await page.locator('.seo-inline-status').textContent(),language==='en'?/try again/i:/reintenta/i);
   assert.equal(await page.locator('[name=file]').evaluate(input=>input.files[0].name),'private-image.png');
   await page.locator('[data-retry=true]').click();await page.waitForFunction(()=>typeof window.__releaseOcr==='function');
   assert.match(await page.locator('.seo-inline-status').textContent(),language==='en'?/Loading language data… 40%/:/Cargando los datos de idioma… 40%/);
   assert.equal(await page.locator('.seo-inline-meter').evaluate(node=>node.value),.4);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(process.env.PRISMA_FEEDBACK_SCREENSHOTS)await page.locator('.seo-inline-tool').screenshot({path:'/tmp/prisma-feedback-'+language+'.png'});
   await page.evaluate(()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
   assert.equal(await page.evaluate(()=>window.__ocrStarts),2,'Duplicate submit started a second OCR');
   await page.evaluate(()=>window.__releaseOcr());await page.locator('.seo-inline-result:not([hidden])').waitFor();
   assert.equal(await page.locator('.seo-inline-result').textContent(),'PRISMA 42');assert.equal(await page.evaluate(()=>window.__ocrTerminated),2);
   const url=await page.locator('.seo-inline-download').getAttribute('href');await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
   assert.equal(await page.evaluate(async url=>(await fetch(url)).ok,url),true,'BFCache invalidated the download');
   await page.locator('button[type=submit]').click();await page.waitForFunction(()=>window.__ocrStarts===3);
   await page.locator('[name=file]').setInputFiles({name:'changed.png',mimeType:'image/png',buffer:Buffer.from(png)});
   await page.evaluate(()=>window.__releaseOcr());await page.waitForFunction(()=>!document.querySelector('form').hasAttribute('aria-busy'));
   assert.equal(await page.locator('.seo-inline-result').isVisible(),false);assert.equal(await page.locator('.seo-inline-download').isVisible(),false);
   assert.match(await page.locator('.seo-inline-status').textContent(),language==='en'?/input changed/:/entrada cambió/);
   assert.deepEqual(errors,[],language+' unexpected page errors');
   await page.route('https://esm.sh/tesseract.js@5.1.1',route=>route.abort());await page.goto(origin+route);await page.locator('[data-ready=true]').waitFor({state:'attached'});
   await page.locator('[name=file]').setInputFiles({name:'private-image.png',mimeType:'image/png',buffer:Buffer.from(png)});await page.locator('button[type=submit]').click();await page.locator('.seo-inline-reload:not([hidden])').waitFor();
   assert.match(await page.locator('.seo-inline-status').textContent(),language==='en'?/reload this page/:/recarga esta página/);await context.close();
  }
  // The published background-removal SDK returns {blob,...}, not a Blob.
  {const context=await browser.newContext(),page=await context.newPage();
   await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/'))return route.continue();if(url==='https://esm.sh/@bg0/browser@0.1.1')return route.fulfill({contentType:'text/javascript',body:`export async function removeBackground(file,options){options.onProgress({stage:'downloading',progress:.4,message:'Downloading local model'});options.onProgress({stage:'finishing',progress:1,message:'Done'});return {blob:file,width:30,height:30,provider:'wasm'};}`});return route.abort();});
   await page.goto(origin+'/herramientas/quitar-fondo-imagen/');await page.locator('[data-ready=true]').waitFor({state:'attached'});
   assert.equal(await page.locator('form').getAttribute('data-max-bytes'),'41943040');assert.ok(!(await page.locator('[name=file]').getAttribute('accept')).includes('heic'));
   const png=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=30;c.height=30;return [...new Uint8Array(await(await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer())];});
   await page.locator('[name=file]').setInputFiles({name:'product.png',mimeType:'image/png',buffer:Buffer.from(png)});await page.locator('button[type=submit]').click();await page.locator('.seo-inline-download:not([hidden])').waitFor();
   assert.match(await page.locator('.seo-inline-download').getAttribute('download'),/sin-fondo\.png$/);assert.equal(await page.evaluate(async()=>(await(await fetch(document.querySelector('.seo-inline-download').href)).blob()).type),'image/png');
   await context.close();}
  const pages=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../seo/pages.json'))).pages;
  for(const privacy of ['default','dnt','gpc']){
   const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),events=[];
   if(privacy!=='default')await page.addInitScript(mode=>Object.defineProperty(navigator,mode==='dnt'?'doNotTrack':'globalPrivacyControl',{get:()=>mode==='dnt'?'1':true}),privacy);
   await context.addCookies([{name:'private-session',value:'SECRET_COOKIE',url:'https://prismaspace.space'}]);
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());if(url.origin!=='https://prismaspace.space')return route.abort();
    if(url.pathname==='/api/core/metrics'){events.push({body:route.request().postDataJSON(),headers:route.request().headers()});return route.fulfill({status:204,body:''});}
    const file=fileFor(url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({contentType:mime(file),body:fs.readFileSync(file)});
   });
   await page.goto('https://prismaspace.space/herramientas/'+pages.find(p=>p.tool==='word-count').slug+'/');await page.locator('[data-ready=true]').waitFor({state:'attached'});
   await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true}));
   await page.locator('[name=text]').fill('SECRET private-user-data');await page.locator('button[type=submit]').click();await page.locator('.seo-inline-copy:not([hidden])').click();
   await page.locator('.seo-inline-download').click();
   await page.evaluate(async()=>{const {flushCoreMetrics}=await import('/src/core-telemetry.js');await flushCoreMetrics();});
   if(privacy==='default'){
    const payload=events.flatMap(e=>e.body.events);for(const expected of ['requested','succeeded','copied','download-clicked'])assert.ok(payload.some(event=>event.event===expected),expected+' not recorded');
    for(const event of events){assert.equal(event.headers.origin,'https://prismaspace.space');assert.equal(event.headers.cookie,undefined);assert.equal(event.headers.referer,undefined);assert.ok(!JSON.stringify(event).includes('SECRET'));}
   }else assert.equal(events.length,0,privacy+' privacy signal was ignored');
   await context.close();
  }
  console.log('Tool feedback passed: bilingual OCR progress/retry, worker cleanup, stale results, BFCache, production metrics and privacy signals.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
