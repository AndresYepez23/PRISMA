// The browser never receives Qwen's credentials or a tool-execution command.
// Hints only re-rank EXISTING catalog entries; Core still plans and validates.
// Client-side prefilter only; the server owns the stricter workflow match
// and validates every operation before dispatch.
export function isKnownScannedCsvExcelCandidate(text,files=[]){
 if(!Array.isArray(files)||files.length!==1||
    files[0]?.type!=='application/pdf'||!Number.isFinite(files[0]?.size)||
    files[0].size>50*1024*1024)return false;
 const q=String(text||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return /\bpdf\b/.test(q)&&/\b(?:escanead[oa]|escaneo)\b/.test(q)&&
  /\bcsv\b/.test(q)&&/\bencabezados?\b/.test(q)&&/\b(?:excel|xlsx)\b/.test(q)&&
  /\b(?:reconoce|reconocer|ocr)\b/.test(q)&&/\b(?:ingles|english)\b/.test(q)&&
  /\bespacios?\b/.test(q)&&/\bcomas?\b/.test(q)&&
  !/\b(?:envi\w*|public\w*|sub\w*|borr\w*|firm\w*|traduc\w*)\b/.test(q);
}
const QWEN_CORE_BACKOFF_MS=30000;
let unavailableUntil=0;
export function prioritizeQwenCoreTools(catalog,hint){
 if(!Array.isArray(catalog))return [];
 if(hint?.source!=='qwen-core'||hint?.intent!=='tools'||!Array.isArray(hint.tool_ids))return catalog;
 const chosen=[...new Set(hint.tool_ids)].filter(id=>typeof id==='string');
 const indexed=new Map(catalog.map(c=>[c.id,c]));
 return [...chosen.filter(id=>indexed.has(id)).map(id=>indexed.get(id)),...catalog.filter(c=>!chosen.includes(c.id))];
}
export async function requestQwenCoreInterpretation({text,files=[]},{fetchImpl=fetch,signal,timeoutMs=30500,now=Date.now}={}){
 if(signal?.aborted||now()<unavailableUntil)return null;
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,Math.min(30500,Math.max(500,timeoutMs)));
 try{
  const response=await fetchImpl('/api/core/qwen-interpret',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({text:String(text||'').slice(0,4000),files:files.slice(0,20).map(f=>({name:String(f.name||'').slice(0,180),type:String(f.type||'').slice(0,120),size:Number(f.size)||0}))})});
  if(!response.ok){
   if([429,500,502,503,504].includes(response.status))unavailableUntil=Math.max(unavailableUntil,now()+QWEN_CORE_BACKOFF_MS);
   controller.abort();return null;
  }
  const payload=await response.json();
  if(payload?.available===false){unavailableUntil=Math.max(unavailableUntil,now()+QWEN_CORE_BACKOFF_MS);return null;}
  if(payload?.ok!==true||payload.source!=='qwen-core'||!['tools','question','clarify'].includes(payload.intent)||
   !Array.isArray(payload.tool_ids)||payload.tool_ids.length>8||payload.tool_ids.some(id=>typeof id!=='string'))return null;
  unavailableUntil=0;
  return {source:'qwen-core',intent:payload.intent,tool_ids:payload.tool_ids,metrics:payload.metrics||null};
 }catch{
  // Do not replay an uncertain request. A short local backoff lets the existing
  // provider/local planner continue without immediately queueing another Qwen call.
  if(!signal?.aborted)unavailableUntil=Math.max(unavailableUntil,now()+QWEN_CORE_BACKOFF_MS);
  return null;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function resetQwenCoreDisabledForTest(){unavailableUntil=0;}
