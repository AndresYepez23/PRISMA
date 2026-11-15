// Actual browser, real file bytes and production engines. No model inference.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=process.env.PRISMA_FUNCTIONAL_ROOT?path.resolve(process.env.PRISMA_FUNCTIONAL_ROOT):path.resolve(__dirname,'../..');
const out=path.resolve(process.env.PRISMA_FUNCTIONAL_OUTPUT||'/tmp/prisma-document-conversion');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(out+'/cdn',{recursive:true});
const server=http.createServer((req,res)=>{
 const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!filename.startsWith(root+'/')&&filename!==root){res.writeHead(403).end();return;}
 const target=fs.existsSync(filename)&&fs.statSync(filename).isDirectory()?filename+'/index.html':filename;
 if(!fs.existsSync(target)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'js':'text/javascript','html':'text/html','css':'text/css','json':'application/json','svg':'image/svg+xml'})[target.split('.').pop()]||'application/octet-stream');
 fs.createReadStream(target).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.PRISMA_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const report={realBrowser:true,realFileBytes:true,queenInference:false,otherProviderInference:false,apiAttempts:[],cases:[]};
 try{
  const context=await browser.newContext({locale:'es-ES'});
  await context.route(/^https?:\/\//,async route=>{
   const url=route.request().url(),u=new URL(url);
   if(u.origin===origin){
    if(!u.pathname.startsWith('/api/'))return route.continue();
    report.apiAttempts.push({path:u.pathname,method:route.request().method()});
    return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"available":false}'});
   }
   if(!['esm.sh','cdnjs.cloudflare.com','cdn.jsdelivr.net'].includes(u.hostname))return route.abort();
   const cache=out+'/cdn/'+require('node:crypto').createHash('sha256').update(url).digest('hex');
   try{
    if(!fs.existsSync(cache))fs.writeFileSync(cache,execFileSync('curl',['--fail','--silent','--show-error','--location','--max-time','60',url],{maxBuffer:25*1024*1024}));
    return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:u.pathname.endsWith('.wasm')?'application/wasm':'text/javascript',body:fs.readFileSync(cache)});
   }catch(error){return route.abort();}
  });
  const page=await context.newPage();
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#core-input');
  await page.evaluate(()=>{window.testReplies=[];document.addEventListener('prisma:core-message',event=>{if(event.detail.role==='assistant')window.testReplies.push(event.detail.content);});});
  const fixture=await page.evaluate(async()=>{
   const JSZip=(await import('https://esm.sh/jszip@3.10.1')).default;
   const zip=new JSZip();
   zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
   zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
   zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Informe PRISMA</w:t></w:r></w:p><w:p><w:r><w:t>Café, contenido verificable 2026 &amp; total 123.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Producto</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>42</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>');
   return {name:'informe.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:Array.from(await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}))};
  });
  const buffer=Buffer.from(fixture.bytes);fs.writeFileSync(out+'/'+fixture.name,buffer);
  const prompt='Quiero transformar este archivo a otro formato, pero antes identifica su tipo, determina qué conversiones son compatibles y explícame cuál conserva mejor su contenido';
  await page.locator('#core-file-input').setInputFiles({name:fixture.name,mimeType:fixture.mimeType,buffer});
  await page.locator('#core-input').fill(prompt);await page.locator('#core-send').click();
  await page.waitForFunction(()=>window.testReplies.length>0);
  const reply=await page.evaluate(()=>window.testReplies.at(-1));
  report.cases.push({name:'docx-preflight-chat',reply});
  assert.match(reply,/DOCX/);assert.match(reply,/HTML/);assert.match(reply,/TXT/);assert.match(reply,/PDF/);
  assert.match(reply,/conserv|estructura|formato/);assert.doesNotMatch(reply,/^¿A qué formato quieres/);
  await page.waitForFunction(()=>!document.querySelector('#core-send').disabled);
  await page.locator('#core-input').fill('A HTML');await page.locator('#core-send').click();
  await page.waitForSelector('.core-result-download button');
  const downloadEvent=page.waitForEvent('download');
  await page.locator('.core-result-download button').filter({hasText:/^Descargar$/}).last().click();
  const download=await downloadEvent;await download.saveAs(out+'/informe.html');
  const html=fs.readFileSync(out+'/informe.html','utf8');
  assert.match(html,/Café, contenido verificable 2026 &amp; total 123\./);
  assert.match(html,/<table>/);assert.match(html,/>Producto</);assert.match(html,/>42</);
  report.cases.push({name:'docx-to-html-followup-download',filename:download.suggestedFilename(),textPreserved:true,tablePreserved:true});
  await page.waitForFunction(()=>!document.querySelector('#core-send').disabled);
  const beforeReference=await page.locator('.core-result-download').count();
  const repliesBefore=await page.evaluate(()=>window.testReplies.length);
  await page.locator('#core-input').fill('Convierte ese resultado a TXT');await page.locator('#core-send').click();
  await page.waitForFunction(previous=>!document.querySelector('#core-send').disabled&&window.testReplies.length>previous,repliesBefore);
  const referenceReply=await page.evaluate(()=>window.testReplies.at(-1));
  report.cases.push({name:'reference-to-generated-html',reply:referenceReply});
  assert.equal(await page.locator('.core-result-download').count(),beforeReference+1,'the remembered result must be converted without asking for another upload');
  const referencedDownload=page.waitForEvent('download');
  await page.locator('.core-result-download button').filter({hasText:/^Descargar$/}).last().click();
  const referenced=await referencedDownload;assert.match(referenced.suggestedFilename(),/\.txt$/);
  await referenced.saveAs(out+'/resultado-anterior.txt');
  const referencedText=fs.readFileSync(out+'/resultado-anterior.txt','utf8');
  assert.match(referencedText,/Café, contenido verificable 2026 & total 123\./);assert.match(referencedText,/Producto/);assert.match(referencedText,/42/);
  await page.waitForFunction(()=>!document.querySelector('#core-send').disabled);
  await page.locator('#core-file-input').setInputFiles({name:fixture.name,mimeType:fixture.mimeType,buffer});
  const count=await page.locator('.core-result-download').count();
  await page.locator('#core-input').fill('Identifica el tipo del archivo y conviértelo a HTML');await page.locator('#core-send').click();
  await page.waitForFunction(expected=>document.querySelectorAll('.core-result-download').length>expected,count);
  const directDownload=page.waitForEvent('download');
  await page.locator('.core-result-download button').filter({hasText:/^Descargar$/}).last().click();
  await (await directDownload).saveAs(out+'/informe-destino-explicito.html');
  assert.match(fs.readFileSync(out+'/informe-destino-explicito.html','utf8'),/>Producto</);
  report.cases.push({name:'inspection-then-explicit-target-without-extra-clarification',tablePreserved:true});
  const controls=await page.evaluate(async()=>{
   const {runTool}=await import('/src/engines.js');
   const {assessFileConversions,planFileConversion}=await import('/src/file-conversions.js');
   const {planWithPrismaCore}=await import('/src/developer-api.js');
   const {resultFiles,runToolBatch}=await import('/src/core-execution.js');
   const {validateFileRequest}=await import('/src/file-inspection.js');
   const {tools}=await import('/src/registry.js');
   const {PDFDocument,StandardFonts}=await import('https://esm.sh/pdf-lib@1.17.1');
   const JSZip=(await import('https://esm.sh/jszip@3.10.1')).default;
   const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
   for(const text of ['FIRST PAGE OMIT','SECOND PAGE KEEP 123','THIRD PAGE OMIT'])pdf.addPage([600,400]).drawText(text,{x:40,y:300,font,size:18});
   const input=new File([await pdf.save()],'tres-paginas.pdf',{type:'application/pdf'}),artifacts=[];
   const archive=async(file,name=file.name)=>artifacts.push({name,bytes:Array.from(new Uint8Array(await file.arrayBuffer()))});
   await archive(input);
   const preflightCases=[];
   const check=async(name,text,files,code)=>{
    const r=await validateFileRequest(text,files,{tools,inspect:file=>runTool('file-inspector',[file],{deep:true})});
    if(r.code!==code)throw Error(name+': expected '+code+', received '+JSON.stringify(r));
    preflightCases.push({name,code:r.code,message:r.message,realFileBytes:true});
   };
   const word=new File([await(await fetch('/tests/fixtures/conversion.docx')).arrayBuffer()],'word.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
   const four=await PDFDocument.create();for(let n=0;n<4;n++)four.addPage([200,200]).drawText('PAGE '+(n+1));
   const fourPages=new File([await four.save()],'cuatro-paginas.pdf',{type:'application/pdf'});await archive(fourPages);
   await check('pdf-request-with-word-bytes','Convierte este PDF a Word',[word],'SOURCE_CONTRADICTION');
   await check('word-request-with-pdf-bytes','Convierte este Word a PDF',[fourPages],'SOURCE_CONTRADICTION');
   await check('page-eight-of-four','Extrae la página 8 de este PDF',[fourPages],'PAGE_RANGE');
   await check('three-pdfs-requested-two-received','Une estos tres PDF',[input,fourPages],'FILE_COUNT');
   await check('missing-pdf','Convierte este PDF a Word',[],'MISSING_FILE');
   await check('unreadable-pdf','Convierte este PDF a Word',[new File(['%PDF-1.7\nBROKEN'],'roto.pdf',{type:'application/pdf'})],'UNREADABLE_FILE');
   await check('unreadable-docx','Convierte este archivo a TXT',[new File([new Uint8Array([80,75,3,4,0,0])],'roto.docx',{type:word.type})],'UNREADABLE_FILE');
   await check('renamed-word-is-not-pdf','Convierte este PDF a Word',[new File([await word.arrayBuffer()],'renombrado.pdf',{type:'application/pdf'})],'FORMAT_MISMATCH');
   const protectedPdf=new File([await(await fetch('/tests/fixtures/preflight-protected.pdf')).arrayBuffer()],'protegido.pdf',{type:'application/pdf'});
   await check('encrypted-pdf','Convierte este PDF protegido a Word',[protectedPdf],'PROTECTED_FILE');
   const scan=await PDFDocument.create();scan.addPage([200,200]);
   await check('scan-needs-ocr-before-excel','Convierte este archivo a Excel',[new File([await scan.save()],'escaneo.pdf',{type:'application/pdf'})],'OCR_REQUIRED');
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=24;canvas.getContext('2d').fillRect(0,0,32,24);
   const jpg=new File([await new Promise(r=>canvas.toBlob(r,'image/jpeg'))],'foto.jpg',{type:'image/jpeg'});
   await check('video-request-with-jpeg-bytes','Comprime este video',[jpg],'SOURCE_CONTRADICTION');
   let protectedCalls=0;
   for(const [id,files,params] of [['pdf-extract',[fourPages],{pages:'8'}],['pdf-to-word',[protectedPdf],{}],['video-compress',[jpg],{}]]){
    let blocked=false;try{await runTool(id,files,params);}catch(error){blocked=error.fileValidation===true;}
    if(!blocked)throw Error('ENGINE_PREFLIGHT_BYPASSED:'+id);protectedCalls++;
   }
   preflightCases.push({name:'execution-gates-cannot-be-bypassed',blockedEngines:protectedCalls});
   const svg=new File(['<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="red"/></svg>'],'vector.svg',{type:'image/svg+xml'});
   const svgResult=await runTool('image-convert',[svg],{format:'image/png'});
   if(!svgResult.blob||svgResult.blob.type!=='image/png')throw Error('SVG_CONVERSION_REGRESSED');
   preflightCases.push({name:'existing-svg-conversion-preserved',mime:svgResult.blob.type});
   const pdfReport=await assessFileConversions([input],{run:runTool});
   if(!pdfReport.includes('DOCX, PNG, JPG, TXT')||!pdfReport.includes('no conserva imágenes'))throw Error('PDF_ASSESSMENT_INACCURATE');
   const multi=planWithPrismaCore({text:'Extrae la segunda página del PDF y conviértela a Word',files:[input]}).planner;
   if(JSON.stringify(multi.steps.map(s=>s.tool_id))!==JSON.stringify(['pdf-extract','pdf-to-word']))throw Error('PDF_OPERATIONS_LOST');
   let files=[input],last;
   for(const step of multi.steps){last=await runToolBatch(tools.find(t=>t.id===step.tool_id),files,step.params,runTool);files=resultFiles(last);}
   const zip=await JSZip.loadAsync(await last.blob.arrayBuffer()),xml=await zip.file('word/document.xml').async('text');
   if(!xml.includes('SECOND PAGE KEEP 123')||xml.includes('FIRST PAGE')||xml.includes('THIRD PAGE'))throw Error('PDF_WORD_CONTENT_MISMATCH');
   await archive(last.blob,'pagina-seleccionada.docx');
   const plain=new File(['Café, contenido 2026.\nTotal 123.'],'notas.txt',{type:'text/plain'});
   const txtReport=await assessFileConversions([plain],{run:runTool});
   if(!txtReport.includes('DOCX, PDF, TXT, HTML')||!txtReport.includes('Texto UTF-8'))throw Error('TXT_ASSESSMENT_INACCURATE');
   const txtPlan=planFileConversion('Convierte este archivo a PDF',[plain]);
   const generated=await runTool(txtPlan.steps[0].tool_id,[plain],txtPlan.steps[0].params);
   const readback=await runTool('pdf-text',[new File([generated.blob],generated.filename,{type:generated.blob.type})],{});
   if(!readback.text.includes('Café, contenido 2026.')||!readback.text.includes('Total 123.'))throw Error('TXT_PDF_TEXT_MISMATCH');
   await archive(generated.blob,'notas.pdf');
   const ambiguous=planFileConversion('Transforma este archivo',[plain]);
   if(ambiguous.type!=='needs-input'||ambiguous.steps.length)throw Error('AMBIGUOUS_TARGET_EXECUTED');
   const unsupported=planFileConversion('Convierte este archivo a MP3',[input]);
   if(unsupported.type!=='unsupported'||unsupported.steps.length)throw Error('UNSUPPORTED_TARGET_EXECUTED');
   return {cases:[...preflightCases,{name:'pdf-read-only-assessment',reply:pdfReport},{name:'pdf-second-page-to-word',verifiedText:'SECOND PAGE KEEP 123',otherPagesAbsent:true},{name:'txt-assessment-and-pdf-content-readback',reply:txtReport,textPreserved:true},{name:'ambiguous-and-unsupported-requests',noExecution:true}],artifacts};
  });
  report.cases.push(...controls.cases);
  for(const artifact of controls.artifacts)fs.writeFileSync(out+'/'+artifact.name,Buffer.from(artifact.bytes));
  await page.waitForFunction(()=>!document.querySelector('#core-send').disabled);
  await page.locator('#core-file-input').setInputFiles({name:fixture.name,mimeType:fixture.mimeType,buffer});
  const beforeMismatch=await page.locator('.core-result-download').count(),beforeReplies=await page.evaluate(()=>window.testReplies.length);
  await page.locator('#core-input').fill('Convierte este PDF a Word');await page.locator('#core-send').click();
  await page.waitForFunction(n=>!document.querySelector('#core-send').disabled&&window.testReplies.length>n,beforeReplies);
  const mismatchReply=await page.evaluate(()=>window.testReplies.at(-1));
  assert.match(mismatchReply,/Word.*no en PDF/);assert.equal(await page.locator('.core-result-download').count(),beforeMismatch);
  report.cases.push({name:'chat-blocks-source-mismatch',reply:mismatchReply,noNewDownload:true});
  assert.equal(report.apiAttempts.some(x=>x.method==='POST'),false,'local assessment must not dispatch inference');
 }finally{
  fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2));
  await browser.close();await new Promise(r=>server.close(r));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
