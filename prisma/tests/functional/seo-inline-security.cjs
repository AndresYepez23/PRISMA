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
   const png=new Uint8Array(await(await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))).arrayBuffer());
   const exif=new TextEncoder().encode('Exif\0\0GPSLatitude=10.5');const length=exif.length+2;
   const withExif=new Uint8Array(jpeg.length+exif.length+4);
   withExif.set(jpeg.slice(0,2));withExif.set([255,225,length>>8,length&255],2);withExif.set(exif,6);withExif.set(jpeg.slice(2),6+exif.length);
   const first=await PDFDocument.create(),second=await PDFDocument.create();
   first.addPage([200,250]).drawText('First document');second.addPage([300,250]).drawText('Second document');
   return {pdf:Array.from(await pdf.save()),photo:Array.from(withExif),png:Array.from(png),first:Array.from(await first.save()),second:Array.from(await second.save())};
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
  for(const [language,path] of [['es','/herramientas/unir-pdf/'],['en','/en/tools/merge-pdf-files-into-one-document/']]){
   await page.goto(origin+path);
   assert.equal(await page.locator('.seo-actions .seo-cta').getAttribute('href'),'#inline-tool-title');
   await page.locator('[data-seo-inline-tool] [name=file]').setInputFiles([
    {name:'first.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixture.first)},
    {name:'second.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixture.second)}
   ]);
   assert.equal(await page.locator('.seo-inline-order li').count(),2);
   await page.locator('.seo-inline-order li:nth-child(2) button').first().click();
   assert.match(await page.locator('.seo-inline-order li').first().textContent(),/second\.pdf/);
   await page.locator('[data-seo-inline-tool] button[type=submit]').click();
   await page.locator('.seo-inline-download:not([hidden])').waitFor({timeout:60000});
   const widths=await page.evaluate(async()=>{
    const {PDFDocument}=await import('https://esm.sh/pdf-lib@1.17.1');
    const bytes=await(await fetch(document.querySelector('.seo-inline-download').href)).arrayBuffer();
    const pdf=await PDFDocument.load(bytes);return pdf.getPages().map(item=>item.getWidth());
   });
   assert.deepEqual(widths,[300,200],language+' PDF order');
  }
  for(const [language,path] of [['es','/herramientas/comprimir-imagen/'],['en','/en/tools/compress-an-image-without-installing-software/']]){
   await page.goto(origin+path);
   assert.equal(await page.locator('.seo-actions .seo-cta').getAttribute('href'),'#inline-tool-title');
   await page.locator('[data-seo-inline-tool] [name=file]').setInputFiles({name:'foto.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fixture.photo)});
   await page.locator('[data-seo-inline-tool] [name=quality]').fill('65');
   await page.locator('[data-seo-inline-tool] button[type=submit]').click();
   await page.locator('.seo-inline-download:not([hidden])').waitFor({timeout:30000});
   assert.match(await page.locator('.seo-inline-download').getAttribute('download'),/\.webp$/);
   assert.match(await page.locator('.seo-inline-status').textContent(),/Original:.*KB.*KB/);
   assert.equal(await page.locator('.seo-inline-image').isVisible(),true);
  }
  for(const [path,id,files,signature,extension] of [
   ['/herramientas/extraer-paginas-pdf/','pdf-extract',[{name:'digital.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixture.pdf)}],[37,80,68,70],/\.pdf$/],
   ['/herramientas/rotar-pdf/','pdf-rotate',[{name:'digital.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixture.pdf)}],[37,80,68,70],/\.pdf$/],
   ['/herramientas/insertar-paginas-blanco-pdf/','pdf-add-blank',[{name:'digital.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixture.pdf)}],[37,80,68,70],/\.pdf$/],
   ['/herramientas/png-a-jpg/','image-convert',[{name:'photo.png',mimeType:'image/png',buffer:Buffer.from(fixture.png)}],[255,216],/\.jpg$/],
   ['/herramientas/pdf-a-word/','pdf-to-word',[{name:'digital.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixture.pdf)}],[80,75],/\.docx$/],
   ['/en/tools/convert-pdf-to-jpg/','pdf-to-image',[{name:'digital.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixture.pdf)}],[80,75],/\.zip$/],
   ['/herramientas/jpg-a-pdf/','image-pdf',[{name:'uno.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fixture.photo)},{name:'dos.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fixture.photo)}],[37,80,68,70],/\.pdf$/],
   ['/en/tools/convert-png-to-pdf/','image-pdf',[{name:'shot.png',mimeType:'image/png',buffer:Buffer.from(fixture.png)}],[37,80,68,70],/\.pdf$/],
   ['/herramientas/collage-de-fotos/','image-collage',[{name:'uno.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fixture.photo)},{name:'dos.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fixture.photo)}],[255,216],/\.jpg$/],
   ['/herramientas/redimensionar-imagen/','image-resize',[{name:'foto.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fixture.photo)}],[137,80,78,71],/\.png$/],
   ['/en/tools/crop-an-image-online/','image-crop',[{name:'photo.png',mimeType:'image/png',buffer:Buffer.from(fixture.png)}],[137,80,78,71],/\.png$/]
  ]){
   await page.goto(origin+path);
   assert.equal(await page.locator('.seo-actions .seo-cta').getAttribute('href'),'#inline-tool-title',path);
   assert.equal(await page.locator('[data-seo-inline-tool]').getAttribute('data-seo-inline-tool'),id,path);
   await page.locator('[data-seo-inline-tool] [name=file]').setInputFiles(files);
   await page.locator('[data-seo-inline-tool] button[type=submit]').click();
   await page.locator('.seo-inline-download:not([hidden])').waitFor({timeout:30000}).catch(async error=>{throw Error(path+': '+await page.locator('.seo-inline-status').textContent(),{cause:error});});
   const bytes=await page.evaluate(async()=>Array.from(new Uint8Array(await(await fetch(document.querySelector('.seo-inline-download').href)).arrayBuffer())));
   assert.deepEqual(bytes.slice(0,signature.length),signature,path+' output signature');
   assert.match(await page.locator('.seo-inline-download').getAttribute('download'),extension,path+' extension');
   if(['pdf-extract','pdf-rotate','pdf-add-blank'].includes(id)){
    const details=await page.evaluate(async()=>{const {PDFDocument}=await import('https://esm.sh/pdf-lib@1.17.1');const pdf=await PDFDocument.load(await(await fetch(document.querySelector('.seo-inline-download').href)).arrayBuffer());return {pages:pdf.getPageCount(),angle:pdf.getPage(0).getRotation().angle};});
    assert.equal(details.pages,id==='pdf-extract'?3:id==='pdf-add-blank'?5:4,path+' pages');if(id==='pdf-rotate')assert.equal(details.angle,90,path+' rotation');
   }

  }
  for(const [path,id,file,expected] of [
   ['/herramientas/extraer-texto-pdf/','pdf-text',{name:'digital.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixture.pdf)},'Page 1'],
   ['/en/tools/view-exif-metadata-of-an-image/','image-metadata',{name:'photo.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fixture.photo)},'24 × 24']
  ]){
   await page.goto(origin+path);
   assert.equal(await page.locator('[data-seo-inline-tool]').getAttribute('data-seo-inline-tool'),id,path);
   await page.locator('[data-seo-inline-tool] [name=file]').setInputFiles(file);
   await page.locator('[data-seo-inline-tool] button[type=submit]').click();
   await page.locator('.seo-inline-result:not([hidden])').waitFor({timeout:20000}).catch(async error=>{throw Error(path+': '+await page.locator('.seo-inline-status').textContent(),{cause:error});});
   assert.ok((await page.locator('.seo-inline-result').textContent()).includes(expected),path+' text result');
  }
  await page.goto(origin+'/en/tools/convert-image-to-text-with-ocr/');
  assert.equal(await page.locator('[data-seo-inline-tool="image-ocr"] [name=language]').inputValue(),'eng');
  await page.goto(origin+'/herramientas/jpg-a-pdf/');
  await page.locator('[data-seo-inline-tool] [name=file]').setInputFiles({name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('wrong')});
  await page.locator('[data-seo-inline-tool] button[type=submit]').click();
  assert.match(await page.locator('.seo-inline-status').textContent(),/formato admitido/);
  assert.equal(await page.locator('.seo-inline-download').isVisible(),false);
  for(const [path,language] of [['/herramientas/word-a-pdf/','es'],['/en/tools/convert-word-to-pdf-from-your-browser/','en']]){
   await page.goto(origin+path);
   assert.equal(await page.locator('.seo-actions .seo-cta').getAttribute('href'),'#inline-tool-title',path);
   await page.locator('[name=file]').setInputFiles(require('node:path').resolve(__dirname,'../fixtures/conversion.docx'));
   await page.locator('[data-seo-inline-tool] button[type=submit]').click();
   await page.locator('.seo-inline-print:not([hidden])').waitFor({timeout:20000});
   const fallback=page.locator('.seo-inline-tool > p > a').last();
   assert.equal(new URL(await fallback.getAttribute('href'),origin).searchParams.get('tool'),'docx-pdf',path);
   await fallback.click();
   await page.locator('#tool-modal:not(.hidden)').waitFor({timeout:15000});
   assert.match(await page.locator('#modal-title').textContent(),language==='es'?/Word a PDF/:/Word to PDF/);
   assert.match(await page.locator('#file-input').getAttribute('accept'),/\.docx/);
  }
  const imagePdf=await page.evaluate(async()=>{
   const {runTool}=await import('/src/engines.js'),{PDFDocument}=await import('https://esm.sh/pdf-lib@1.17.1');
   const canvas=document.createElement('canvas');canvas.width=400;canvas.height=200;canvas.getContext('2d').fillRect(0,0,400,200);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg'));
   const file=new File([blob],'sample.jpg',{type:'image/jpeg'});
   const fitted=await runTool('image-pdf',[file],{pageSize:'fit'});
   const standard=await runTool('image-pdf',[file],{pageSize:'a4'});
   const measure=async result=>{
    const pdf=await PDFDocument.load(await result.blob.arrayBuffer());
    const first=pdf.getPage(0);return [first.getWidth(),first.getHeight()];
   };
   return {fit:await measure(fitted),a4:await measure(standard)};
  });
  assert.deepEqual(imagePdf.fit,[300,150],'Fit page must match image aspect ratio and size');
  assert.ok(Math.abs(imagePdf.a4[0]-595.28)<.01&&Math.abs(imagePdf.a4[1]-841.89)<.01,'A4 page dimensions changed');
  console.log('SEO inline tools, image-to-PDF fit, PDF order and DOCX HTML safety: passed');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
