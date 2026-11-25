// First-party daily aggregate counters. No visitor IDs, prompts, filenames,
// contents, credentials, URLs or error strings. Preview and tests stay silent.
import {tools} from './registry.js';
const ids=new Set(tools.map(t=>t.id));
const events=new Set(['requested','succeeded','failed','clarification','unresolved','local-plan','provider-attempt','provider-success','provider-failed','queen-plan','queen-verified','queen-verification-pending','queen-failed','download-clicked','copied','print-opened','retry']);
const bounded=(value,max)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(0,Math.round(value))):0;
export function metricEvent(id,event,details={}){
 if((!ids.has(id)&&id!=='core')||!events.has(event))return null;
 return {id,event,duration:bounded(details?.duration,300000),files:bounded(details?.files,100)};
}
export function metricsAllowed(hostname,navigator={}){
 return hostname==='prismaspace.space'&&navigator.doNotTrack!=='1'&&navigator.globalPrivacyControl!==true;
}
let queue=[],timer=null,listening=false;
export function recordCoreMetric(id,event,details={}){
 const item=metricEvent(id,event,details);if(!item)return;
 if(typeof window==='undefined'||!metricsAllowed(window.location.hostname,window.navigator))return;
 if(!listening){
  listening=true;
  window.addEventListener('pagehide',()=>{void flushCoreMetrics();});
  window.document?.addEventListener('visibilitychange',()=>{if(window.document.visibilityState==='hidden')void flushCoreMetrics();});
 }
 queue.push(item);if(queue.length>40)queue.shift();
 if(!timer)timer=setTimeout(()=>{void flushCoreMetrics();},4000);
}
export async function flushCoreMetrics(){
 if(timer)clearTimeout(timer);timer=null;
 if(typeof window==='undefined'||!metricsAllowed(window.location.hostname,window.navigator)){queue=[];return;}
 const batches=[];while(queue.length)batches.push(queue.splice(0,20));
 await Promise.allSettled(batches.map(events=>Promise.resolve().then(()=>fetch('/api/core/metrics',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events}),
  keepalive:true,credentials:'omit',referrerPolicy:'no-referrer'
 }))));
 // No retry: telemetry must never duplicate tasks or interfere with their result.
}
