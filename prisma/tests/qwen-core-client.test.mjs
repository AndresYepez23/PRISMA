import test from 'node:test';
import assert from 'node:assert/strict';
import {prioritizeQwenCoreTools,requestQwenCoreInterpretation,resetQwenCoreDisabledForTest,isKnownScannedCsvExcelCandidate} from '../src/qwen-core-client.js';

test('Qwen tool hints only re-rank existing catalog entries',()=>{
 const catalog=[{id:'pdf-to-word',name:'Word'},{id:'pdf-extract',name:'Extract'},{id:'image-rotate',name:'Rotate'}];
 const hint={source:'qwen-core',intent:'tools',tool_ids:['pdf-extract','shell','pdf-to-word']};
 const result=prioritizeQwenCoreTools(catalog,hint);
 assert.deepEqual(result.map(c=>c.id),['pdf-extract','pdf-to-word','image-rotate']);
 assert.equal(prioritizeQwenCoreTools(catalog,null),catalog);
});
test('the browser sends only file metadata, not document bytes or secrets',async()=>{
 resetQwenCoreDisabledForTest();
 let body,method;
 const r=await requestQwenCoreInterpretation({text:'Extrae la página 2 y conviértela a Word',files:[{name:'doc.pdf',type:'application/pdf',size:1000,content:'NEVER_SEND_THIS'}]},{
  fetchImpl:async(_url,options)=>{body=JSON.parse(options.body);method=options.method;
   return new Response(JSON.stringify({ok:true,source:'qwen-core',intent:'tools',tool_ids:['pdf-extract','pdf-to-word']}),{headers:{'Content-Type':'application/json'}});}
 });
 assert.equal(method,'POST');assert.equal(body.files.length,1);
 assert.deepEqual(Object.keys(body.files[0]).sort(),['name','size','type']);
 assert.equal(JSON.stringify(body).includes('NEVER_SEND_THIS'),false);
 assert.deepEqual(r.tool_ids,['pdf-extract','pdf-to-word']);
});
test('a disabled Qwen interpreter uses a bounded cooldown, then can recover without reloading',async()=>{
 resetQwenCoreDisabledForTest();let called=0,clock=1000;
 const opts={now:()=>clock,fetchImpl:async()=>{called++;return new Response(JSON.stringify({ok:false,available:false,fallback:true}),{status:200});}};
 assert.equal(await requestQwenCoreInterpretation({text:'Revisa este PDF'},opts),null);
 assert.equal(await requestQwenCoreInterpretation({text:'Otra petición'},opts),null);
 assert.equal(called,1);
 clock+=30001;
 assert.equal(await requestQwenCoreInterpretation({text:'Revisa un nuevo PDF'},opts),null);
 assert.equal(called,2);resetQwenCoreDisabledForTest();
});
test('transient interpreter failures back off without automatic retries',async()=>{
 resetQwenCoreDisabledForTest();let called=0,clock=5000;
 const opts={now:()=>clock,fetchImpl:async()=>{called++;return new Response('',{status:503});}};
 assert.equal(await requestQwenCoreInterpretation({text:'Extrae páginas'},opts),null);
 assert.equal(await requestQwenCoreInterpretation({text:'Otra extracción'},opts),null);
 assert.equal(called,1);
 clock+=30001;
 assert.equal(await requestQwenCoreInterpretation({text:'Nueva tarea'},opts),null);
 assert.equal(called,2);resetQwenCoreDisabledForTest();
});
test('Qwen may return up to eight grounded tool IDs but never more',async()=>{
 resetQwenCoreDisabledForTest();
 const ids=['pdf-extract','image-ocr','text-replace','csv-json','json-xlsx','file-verify','file-rename','zip-create'];
 const accepted=await requestQwenCoreInterpretation({text:'Organiza esta cadena de herramientas'},{fetchImpl:async()=>new Response(JSON.stringify({ok:true,source:'qwen-core',intent:'tools',tool_ids:ids}))});
 assert.deepEqual(accepted.tool_ids,ids);
 const rejected=await requestQwenCoreInterpretation({text:'Una cadena demasiado larga'},{fetchImpl:async()=>new Response(JSON.stringify({ok:true,source:'qwen-core',intent:'tools',tool_ids:[...ids,'shell']}))});
 assert.equal(rejected,null);
});
test('an uncertain network outcome is not automatically replayed',async()=>{
 resetQwenCoreDisabledForTest();let called=0;
 const result=await requestQwenCoreInterpretation({text:'Interpreta este archivo'},{fetchImpl:async()=>{called++;throw Error('connection reset');}});
 assert.equal(result,null);assert.equal(called,1);
});

test('the scanned-CSV candidate is restricted to stated PDF/CSV/Excel semantics; it does not open general neural planning',()=>{
 const text='Convierte el PDF escaneado adjunto en un Excel. El escaneo contiene texto CSV con encabezados. Reconoce el texto en inglés; elimina los espacios después de las comas.';
 const file={name:'escaneo.pdf',type:'application/pdf',size:2048};
 assert.equal(isKnownScannedCsvExcelCandidate(text,[file]),true);
 assert.equal(isKnownScannedCsvExcelCandidate(text,[file,file]),false);
 assert.equal(isKnownScannedCsvExcelCandidate(text.replace('texto CSV','tabla libre'),[file]),false);
 assert.equal(isKnownScannedCsvExcelCandidate(text+' Envíalo por correo.',[file]),false);
 assert.equal(isKnownScannedCsvExcelCandidate(text,[{...file,type:'image/png'}]),false);
});
