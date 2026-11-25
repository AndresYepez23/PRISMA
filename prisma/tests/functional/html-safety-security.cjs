const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 const sheetUrl='https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
 const sheetFile=process.env.PRISMA_SHEETJS_FIXTURE;
 const sheetSource=sheetFile?fs.readFileSync(sheetFile):execFileSync('curl',['--fail','--silent','--show-error','--location','--max-time','60',sheetUrl],{maxBuffer:2*1024*1024});
 const browser=await chromium.launch({executablePath:process.env.PRISMA_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.route(sheetUrl,route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:sheetSource}));
  await page.route('https://security.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1);
   if(!/^[a-z0-9-]+\.js$/.test(name))return route.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'});
   return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'../../src',name),'utf8')});
  });
  await page.goto('https://security.test/');
  const result=await page.evaluate(async()=>{
   const {sanitizeDocumentHtml}=await import('/html-safety.js');
   const {renderMarkdownSafe}=await import('/core-markdown.js');
   const attacks=[
    '<script>window.pwned=1</script><img src=x onerror="window.pwned=1">',
    '<svg><a href="javascript:window.pwned=1">x</a></svg><math><mtext><img src=x onerror="window.pwned=1"></mtext></math>',
    '<a href="jav&#x61;script:window.pwned=1">bad</a><a href="java&#10;script:window.pwned=1">bad</a>',
    '<iframe srcdoc="<script>parent.pwned=1</script>"></iframe><form action="https://evil.test"><input></form>',
    '<img src="data:image/svg+xml;base64,PHN2Zz4=" onload="window.pwned=1"><p style="background:url(https://evil.test)">text</p>',
    '<base href="https://evil.test"><object data="https://evil.test"></object><a href="data:text/html,test">bad</a>'
   ];
   const host=document.createElement('div');document.body.append(host);
   host.innerHTML=attacks.map(sanitizeDocumentHtml).join('')+renderMarkdownSafe('<img src=x onerror="window.pwned=1">\n[x](javascript:alert(1))\n[ok](https://example.com)');
   await new Promise(r=>setTimeout(r,30));
   return {pwned:!!window.pwned,danger:host.querySelectorAll('script,iframe,svg,math,object,form,input,base,[onerror],[onload],[style]').length,
    unsafeLinks:[...host.querySelectorAll('a[href]')].filter(a=>!['https:','http:','mailto:'].includes(a.protocol)).length,
    good:sanitizeDocumentHtml('<p>Hello <strong>world</strong></p><a href="https://example.com">safe</a><table><tr><td colspan="2">cell</td></tr></table>'),
    externalRel:host.querySelector('a[target="_blank"]')?.rel};
  });
  assert.equal(result.pwned,false);assert.equal(result.danger,0);assert.equal(result.unsafeLinks,0);
  assert.match(result.good,/<strong>world<\/strong>/);assert.match(result.good,/colspan="2"/);
  assert.equal(result.externalRel,'noopener noreferrer');
  console.log('PASS: document HTML and Core Markdown attack corpus in Chromium; legitimate formatting preserved');
  const spreadsheet=await page.evaluate(async url=>{
   const XLSX=await import(url),{runTool}=await import('/engines.js');
   const rows=[{name:'Prisma',amount:42},{name:'Árbol',amount:3}];
   const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(rows),'Datos');
   const bytes=XLSX.write(book,{type:'array',bookType:'xlsx'});
   const file=new File([bytes],'fixture.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
   const result=await runTool('excel-json',[file],{sheet:'0',format:'json'});
   return {version:XLSX.version,rows:JSON.parse(result.text)};
  },sheetUrl);
  assert.equal(spreadsheet.version,'0.20.3');
  assert.deepEqual(spreadsheet.rows,[{name:'Prisma',amount:42},{name:'Árbol',amount:3}]);
  console.log('PASS: corrected SheetJS 0.20.3 writes XLSX and Prisma excel-json reads exact cells in Chromium');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
