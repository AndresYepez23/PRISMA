// Browser sends only attachment metadata and relevant procedure references.
// Queen credentials, prompts and upstream URLs exist exclusively in functions/.
export function queenTaskContext(resolvedTask,selection){
 const task=resolvedTask?.task;
 const proceduralKeys=new Set(['format','output','mode','width','height','keep','quality','sheet','language','direction','position','degrees']);
 const procedure=task?.steps?.slice(-8).map(s=>({tool_id:s.tool_id,params:Object.fromEntries(Object.entries(s.params||{}).filter(([k,v])=>proceduralKeys.has(k)&&['number','boolean','string'].includes(typeof v)&&String(v).length<=120))}))||[];
 return {previousGoal:'',procedure,previousTools:task?.steps?.map(s=>s.tool_id).slice(-8)||[],
  preferences:{mode:selection?.mode==='manual'?'manual':'auto',provider:selection?.provider||'',model:selection?.model||''}};
}
// Browser-only circuit breaker. It protects the local fallback from repeated
// long waits when the neural service is rate-limited or temporarily unavailable.
// Never replay a request after an uncertain upstream outcome.
const QUEEN_BACKOFF_MS=30000;
let queenUnavailableUntil=0;
export function queenCircuitState(now=Date.now()){
 return {available:now>=queenUnavailableUntil,retryAfterMs:Math.max(0,queenUnavailableUntil-now)};
}
export function resetQueenCircuitForTests(){queenUnavailableUntil=0;}
export async function requestQueenPlan({text,files=[],context={},repair=false},{fetchImpl=fetch,signal,now=Date.now}={}){
 if(signal?.aborted||!queenCircuitState(now()).available)return null;
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,115000);
 try{
  const response=await fetchImpl('/api/core/plan',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({text,files:files.map(f=>({name:f.name,type:f.type,size:f.size})),context,repair})});
  if(!response.ok){
   // Back off only for transient server and quota errors; 4xx validation errors
   // should not disable Queen for unrelated subsequent user requests.
   if([429,502,503,504].includes(response.status))queenUnavailableUntil=Math.max(queenUnavailableUntil,now()+QUEEN_BACKOFF_MS);
   controller.abort();
   return null;
  }
  const payload=await response.json();
  if(payload?.ok){queenUnavailableUntil=0;return payload;}
  if(payload?.fallback&&['QUEEN_UNAVAILABLE','QUEEN_BUSY','QUEEN_RATE_LIMITED','CORE_BACKEND_UNREACHABLE'].includes(payload.code))
   queenUnavailableUntil=Math.max(queenUnavailableUntil,now()+QUEEN_BACKOFF_MS);
  return null;
 }catch{
  // An aborted/unknown network outcome is not proof of model failure. Never
  // retry automatically or suppress a later explicit user request.
  return null;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

export function queenFailureDescription(error){
 const descriptions={
  EXECUTION_CANCELLED:'La solicitud fue cancelada.',TASK_TIME_BUDGET:'La tarea agotó su límite de tiempo.',
  DEPENDENCY_INCOMPLETE:'Un paso previo no terminó y sus dependencias no se ejecutaron.',
  EXTERNAL_OUTCOME_UNKNOWN:'El resultado de la llamada externa anterior es incierto; no se repetirá automáticamente.',
  EXTERNAL_ACTION_NOT_AUTHORIZED:'La operación externa no tiene autorización.',
  OUTPUT_RESOURCE_BUDGET:'Los resultados superan el presupuesto de memoria de esta tarea.',
  JSON_DATA_MISMATCH:'El JSON producido cambió los datos originales.',
  PDF_PAGE_COUNT_MISMATCH:'El PDF producido no contiene la cantidad de páginas solicitada.',
  PDF_ROTATION_MISMATCH:'La rotación del PDF no coincide con la solicitud.',
  IMAGE_DIMENSIONS_MISMATCH:'Las dimensiones de la imagen no coinciden con la solicitud.',
  INVALID_OFFICE_STRUCTURE:'El documento Office no contiene la estructura requerida.',
  INVALID_ZIP_STRUCTURE:'El archivo comprimido no pasó la comprobación de integridad.',
  ARCHIVE_RESOURCE_BUDGET:'El contenido expandido del archivo excede el presupuesto de memoria.',
  EMPTY_RESULT:'La herramienta no produjo contenido comprobable.',
  EMPTY_ARTIFACT:'La herramienta produjo un archivo vacío.',
  SIZE_TARGET_MISMATCH:'El archivo supera el tamaño solicitado.',
  REPAIR_UNAVAILABLE:'No fue posible obtener una corrección segura de Qwen.',
  UNSAFE_REPAIR:'La corrección propuesta cambia operaciones que requieren otro plan.'
 };
 return descriptions[error?.verificationCode||error?.message]||'La herramienta falló o su resultado no pasó la validación independiente.';
}
