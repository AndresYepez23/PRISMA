const {chromium}=require('playwright');
const {readFileSync,existsSync,statSync,mkdirSync,writeFileSync}=require('node:fs');
const {createServer}=require('node:http');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../dist');
const server=createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 const target=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':/\.[a-z]+$/i.test(pathname)?'':'.html'));
 if(!target.startsWith(root+path.sep)||!existsSync(target)||!statSync(target).isFile()){response.writeHead(404).end();return;}
 response.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','svg':'image/svg+xml','json':'application/json'})[target.split('.').pop()]||'application/octet-stream');response.end(readFileSync(target));
});
(async()=>{
 const {tools}=await import('../../src/registry.js');
 const source=JSON.parse(readFileSync(path.resolve(__dirname,'../../seo/pages.json'))).pages;
 const english=JSON.parse(readFileSync(path.resolve(__dirname,'../../seo/pages.en.json'))).pages;
 const extras=JSON.parse(readFileSync(path.resolve(__dirname,'../../seo/expansion-pages.json')));
 const urls=[...readFileSync(root+'/sitemap.xml','utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
 assert.equal(urls.length,388);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.PRISMA_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [360,1280]){
   const context=await browser.newContext({viewport:{width,height:844},locale:'es-CO'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   const errors=[];
   const workers=await Promise.all(Array.from({length:4},()=>context.newPage()));
   for(const worker of workers)worker.on('pageerror',error=>errors.push(error.message));
   await Promise.all(workers.map(async(worker,index)=>{
    for(const route of urls.filter((_,position)=>position%workers.length===index)){
     const response=await worker.goto(origin+route,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,route);
     const state=await worker.evaluate(()=>({h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth+1,form:!!document.querySelector('[data-seo-inline-tool]')}));
     assert.equal(state.h1,1,route);assert.equal(state.overflow,false,route+' horizontal overflow at '+width);
     if(state.form)await worker.locator('[data-seo-inline-tool][data-ready=true]').waitFor({state:'attached'});
    }
   }));
   console.log('Layout passed: '+urls.length+' pages at '+width+' px');
   const page=workers[0];
   if(width===360){
    for(const route of ['/herramientas/rotar-pdf/','/en/tools/rotate-pdf-pages/']){
     await page.goto(origin+route);await page.locator('.seo-browse summary').click();assert.ok(await page.locator('.seo-browse nav').isVisible());
     assert.equal(await page.locator('.seo-browse nav a').count(),5);await page.keyboard.press('Escape');assert.equal(await page.locator('.seo-browse').getAttribute('open'),null);
    }
   }
   for(const route of ['/herramientas/','/en/tools/']){
    await page.goto(origin+route);await page.locator('[data-catalog-search]:not([hidden])').waitFor();
    await page.locator('#catalog-query').fill('EXIF');assert.ok(await page.locator('[data-catalog-card]:visible').count()>=2);
    await page.locator('#catalog-query').fill('zzzz-no-such-tool');assert.equal(await page.locator('[data-catalog-card]:visible').count(),0);
    await page.locator('[data-catalog-search] button[type=reset]').click();await page.locator('[data-catalog-search] select').selectOption('local');
    assert.ok(await page.locator('[data-mode=local]:visible').count()>100);assert.equal(await page.locator('[data-mode=connected]:visible').count(),0);
   }
   assert.deepEqual(errors,[],width+' browser exceptions');await context.close();
  }
  const context=await browser.newContext(),page=await context.newPage();
  const cache='/tmp/prisma-seo-inline-cdn';mkdirSync(cache,{recursive:true});
  await page.route(/^https?:\/\//,route=>{
   const url=route.request().url(),u=new URL(url);if(u.origin===origin)return route.continue();
   if(!['esm.sh','cdnjs.cloudflare.com'].includes(u.hostname))return route.abort();
   const file=cache+'/'+createHash('sha256').update(url).digest('hex');
   try{if(!existsSync(file))writeFileSync(file,execFileSync('curl',['--fail','--silent','--show-error','--location','--max-time','30',url],{maxBuffer:25*1024*1024}));return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'text/javascript',body:readFileSync(file)});}catch{return route.abort();}
  });
  const pairs=[...source.map(p=>({...p,path:'/herramientas/'+p.slug+'/'})),...extras.filter(p=>p.language==='es'&&p.path.startsWith('/herramientas/'))];
  let executed=0;
  for(const tool of tools.filter(t=>!t.file&&['local','browser'].includes(t.mode))){
   const p=pairs.find(p=>p.tool===tool.id);if(!p)continue;
   await page.goto(origin+p.path);await page.locator('[data-seo-inline-tool][data-ready=true]').waitFor({state:'attached'});
   const example=page.locator('.seo-example-load');if(await example.isVisible())await example.click();
   await page.locator('[data-seo-inline-tool] button[type=submit]').click();
   await page.waitForFunction(()=>!document.querySelector('[data-seo-inline-tool]').hasAttribute('aria-busy'),null,{timeout:25000});
   assert.ok(await page.locator('.seo-inline-download:not([hidden]),.seo-inline-print:not([hidden])').count(),tool.id+': '+await page.locator('.seo-inline-status').textContent());
   executed++;
  }
  await page.goto(origin+'/herramientas/conversor-unidades/');await page.locator('[name=kind]').selectOption('area');assert.equal(await page.locator('[name=from]').inputValue(),'m2');assert.equal(await page.locator('[name=to]').inputValue(),'km2');
  await page.locator('[name=value]').fill('1000000');await page.locator('button[type=submit]').click();await page.locator('.seo-inline-result:not([hidden])').waitFor();assert.match(await page.locator('.seo-inline-result').textContent(),/1 km/);
  for(const [id,expected] of [['text-summary-local',/Prisma/],['text-analyzer-local',/Palabras/],['json-to-xml-local',/<root>/],['xml-to-json-local',/"project"/],['text-dedupe-words-local',/makes everyday/],['contrast-check-local',/Contraste/]]){
   await page.goto(origin+'/?tool='+id+'&lang=es');await page.locator('#tool-modal:not(.hidden)').waitFor();
   await page.locator('#modal-run').click();await page.locator('#output-text').waitFor();assert.match(await page.locator('#output-text').textContent(),expected,id+' app form');
  }
  await page.goto(origin+'/?tool=ai-webpage&lang=es');await page.locator('#tool-modal:not(.hidden)').waitFor();assert.equal(await page.locator('#field-prompt').count(),1);assert.equal(await page.locator('#field-provider').count(),1);
  console.log(JSON.stringify({ok:true,publicRoutes:urls.length,mobileDesktop:true,realLocalTextTools:executed,directorySearch:true,unitCategories:true,repairedAppForms:7}));
  await context.close();
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
