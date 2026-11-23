const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFileSync,existsSync,statSync,createReadStream}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'../../dist');
const server=createServer((request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)||!existsSync(file)||!statSync(file).isFile()){response.writeHead(404).end();return;}
 response.setHeader('Content-Type',({'html':'text/html','css':'text/css','js':'text/javascript','svg':'image/svg+xml','json':'application/json'})[file.split('.').pop()]||'application/octet-stream');
 createReadStream(file).pipe(response);
});

(async()=>{
 const {priorityExamples:examples,priorityVisuals:visuals}=await import('../../seo/priority-examples.mjs');
 const enPages=JSON.parse(readFileSync(path.resolve(__dirname,'../../seo/pages.en.json'))).pages;
 const enBySource=new Map(enPages.map(item=>[item.sourceSlug,item.englishSlug]));
 const paths=Object.keys(examples).flatMap(slug=>['/herramientas/'+slug+'/','/en/tools/'+enBySource.get(slug)+'/']);
 assert.equal(paths.length,48);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.PRISMA_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:844},locale:'es-CO'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   for(const route of paths){
    await page.goto(origin+route,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('h1').count(),1,route);
    assert.equal(await page.locator('.seo-example').count(),1,route);
    const slug=route.startsWith('/en/')?[...enBySource].find(([,englishSlug])=>route.endsWith('/'+englishSlug+'/'))?.[0]:route.split('/')[2];
    assert.equal(await page.locator('.seo-example').getAttribute('data-family'),visuals[slug].family,route);
    assert.equal(await page.locator('.seo-example-node').count(),2,route);
    assert.equal(await page.locator('.seo-example-review').count(),1,route);
    assert.ok(await page.locator('.seo-actions .seo-cta').isVisible(),route+' action hidden');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' horizontal overflow at '+width);
   }
   if(width===390){
    for(const route of ['/herramientas/unir-pdf/','/en/tools/compress-an-image-without-installing-software/']){
     await page.goto(origin+route);
     await page.locator('.seo-actions .seo-cta').click();
     await page.waitForFunction(()=>{
      const title=document.querySelector('#inline-tool-title'),header=document.querySelector('.seo-header');
      return title.getBoundingClientRect().top>=header.getBoundingClientRect().bottom-3&&title.getBoundingClientRect().top<innerHeight;
     },null,{timeout:5000});
    }
   }
   for(const route of ['/','/en/']){
    await page.goto(origin+route);
    await page.waitForFunction(()=>!document.body.classList.contains('app-booting'),null,{timeout:15000});
    assert.equal(await page.locator('h1').count(),1,route);
    assert.equal(await page.locator('.core-start-links a').count(),5,route);
    assert.ok(await page.locator('.core-start-links').isVisible(),route+' task paths hidden');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' horizontal overflow at '+width);
   }
   assert.deepEqual(errors,[],width+' browser errors');
   await context.close();
  }
  console.log('Catalogue redesign: 48 bilingual tool pages and both live app homepages passed Chromium mobile/desktop checks');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
