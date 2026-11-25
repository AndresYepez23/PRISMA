import {toolProgress} from './tool-feedback.js';
const phaseFor=status=>({
 'loading tesseract core':'ocr-engine','initializing tesseract':'ocr-engine',
 'loading language traineddata':'ocr-language','initializing api':'ocr-initialize',
 'recognizing text':'ocr-recognize'
}[status]);

// Tesseract v5 passes real stage progress through logger. Its startup error
// callback also needs to reject our wait: some initialization failures leave
// createWorker pending. A late worker is terminated if startup was abandoned.
export async function recognizeLocalImage(file,language,onProgress,createWorker){
 let worker,abandoned=false,rejectStartup;
 const failed=new Promise((_,reject)=>{rejectStartup=reject;});
 const report=(phase,fraction)=>{const detail={phase,...(Number.isFinite(fraction)?{fraction}:{})};onProgress?.(.15,toolProgress(null,'',detail).text,detail);};
 report('ocr-engine');
 const pending=Promise.resolve().then(()=>createWorker(language||'spa',1,{
  logger:entry=>{const phase=phaseFor(entry.status);if(phase&&!abandoned)report(phase,entry.progress);},
  errorHandler:error=>rejectStartup(error instanceof Error?error:Error(String(error)))
 }));
 try{
  worker=await Promise.race([pending,failed]);
  report('ocr-recognize');
  const result=await worker.recognize(file);
  if(!String(result.data.text||'').trim())throw Object.assign(Error('OCR found no text'),{code:'OCR_NO_TEXT'});
  return {text:result.data.text,summary:'Confianza estimada: '+Math.round(result.data.confidence)+'%'};
 }catch(cause){
  abandoned=true;
  if(cause?.code==='OCR_NO_TEXT')throw cause;
  if(!worker)void pending.then(value=>value.terminate()).catch(()=>{});
  throw Object.assign(Error(worker?'OCR recognition failed':'Local OCR model could not load',{cause}),{code:worker?'OCR_RECOGNITION_FAILED':'LOCAL_MODEL_LOAD_FAILED'});
 }finally{
  if(worker)try{await worker.terminate();}catch{/* Cleanup cannot replace the result or the original failure. */}
 }
}
