// Shared directed checks for the form definitions and local conversion engines.
const assert=require('node:assert/strict');
async function verifyToolControls(page){
 const external=[];
 const watch=request=>{if(!request.url().startsWith(new URL(page.url()).origin+'/'))external.push(request.url());};
 page.on('request',watch);
 try{
  const result=await page.evaluate(async()=>{
   const {renderToolFields}=await import('/src/tool-fields.js');
   const {runTool}=await import('/src/engines.js');
   const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
   const factories={
    field:(label,name,type='text',value='',hint='',extra='')=>'<label>'+esc(label)+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label><small>'+esc(hint)+'</small>',
    textareaField:(label,name,value='',hint='')=>'<label>'+esc(label)+'<textarea name="'+name+'">'+esc(value)+'</textarea></label><small>'+esc(hint)+'</small>',
    selectField:(label,name,options,value,hint='')=>'<label>'+esc(label)+'<select name="'+name+'">'+options.map(([key,label])=>'<option value="'+esc(key)+'" '+(key===value?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label><small>'+esc(hint)+'</small>'
   };
   const form=document.createElement('form');form.id='seo-tool-controls';document.body.append(form);
   const results={labels:{},reading:[],csv:[],html:{}};
   const render=async(id,expected)=>{
    window.prismaI18n.setLanguage('es',{persist:false});
    form.innerHTML=renderToolFields({id},factories);
    const spanish=form.querySelector('label').firstChild.textContent;
    window.prismaI18n.setLanguage('en',{persist:false});
    const english=form.querySelector('label').firstChild.textContent;
    results.labels[id]={spanish,english,names:[...form.querySelectorAll('[name]')].map(el=>el.name)};
    if(english!==expected)throw Error(id+' English field: '+english);
   };
   const params=()=>Object.fromEntries(new FormData(form));
   await render('reading-time-local','Text for reading time');
   form.elements.text.value=Array(220).fill('word').join(' ');
   for(const pace of ['220','400']){form.elements.wpm.value=pace;results.reading.push((await runTool('reading-time-local',[],params())).text);}
   await render('json-format','JSON content');
   form.elements.text.value='{"id":1,"name":"Prisma"}';form.elements.indent.value='tab';
   results.json=(await runTool('json-format',[],params())).text;
   for(const id of ['csv-to-tsv-local','tsv-to-csv-local']){
    await render(id,'CSV or TSV data');
    form.elements.mode.value='csv-to-tsv';form.elements.delimiter.value=';';
    form.elements.text.value='name;note\n"Ana; Jr.";"two\nlines and ""quotes"""';
    const tsv=await runTool(id,[],params());
    form.elements.mode.value='tsv-to-csv';form.elements.text.value=tsv.text;
    const csv=await runTool(id,[],params());
    results.csv.push({id,tsv:tsv.text,csv:csv.text,filename:csv.filename,download:await csv.blob.text()});
   }
   await render('html-to-markdown-local','HTML fragment');
   form.elements.text.value='<h1>Title</h1><p>Hello <strong>Prisma</strong>. <a href="https://example.com/a(b)">Reference</a></p><ul><li>First</li><li>Second</li></ul><script>window.__seoScriptRan=true</script><style>secret-style</style><img src="https://seo-test.invalid/image.png"><iframe src="https://seo-test.invalid/frame"></iframe><a href="java&#x0A;script:alert(1)">Unsafe</a><a href="data:text/html,bad">Data</a>';
   results.html.markdown=(await runTool('html-to-markdown-local',[],params())).text;
   results.html.scriptRan=Boolean(window.__seoScriptRan);
   try{await runTool('html-to-markdown-local',[],{text:'x'.repeat(200001)});results.html.limit=false;}catch{results.html.limit=true;}
   results.html.templateLive=document.querySelectorAll('img[src*="seo-test.invalid"],iframe[src*="seo-test.invalid"]').length;
   form.remove();return results;
  });
  assert.match(result.reading[0],/1 min 0 s/);assert.match(result.reading[1],/33 segundos/);
  assert.equal(result.json,'{\n\t"id": 1,\n\t"name": "Prisma"\n}');
  for(const row of result.csv){
   assert.equal(row.tsv,'name\tnote\nAna; Jr.\t"two\nlines and ""quotes"""');
   assert.equal(row.csv,'name;note\n"Ana; Jr.";"two\nlines and ""quotes"""');
   assert.equal(row.download,row.csv);assert.equal(row.filename,'prisma-tabla.csv');
  }
  assert.match(result.html.markdown,/# Title\n\nHello \*\*Prisma\*\*/);
  assert.match(result.html.markdown,/\[Reference\]\(https:\/\/example\.com\/a%28b%29\)/);
  assert.match(result.html.markdown,/- First\n- Second/);
  assert.doesNotMatch(result.html.markdown,/script|secret-style|seo-test|javascript:|data:text/);
  assert.equal(result.html.scriptRan,false);assert.equal(result.html.templateLive,0);assert.equal(result.html.limit,true);
  // Let queued resource fetches surface before asserting the fragment stayed inert.
  await page.waitForTimeout(100);
  assert.deepEqual(external,[],'HTML conversion initiated an external resource request');
  for(const fields of Object.values(result.labels))assert.notEqual(fields.spanish,fields.english);
  return result;
 }finally{page.off('request',watch);}
}
module.exports={verifyToolControls};

if(require.main===module){
 const {chromium}=require('playwright');
 const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
 const root=path.resolve(__dirname,'../..');
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/controls.html'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><html lang="es"><head><title>Controls</title></head><body><script type="module" src="/src/i18n.js"></script></body></html>');return;
  }
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+'/')||!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/plain');fs.createReadStream(file).pipe(res);
 });
 (async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.PRISMA_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
   const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/controls.html');
   await page.waitForFunction(()=>Boolean(window.prismaI18n));
   const results=await verifyToolControls(page);console.log(JSON.stringify({ok:true,realBrowser:true,externalRequests:false,results},null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 })().catch(error=>{console.error(error);process.exitCode=1;server.close();});
}
