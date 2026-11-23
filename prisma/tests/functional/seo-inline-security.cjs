const {chromium}=require('playwright');
const {readFileSync,existsSync,statSync}=require('node:fs');
const {createServer}=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {mkdirSync,writeFileSync}=require('node:fs');
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
  const cache='/tmp/prisma-seo-inline-cdn';mkdirSync(cache,{recursive:true});
  await page.route(/^https?:\/\//,route=>{
   const url=route.request().url(),u=new URL(url);
   if(u.origin===origin)return route.continue();
   if(!['esm.sh','cdnjs.cloudflare.com'].includes(u.hostname))return route.abort();
   const file=cache+'/'+createHash('sha256').update(url).digest('hex');
   try{
    if(!existsSync(file))writeFileSync(file,execFileSync('curl',['--fail','--silent','--show-error','--location','--max-time','60',url],{maxBuffer:25*1024*1024}));
    return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:url.endsWith('.wasm')?'application/wasm':'text/javascript',body:readFileSync(file)});
   }catch{return route.abort();}
  });
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
  const fixture=await page.evaluate(async()=>{
   const {PDFDocument}=await import('https://esm.sh/pdf-lib@1.17.1');
   const pdf=await PDFDocument.create();for(let i=1;i<=4;i++)pdf.addPage([240,240]).drawText('Page '+i);
   const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;canvas.getContext('2d').fillRect(0,0,24,24);
   const jpeg=new Uint8Array(await(await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg'))).arrayBuffer());
   const exif=new TextEncoder().encode('Exif\0\0GPSLatitude=10.5');const length=exif.length+2;
   const withExif=new Uint8Array(jpeg.length+exif.length+4);
   withExif.set(jpeg.slice(0,2));withExif.set([255,225,length>>8,length&255],2);withExif.set(exif,6);withExif.set(jpeg.slice(2),6+exif.length);
   return {pdf:Array.from(await pdf.save()),photo:Array.from(withExif)};
  });
  for(const [language,path] of [['es','/herramientas/dividir-pdf/'],['en','/en/tools/split-pdf-into-separate-files/']]){
   await page.goto(origin+path);
   assert.equal(await page.locator('.seo-actions .seo-cta').getAttribute('href'),'#inline-tool-title');
   await page.locator('[data-seo-inline-tool] [name=file]').setInputFiles({name:'cuatro.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixture.pdf)});
   await page.locator('[data-seo-inline-tool] [name=mode]').selectOption('ranges');
   await page.locator('[data-seo-inline-tool] [name=ranges]').fill('1-2; 3-4');
   await page.waitForFunction(()=>/2 (PDF|output PDF)/.test(document.querySelector('.seo-inline-preview')?.textContent||''));
   await page.locator('[data-seo-inline-tool] button[type=submit]').click();
   await page.locator('.seo-inline-download:not([hidden])').waitFor({timeout:60000});
   const bytes=await page.evaluate(async()=>Array.from(new Uint8Array(await(await fetch(document.querySelector('.seo-inline-download').href)).arrayBuffer())));
   assert.deepEqual(bytes.slice(0,2),[80,75],language+' ZIP signature');
   assert.match(await page.locator('.seo-inline-download').getAttribute('download'),/\.zip$/);
  }
  for(const [language,path] of [['es','/herramientas/eliminar-metadatos-imagen/'],['en','/en/tools/remove-exif-metadata-from-an-image/']]){
   await page.goto(origin+path);
   assert.equal(await page.locator('.seo-actions .seo-cta').getAttribute('href'),'#inline-tool-title');
   await page.locator('[data-seo-inline-tool] [name=file]').setInputFiles({name:'foto.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fixture.photo)});
   await page.locator('[data-seo-inline-tool] button[type=submit]').click();
   await page.locator('.seo-inline-download:not([hidden])').waitFor({timeout:30000});
   const bytes=await page.evaluate(async()=>Array.from(new Uint8Array(await(await fetch(document.querySelector('.seo-inline-download').href)).arrayBuffer())));
   assert.deepEqual(bytes.slice(0,2),[255,216],language+' JPEG signature');
   assert.equal(Buffer.from(bytes).includes(Buffer.from('GPSLatitude')),false,language+' EXIF data survived');
  }
  console.log('SEO inline citation, PDF split, EXIF and DOCX HTML safety: passed');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
