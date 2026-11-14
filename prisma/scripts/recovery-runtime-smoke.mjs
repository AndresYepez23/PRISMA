// Read-only external verification. Never fetches or prints secret values.
// The public provider-status endpoint exposes only aggregate credential slots.
const sites = [
  ['known-good','https://17a6c338.prismaspace.pages.dev'],
  ['historically-broken','https://dc242fc1.prismaspace.pages.dev'],
  ['recovery-preview','https://301e0e0f.prismaspace.pages.dev'],
  ['new-production','https://6e921ffb.prismaspace.pages.dev']
];
async function inventory(label, origin) {
  const response=await fetch(origin+'/api/providers/status',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error(label+': status HTTP '+response.status);
  const data=await response.json();
  if(data.ok!==true||!data.credentialSlots)throw new Error(label+': malformed status');
  const counts=Object.fromEntries(Object.entries(data.credentialSlots).map(([name,info])=>[name,Number(info?.count)||0]));
  return {label,origin,externalCount:Object.values(counts).reduce((a,b)=>a+b,0),
    counts,tavily:Number(data.research?.tavily?.configuredKeys)||0,
    jina:Boolean(data.research?.jina?.configured),
    cloudflare:Boolean(data.configured?.cloudflare),
    d1:Boolean(data.protection?.d1RateLimiting)};
}
const [good,broken,preview,current]=await Promise.all(sites.map(async([label,url])=>{try{return await inventory(label,url)}catch(e){return {label,error:String(e.message||e)}}}));
for(const item of [good,broken,preview,current])console.log(JSON.stringify(item));
if(good.error||good.externalCount===0||good.tavily===0||!good.jina||!good.cloudflare||!good.d1)
  throw new Error('KNOWN_GOOD_BASELINE_INVALID; do not publish recovery code to production');
if(preview.error)throw new Error('RECOVERY_PREVIEW_NOT_REACHABLE');
if(current.error||current.externalCount<good.externalCount||current.tavily<good.tavily||!current.jina||!current.cloudflare||!current.d1)throw new Error('NEW_PRODUCTION_CREDENTIALS_NOT_READY; ROLLBACK_REQUIRED');
if(process.env.ONE_QWEN_PROBE==='1') {
  // Exactly one user-authorized Qwen inference, sent to the working immutable deployment.
  // Does not create files or execute tools; responses and keys are not logged.
  const origin=sites[3][1], started=Date.now();
  const res=await fetch(origin+'/api/core/plan',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({text:'¿Qué puede hacer Prisma Core con un archivo PDF? Responde como pregunta, sin ejecutar herramientas.',files:[]}),
    signal:AbortSignal.timeout(95000)
  });
  const body=await res.json().catch(()=>({ok:false,code:'INVALID_JSON'}));
  const outcome={httpStatus:res.status,ok:body.ok===true,code:body.code||null,
    source:body.source||null,intent:body.plan?.intent||null,
    inferences:Number(body.metrics?.inferences)||0,durationMs:Date.now()-started};
  console.log('QWEN_ONE_SHOT '+JSON.stringify(outcome));
  if(!res.ok||!outcome.ok||outcome.inferences<1||outcome.source!=='queen')
    throw new Error('QWEN_LIVE_INFERENCE_NOT_VERIFIED; preserve current production');
}
