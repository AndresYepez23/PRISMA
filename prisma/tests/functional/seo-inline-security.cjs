const {chromium}=require('playwright');
const {readFileSync,existsSync,statSync}=require('node:fs');
const {createServer}=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../dist');
const server=createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const target=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!target.startsWith(root+path.sep)||!existsSync(target)||!statSync(target).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':'text/html');
 res.end(readFileSync(target));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.PRISMA_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  const origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin+'/herramientas/generador-citas-apa-vancouver/');
  await page.locator('[data-seo-inline-tool] [name=author]').fill('García, A.');
  await page.locator('[data-seo-inline-tool] [name=year]').fill('2024');
  await page.locator('[data-seo-inline-tool] [name=title]').fill('Manual de estudio');
  await page.locator('[data-seo-inline-tool] button[type=submit]').click();
  await page.locator('.seo-inline-result:not([hidden])').waitFor();
  assert.match(await page.locator('.seo-inline-result').textContent(),/García, A\. \(2024\)\. Manual de estudio/);
  const safety=await page.evaluate(async()=>{
   const {sanitizeDocumentHtml,escapeDocumentTitle}=await import('/src/html-safety.js');
   return {html:sanitizeDocumentHtml('<p>Seguro <strong>sí</strong></p><script>window.bad=1</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">malo</a><a href="https://example.com">bueno</a>'),title:escapeDocumentTitle('</title><script>alert(1)</script>')};
  });
  assert.match(safety.html,/<strong>sí<\/strong>/);
  assert.doesNotMatch(safety.html,/script|onerror|javascript:|src="x"/i);
  assert.match(safety.html,/href="https:\/\/example.com"/);
  assert.doesNotMatch(safety.title,/<|>/);
  console.log('SEO inline citation and DOCX HTML safety: passed');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
