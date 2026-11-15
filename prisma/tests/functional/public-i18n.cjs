// Real generated pages in Chromium; no Core operations or external requests.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {verifyToolControls}=require('./seo-tool-controls.cjs');
const root=path.resolve(__dirname,'../../dist');
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':/\.[a-z]+$/i.test(pathname)?'':'.html'));
 if(!file.startsWith(root+'/')||!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'js':'text/javascript','html':'text/html','css':'text/css','json':'application/json','svg':'image/svg+xml'})[file.split('.').pop()]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.PRISMA_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const cases=[];
 const closeContext=async ctx=>{await ctx.unrouteAll({behavior:'wait'});await ctx.close();};
 const context=async options=>{
  const ctx=await browser.newContext(options);
  await ctx.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.protocol==='blob:'||url.protocol==='data:')return route.continue();
   if(![origin,'https://prismaspace.space'].includes(url.origin)||url.pathname.startsWith('/api/'))return route.abort();
   // Exercise the real i18n module without booting authentication or engines.
   if(url.pathname==='/src/main.js')return route.fulfill({contentType:'text/javascript',body:''});
   // Absolute canonical language links also resolve to the local build bytes.
   if(url.origin!==origin){
    const pathname=decodeURIComponent(url.pathname);
    const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':/\.[a-z]+$/i.test(pathname)?'':'.html'));
    if(!file.startsWith(root+'/')||!fs.existsSync(file))return route.fulfill({status:404,body:''});
    const contentType=({'html':'text/html','css':'text/css','js':'text/javascript','svg':'image/svg+xml'})[file.split('.').pop()]||'application/octet-stream';
    return route.fulfill({contentType,body:fs.readFileSync(file)});
   }
   return route.continue();
  });
  return ctx;
 };
 try{
  for(const [route,saved,locale,language] of [
   ['/en/','es','es-CO','en'],['/en/','','es-CO','en'],
   ['/','es','en-US','es'],['/','en','es-CO','en'],
   ['/','','en-US','en'],['/','','es-CO','es'],
   ['/?lang=es','en','en-US','es'],['/en/?lang=es','es','es-CO','en']
  ]){
   const ctx=await context({locale});
   if(saved)await ctx.addInitScript(value=>localStorage.setItem('prisma-language',value),saved);
   const page=await ctx.newPage();await page.goto(origin+route);
   await page.waitForFunction(()=>Boolean(window.prismaI18n));
   assert.equal(await page.evaluate(()=>window.prismaI18n.language),language);
   assert.equal(await page.locator('html').getAttribute('lang'),language);
   const path=new URL(route,origin).pathname;
   assert.equal(new URL(page.url()).pathname,path,'Automatic language detection changed the URL');
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://prismaspace.space'+path);
   cases.push('locale '+JSON.stringify({route,saved,locale,language}));await closeContext(ctx);
  }
  {
   const ctx=await context({locale:'en-US'}),page=await ctx.newPage();
   await page.goto(origin+'/en/?tool=pdf-to-word&lang=es#workspace');
   await page.waitForFunction(()=>Boolean(window.prismaI18n));
   await page.evaluate(()=>{
    const user=document.createElement('div');user.dataset.userContent='';user.id='test-user-content';
    user.textContent='archivo — a user title';document.body.append(user);
    window.prismaI18n.setLanguage('es');
   });
   assert.equal(new URL(page.url()).pathname,'/');
   assert.equal(new URL(page.url()).search,'?tool=pdf-to-word');
   assert.equal(new URL(page.url()).hash,'#workspace');
   assert.match(await page.locator('.main-footer').textContent(),/Acerca de Prisma/);
   assert.equal(await page.locator('a[href="/acerca"]').count(),1);
   assert.match(await page.locator('#profile-menu-privacy').textContent(),/Puedes explorar Prisma sin cuenta/);
   await page.evaluate(()=>window.prismaI18n.setLanguage('en'));
   assert.equal(new URL(page.url()).pathname,'/en/');
   assert.match(await page.locator('.main-footer').textContent(),/About Prisma/);
   assert.equal(await page.locator('a[href="/en/about"]').count(),1);
   assert.equal(await page.locator('#test-user-content').textContent(),'archivo — a user title');
   cases.push('English → Spanish → English preserves page, query, fragment and user content');await closeContext(ctx);
  }
  const esPdf='/herramientas/pdf-a-word/',enPdf='/en/tools/free-pdf-to-word-converter/';
  const routes=[
   esPdf,enPdf,'/categorias/','/en/categories/','/soluciones/','/en/solutions/',
   '/guias/','/en/guides/','/acerca','/en/about','/privacy','/en/privacy'
  ];
  const expansion=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../seo/expansion-pages.json'),'utf8'));
  routes.push(...expansion.map(p=>p.path));
  for(const route of routes){
   const language=route.startsWith('/en/')?'en':'es';
   const ctx=await context({locale:language==='es'?'en-US':'es-CO',viewport:{width:390,height:844}});
   const page=await ctx.newPage();await page.goto(origin+route);
   assert.equal(await page.locator('html').getAttribute('lang'),language);
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://prismaspace.space'+route);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow '+route);
   if(route===esPdf||route===enPdf){
    assert.match(await page.locator('h1').textContent(),language==='es'?/Convertir PDF a Word/:/Free PDF to Word/);
    await page.locator('a.seo-cta').first().click();
    await page.waitForFunction(()=>Boolean(window.prismaI18n));
    assert.equal(await page.locator('html').getAttribute('lang'),language,'Tool launch lost the landing language');
    assert.equal(new URL(page.url()).searchParams.get('tool'),'pdf-to-word');
    await page.goto(origin+route);
    await page.locator('a.seo-language-switch').click();
    assert.equal(new URL(page.url()).pathname,language==='es'?enPdf:esPdf);
   }
   cases.push('mobile public route '+route);await closeContext(ctx);
  }
  {
   const ctx=await context({locale:'en-US'}),page=await ctx.newPage();
   await page.goto(origin+'/en/');
   const result=await page.evaluate(async()=>{
    const {runTool}=await import('/src/engines.js');
    const cards=await runTool('flashcards-export',[],{text:'Capital | Ottawa\nFormula :: H2O'});
    const diff=await runTool('text-diff',[],{textA:'Unchanged\nOld',textB:'Unchanged\nNew'});
    const a=document.createElement('a');a.href=URL.createObjectURL(cards.blob);a.download=cards.filename;a.id='test-csv-download';a.textContent='Download CSV';document.body.append(a);
    return {csv:await cards.blob.text(),diff:diff.text};
   });
   assert.equal(result.csv,'Capital,Ottawa\nFormula,H2O');
   assert.match(result.diff,/\+ New/);assert.match(result.diff,/- Old/);
   const downloadPromise=page.waitForEvent('download');await page.evaluate(()=>document.querySelector('#test-csv-download').click());
   const download=await downloadPromise;assert.equal(download.suggestedFilename(),'prisma-tarjetas-anki.csv');
   assert.equal(fs.readFileSync(await download.path(),'utf8'),result.csv);
   cases.push('Real Anki CSV download and text difference engine');await closeContext(ctx);
  }
  {
   const ctx=await context({locale:'en-US'}),page=await ctx.newPage();
   await page.goto(origin+'/en/');await page.waitForFunction(()=>Boolean(window.prismaI18n));
   await verifyToolControls(page);
   cases.push('Bilingual reading, JSON, HTML and bidirectional CSV/TSV form controls with real local results');await closeContext(ctx);
  }
  {
   const ctx=await context({javaScriptEnabled:false}),page=await ctx.newPage();
   await page.goto(origin+'/en/');
   const body=await page.locator('body').textContent();
   assert.doesNotMatch(body,/\b(?:herramientas?|archivos?|privacidad|disponibles|contraseña)\b/i);
   assert.match(body,/About Prisma/);
   assert.equal(await page.locator('.main-footer a[href="/en/privacy#privacidad"]').count(),1);
   cases.push('English app HTML is translated without JavaScript');await closeContext(ctx);
  }
  console.log(JSON.stringify({ok:true,realBrowser:true,externalRequests:false,cases:cases.length,results:cases},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
