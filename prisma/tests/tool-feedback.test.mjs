import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeLocalImage} from '../src/local-ocr.js';
import {toolProgress,toolFailure} from '../src/tool-feedback.js';

test('OCR uses real language/recognition progress and terminates workers on success and failure',async()=>{
 for(const fail of [false,true]){
  let terminated=0;const reports=[];const source={name:'private-image.png'};
  const create=async(language,oem,options)=>{
   assert.equal(language,'eng');assert.equal(oem,1);
   options.logger({status:'loading language traineddata',progress:.25});
   return {recognize:async file=>{assert.equal(file,source);options.logger({status:'recognizing text',progress:.8});if(fail)throw Error('private engine detail');return {data:{text:'PRISMA 42',confidence:96.2}};},terminate:async()=>{terminated++;}};
  };
  const operation=recognizeLocalImage(source,'eng',(...args)=>reports.push(args),create);
  if(fail)await assert.rejects(operation,{code:'OCR_RECOGNITION_FAILED'});else assert.equal((await operation).text,'PRISMA 42');
  assert.equal(terminated,1);assert.ok(reports.some(([, ,detail])=>detail.phase==='ocr-language'&&detail.fraction===.25));
  assert.equal(toolProgress(...reports.find(([, ,detail])=>detail.fraction===.25),'en').text,'Loading language data… 25%');
 }
});
test('startup callback failures release the UI wait and clean up a late worker',async()=>{
 let resolveWorker,terminated=0;
 await assert.rejects(recognizeLocalImage({},'spa',()=>{},(_language,_oem,options)=>{options.errorHandler('model unavailable');return new Promise(resolve=>{resolveWorker=resolve;});}),{code:'LOCAL_MODEL_LOAD_FAILED'});
 resolveWorker({terminate:async()=>{terminated++;}});await new Promise(resolve=>setImmediate(resolve));assert.equal(terminated,1);
});
test('stage progress remains indeterminate until measured; offline guidance never masks validation errors',()=>{
 assert.deepEqual(toolProgress(.1,'',{phase:'local-model'},'en'),{text:'Loading the model on your device…',fraction:null});
 assert.equal(toolProgress(.1,'',{phase:'ocr-recognize',fraction:1.5},'es').fraction,1);
 assert.match(toolFailure({code:'LOCAL_MODEL_LOAD_FAILED'},'en',false).text,/Reconnect/);
 assert.equal(toolFailure(Error('Invalid JSON'),'en',false).text,'Invalid JSON');
 assert.equal(toolFailure({code:'OCR_RECOGNITION_FAILED'},'es').retry,true);
 assert.equal(toolFailure(Error('Failed to fetch dynamically imported module'),'en').reload,true);
});

test('an empty OCR result is actionable and is never reported as successful text extraction',async()=>{
 let cleaned=false;await assert.rejects(recognizeLocalImage({},'eng',()=>{},async()=>({recognize:async()=>({data:{text:'  ',confidence:0}}),terminate:async()=>{cleaned=true;}})),{code:'OCR_NO_TEXT'});
 assert.equal(cleaned,true);assert.match(toolFailure({code:'OCR_NO_TEXT'},'en').text,/selected language/);
});
