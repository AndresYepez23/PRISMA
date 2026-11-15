// One-shot live release gate for the isolated Qwen interpreter route.
// No secrets are read. Never retries a POST whose inference outcome is unknown.
import assert from 'node:assert/strict';

const production = process.env.GITHUB_REF === 'refs/heads/main';
const appOrigin = production
  ? 'https://prismaspace.pages.dev'
  : 'https://feat-qwen-dedicated-interpre.prismaspace.pages.dev';
const stableOrigin = 'https://17a6c338.prismaspace.pages.dev';
const qwenOrigin = 'https://prisma-queen-staging.pages.dev';
const expectedBuild = process.env.GITHUB_SHA;
if (!expectedBuild || !/^[a-f0-9]{40}$/.test(expectedBuild)) throw Error('EXPECTED_SHA_REQUIRED');

async function getJson(url, { timeout = 15000, ...options } = {}) {
  const response = await fetch(url, { cache:'no-store', ...options, signal:AbortSignal.timeout(timeout) });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function waitForBuild() {
  for (let attempt=0; attempt<30; attempt++) {
    try {
      const {response,body}=await getJson(appOrigin+'/prisma-build.json');
      if (response.ok && body.build===expectedBuild) return;
    } catch {}
    await new Promise(resolve=>setTimeout(resolve,10000));
  }
  throw Error('CANDIDATE_DEPLOYMENT_NOT_READY: no live inference sent');
}

function safeStatus(body) {
  assert.equal(body.ok,true,'provider status not available');
  assert.ok(body.credentialSlots,'provider count report missing');
  const providers=Object.fromEntries(Object.entries(body.credentialSlots).map(([key,value])=>[key,Number(value?.count)||0]));
  return {providers,
    tavily:Number(body.research?.tavily?.configuredKeys)||0,
    jina:!!body.research?.jina?.configured,
    cloudflare:!!body.configured?.cloudflare,
    d1:!!body.protection?.d1RateLimiting};
}

await waitForBuild();
const original=await getJson(stableOrigin+'/api/providers/status');
const candidate=await getJson(appOrigin+'/api/providers/status');
assert.equal(original.response.status,200);
assert.equal(candidate.response.status,200);
assert.equal(candidate.response.headers.get('X-Prisma-Core-Backend'),'stable-17a6c338','stable provider bridge altered');
const baseline=safeStatus(original.body),current=safeStatus(candidate.body);
console.log('PROVIDER_GATE',JSON.stringify({original:baseline,current}));
assert.deepEqual(current,baseline,'provider regression; refuse Qwen inference');
assert.ok(Object.values(baseline.providers).reduce((sum,n)=>sum+n,0)>=40,'stable provider inventory incomplete');
assert.ok(baseline.tavily>=1 && baseline.jina && baseline.cloudflare && baseline.d1,'stable research, AI, or D1 unavailable');

const upstream=await getJson(qwenOrigin+'/api/core/qwen-interpret');
assert.equal(upstream.response.status,200);
assert.equal(upstream.body.ready,true,'isolated Qwen disabled');
assert.ok(/^[a-f0-9]{40}$/.test(upstream.body.deploymentCommit||''),'unverifiable Qwen deployment identity');

const qwenHealth=await getJson(appOrigin+'/api/core/qwen-interpret');
assert.equal(qwenHealth.response.status,200);
assert.equal(qwenHealth.response.headers.get('X-Prisma-Core-Backend'),'qwen-dedicated-service','Qwen bridge not active');
assert.equal(qwenHealth.body.ready,true,'Qwen route disabled');
assert.equal(qwenHealth.body.deploymentCommit,upstream.body.deploymentCommit,'Qwen proxy targets wrong deployment');
console.log('QWEN_ROUTE_GATE',JSON.stringify({preview:!production,ready:true,sourceCommit:qwenHealth.body.deploymentCommit,proxy:'qwen-dedicated-service'}));

// Exactly one real model inference with synthetic file metadata, no file contents.
// This POST must never be retried, including after a timeout.
const {response,body}=await getJson(appOrigin+'/api/core/qwen-interpret',{
  method:'POST',
  headers:{Origin:appOrigin,'Content-Type':'application/json'},
  body:JSON.stringify({text:'Extrae la segunda página del PDF y conviértela a Word',files:[{name:'prueba.pdf',type:'application/pdf',size:1024}]}),
  timeout:45000
});
const evidence={status:response.status,backend:response.headers.get('X-Prisma-Core-Backend'),
  ok:body.ok===true,source:body.source||null,tool_ids:body.tool_ids||null,
  inferences:body.metrics?.inferences??null,code:body.code||null};
console.log('QWEN_ONE_SHOT',JSON.stringify(evidence));
assert.equal(response.status,200,'Qwen real inference unsuccessful');
assert.equal(evidence.backend,'qwen-dedicated-service');
assert.equal(evidence.ok,true);
assert.equal(evidence.source,'qwen-core');
assert.equal(body.intent,'tools');
assert.deepEqual(body.tool_ids,['pdf-extract','pdf-to-word'],'Qwen task coverage incomplete');
assert.equal(body.metrics?.inferences,1);
assert.equal(body.deploymentCommit,upstream.body.deploymentCommit);
console.log('DEDICATED_QWEN_GATE_PASS',production?'production':'preview');
