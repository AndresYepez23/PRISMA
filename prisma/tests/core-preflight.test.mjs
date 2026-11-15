import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateFileRequest,validateFileToolInputs,inspectExecutionFile,fileValidationError} from '../src/file-inspection.js';
import {tools} from '../src/registry.js';
import {runTool} from '../src/engines.js';
import {createTaskMemory} from '../src/core-task-memory.js';
import {validateQueenPlan} from '../src/queen-plan.js';
import {executeQueenDAG} from '../src/queen-execution.js';
import {runToolBatch} from '../src/core-execution.js';
import {requestQwenCoreInterpretation,resetQwenCoreDisabledForTest,prioritizeQwenCoreTools} from '../src/qwen-core-client.js';

const mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const file=(name='doc.pdf',type='application/pdf')=>new File(['synthetic'],name,{type});
// These unit inspectors are explicit doubles. The functional Chromium suite
// separately parses real DOCX/PDF/image bytes, including encrypted PDF input.
const options=(evidence={kind:'pdf',pages:4,readable:true,hasSelectableText:true})=>({tools,inspect:async()=>evidence});
const tool=id=>tools.find(t=>t.id===id);
const proposal=steps=>({intent:'execute',message:'Plan preparado.',steps});
const step=(id,tool_id,params={},inputs=[],dependsOn=[])=>({id,tool_id,params,inputs,dependsOn});

test('PDF requested with real Word input is clarified before any converter',async()=>{
 const doc=new File([fs.readFileSync(new URL('fixtures/conversion.docx',import.meta.url))],'doc.docx',{type:mime});
 const r=await validateFileRequest('Convierte este PDF a Word',[doc],{inspect:f=>runTool('file-inspector',[f],{})});
 assert.equal(r.code,'SOURCE_CONTRADICTION');assert.match(r.message,/Word.*no en PDF/);
});
test('Word source requested with PDF input is not treated as an ordinary target conversion',async()=>{
 assert.equal((await validateFileRequest('Convierte este Word a PDF',[file()],options())).code,'SOURCE_CONTRADICTION');
});
test('page eight of a four-page document gives a grounded range and no execution',async()=>{
 const r=await validateFileRequest('Extrae la página 8 de este PDF',[file()],options());
 assert.equal(r.code,'PAGE_RANGE');assert.match(r.message,/4 páginas.*8.*1 y la 4/);
 await assert.rejects(validateFileToolInputs(tool('pdf-extract'),[file()],{pages:'2,8'},options()),e=>e.code==='PAGE_RANGE');
});
test('missing input and exactly three requested files are distinct clarifications',async()=>{
 assert.equal((await validateFileRequest('Convierte este PDF a Word',[],options())).code,'MISSING_FILE');
 const r=await validateFileRequest('Une estos tres PDF',[file(),file()],options());
 assert.equal(r.code,'FILE_COUNT');assert.match(r.message,/Adjunta 1 más/);
});
test('video requested with a photo is blocked without opening a compression engine',async()=>{
 const r=await validateFileRequest('Comprime este video',[file('foto.jpg','image/jpeg')],options({kind:'image',readable:true}));
 assert.equal(r.code,'SOURCE_CONTRADICTION');
 await assert.rejects(validateFileToolInputs(tool('video-compress'),[file('foto.jpg','image/jpeg')],{},options({kind:'image'})),e=>e.code==='INCOMPATIBLE_FILE');
});
test('unreadable, empty and mislabeled files do not authorize a tool',async()=>{
 assert.equal((await validateFileRequest('Convierte este PDF a Word',[file()],options({kind:'pdf',readable:false}))).code,'UNREADABLE_FILE');
 await assert.rejects(inspectExecutionFile(new File([],'vacio.pdf'),async()=>({kind:'pdf'})),e=>e.code==='EMPTY_FILE');
 const r=await validateFileRequest('Convierte este PDF a Word',[file()],options({kind:'docx'}));assert.equal(r.code,'FORMAT_MISMATCH');
 const unreadable={name:'a.pdf',type:'application/pdf',size:12,slice:()=>{throw Error('read failure');}};
 await assert.rejects(inspectExecutionFile(unreadable,async f=>f.slice()),e=>e.code==='UNREADABLE_FILE');
});
test('protected documents explain the supported authorization path and never bypass it',async()=>{
 const r=await validateFileRequest('Convierte este PDF protegido a Word',[file()],options({kind:'pdf',requiresPassword:true}));
 assert.equal(r.code,'PROTECTED_FILE');assert.match(r.message,/copia autorizada/);
});
test('scanned PDF to Excel asks for OCR and grounded columns without promising perfect extraction',async()=>{
 const r=await validateFileRequest('Convierte este archivo a Excel',[file()],options({kind:'pdf',pages:1,hasSelectableText:false}));
 assert.equal(r.code,'OCR_REQUIRED');assert.match(r.message,/OCR.*columnas.*errores/);
 const missing=await validateFileRequest('Convierte este archivo a Excel',[file()],{...options({kind:'pdf',hasSelectableText:false}),tools:[]});
 assert.match(missing.message,/No hay un motor OCR disponible/);
});
test('registry availability and existing batch limits are checked before engines',async()=>{
 await assert.rejects(validateFileToolInputs(null,[file()],{},options()),e=>e.code==='TOOL_UNAVAILABLE');
 await assert.rejects(validateFileToolInputs({...tool('pdf-merge'),status:'planned'},[file()],{},options()),e=>e.code==='TOOL_UNAVAILABLE');
 await assert.rejects(validateFileToolInputs(tool('pdf-merge'),[file()],{},options()),e=>e.code==='FILE_COUNT');
 await assert.rejects(validateFileToolInputs({...tool('pdf-merge'),maxFiles:2},[file(),file(),file()],{},options()),e=>e.code==='FILE_COUNT');
 const huge={size:101*1024*1024,name:'grande.mp4',slice(){}};
 await assert.rejects(inspectExecutionFile(huge,async()=>({kind:'video'})),e=>e.code==='FILE_SIZE_LIMIT');
});
test('a valid file is inspected once across request and execution checks',async()=>{
 let calls=0;const input=file(),opts={tools,inspect:async()=>{calls++;return {kind:'pdf',pages:4};}};
 assert.equal((await validateFileRequest('Extrae la página 2 del PDF',[input],opts)).ok,true);
 await validateFileToolInputs(tool('pdf-extract'),[input],{pages:'2'},opts);assert.equal(calls,1);
});
test('new requests and new files cannot inherit a completed conversion',()=>{
 const memory=createTaskMemory(),old=file(),next=file('otro.pdf');
 memory.save('chat',{files:[old],steps:[{tool_id:'pdf-to-word',params:{}}]});
 assert.equal(memory.resolve('chat','Ahora calcula 2+2').task,null);
 memory.save('chat',{files:[old],steps:[{tool_id:'pdf-to-word',params:{}}]});
 const r=memory.resolve('chat','Ahora extrae la página 2',[next]);assert.equal(r.task,null);assert.deepEqual(r.files,[next]);
});
test('replacement uploads ask once before resuming a pending operation',()=>{
 const memory=createTaskMemory(),old=file(),next=file('nuevo.pdf');memory.wait('chat','Convierte el PDF a Word',[old]);
 const replaced=memory.resolve('chat','Aquí',[next]);assert.match(replaced.clarification,/archivo diferente/);assert.equal(replaced.request,undefined);
 const confirmed=memory.resolve('chat','Sí');assert.equal(confirmed.request,'Convierte el PDF a Word');assert.deepEqual(confirmed.files,[next]);
 memory.wait('chat','Convierte el PDF a Word',[old]);
 assert.equal(memory.resolve('chat','Aquí está el archivo, cuenta sus páginas',[next]).request,undefined);
});
test('page corrections replace the rejected range and completing a file set is not a replacement',()=>{
 const memory=createTaskMemory(),a=file(),b=file('b.pdf'),c=file('c.pdf');
 memory.wait('chat','Extrae la página 8 de este PDF',[a]);
 assert.equal(memory.resolve('chat','2').request,'Extrae la página 2 de este PDF');
 memory.wait('chat','Une estos tres PDF',[a,b]);
 const complete=memory.resolve('chat','Adjunto',[a,b,c]);assert.equal(complete.clarification,undefined);assert.match(complete.request,/Une estos tres PDF/);
});
test('unknown tools and provably incompatible dependent plans are rejected before execution',()=>{
 assert.throws(()=>validateQueenPlan(proposal([step('s1','invented-tool')])),/UNKNOWN_TOOL/);
 assert.throws(()=>validateQueenPlan(proposal([step('s1','pdf-to-word',{},['file:0']),step('s2','pdf-extract',{pages:'1'},['step:s1'],['s1'])]),{files:[file()]}),/INCOMPATIBLE_DEPENDENCY/);
});
test('valid multi-tool JSON plans execute through existing validators and preserve data',async()=>{
 const p=validateQueenPlan(proposal([step('s1','json-format',{text:'{"a":2}'}),step('s2','json-minify',{},['step:s1'],['s1'])]));
 const r=await executeQueenDAG(p,[],{run:runTool,initialInferences:0});assert.equal(r.verified,true);assert.equal(r.results.at(-1).result.text,'{"a":2}');
});
test('partial results survive a later failure and corrupt or empty results are rejected',async()=>{
 let calls=0;
 const first=new File(['first'],'a.txt',{type:'text/plain'}),second=new File(['second'],'b.txt',{type:'text/plain'});
 await assert.rejects(runToolBatch({id:'text-file-convert',name:'Texto',status:'ready',file:true,accept:'.txt'},[first,second],{},async()=>{
  if(++calls===2)throw Error('temporary engine failure');return {blob:new Blob(['first'],{type:'text/plain'}),filename:'ok.txt'};
 }),e=>e.partialResults.length===1&&e.partialResults[0].filename==='ok.txt');
 for(const bytes of ['', 'not a PDF'])await assert.rejects(runToolBatch(tool('pdf-extract'),[file()],{pages:'1'},async()=>({blob:new Blob([bytes],{type:'application/pdf'}),filename:'wrong.pdf'})),/vacío|firma|PDF|formato/i);
});
test('a file validation failure cannot consume a Queen repair inference',async()=>{
 const p=validateQueenPlan(proposal([step('s1','pdf-extract',{pages:'8'},['file:0'])]),{files:[file()]});let repairs=0;
 await assert.rejects(executeQueenDAG(p,[file()],{run:async()=>{throw fileValidationError('PAGE_RANGE','Solo hay cuatro páginas.');},repair:async()=>{repairs++;}}),/cuatro páginas/);
 assert.equal(repairs,0);
});
test('simple questions, greetings and arithmetic do not dispatch Qwen',async()=>{
 resetQwenCoreDisabledForTest();let calls=0;
 for(const text of ['Hola','2+2','¿Cómo puedo convertir un PDF a Word?'])assert.equal(await requestQwenCoreInterpretation({text},{fetchImpl:async()=>{calls++;throw Error();}}),null);
 assert.equal(calls,0);
});
test('invalid and unavailable Qwen responses fall back without replaying the request',async()=>{
 for(const response of [()=>new Response('not JSON'),()=>Response.json({ok:true,source:'qwen-core',intent:'tools',tool_ids:['invented-tool']}),()=>new Response('',{status:503})]){
  resetQwenCoreDisabledForTest();let calls=0;
  const options={fetchImpl:async()=>{calls++;return response();}};
  assert.equal(await requestQwenCoreInterpretation({text:'Interpreta la secuencia'},options),null);
  assert.equal(await requestQwenCoreInterpretation({text:'Interpreta la secuencia'},options),null);assert.equal(calls,1);
 }
});
test('concurrent identical interpretations share one request without changing providers',async()=>{
 resetQwenCoreDisabledForTest();let calls=0,release;const wait=new Promise(r=>release=r);
 const options={fetchImpl:async()=>{calls++;await wait;return Response.json({ok:true,source:'qwen-core',intent:'tools',tool_ids:['pdf-extract'],provider:'must-not-propagate'});}};
 const input={text:'Extrae una página',files:[file()]},a=requestQwenCoreInterpretation(input,options),b=requestQwenCoreInterpretation(input,options);release();
 const [x,y]=await Promise.all([a,b]);assert.equal(calls,1);assert.deepEqual(x,y);assert.equal(x.provider,undefined);
 const catalog=[{id:'pdf-extract',provider:'existing',quota:7}];assert.equal(prioritizeQwenCoreTools(catalog,{...x,tool_ids:['invented-tool']}),catalog);
});
test('an exhausted Qwen timeout returns to Core after one attempt',async()=>{
 resetQwenCoreDisabledForTest();let calls=0;
 const hint=await requestQwenCoreInterpretation({text:'Interpreta esta tarea compleja'},{timeoutMs:1,fetchImpl:async(_url,{signal})=>{calls++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout'))));}});
 assert.equal(hint,null);assert.equal(calls,1);
});
