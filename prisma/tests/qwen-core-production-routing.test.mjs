import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest,STABLE_CORE_ORIGIN,QWEN_INTERPRETER_ORIGIN} from '../functions/api/_middleware.js';

test('Qwen interpreter is proxied only to the dedicated isolated Qwen service',async()=>{
 let nextCalled=0,upstream;
 const request=new Request('https://prismaspace.space/api/core/qwen-interpret',{method:'POST',
  headers:{Origin:'https://prismaspace.space','Content-Type':'application/json'},body:'{}'});
 const response=await onRequest({request,next:async()=>{nextCalled++;return new Response('wrong-route');}},
  {fetcher:async(req)=>{upstream=req;return new Response('qwen-service',{status:200});}});
 assert.equal(await response.text(),'qwen-service');
 assert.equal(nextCalled,0);assert.equal(new URL(upstream.url).origin,QWEN_INTERPRETER_ORIGIN);
 assert.equal(new URL(upstream.url).pathname,'/api/core/qwen-interpret');
 assert.equal(upstream.headers.get('Origin'),QWEN_INTERPRETER_ORIGIN);
 assert.equal(response.headers.get('X-Prisma-Core-Backend'),'qwen-dedicated-service');
});

test('all other production API routes remain on the known-good credential-preserving backend',async()=>{
 let nextCalled=0,upstream;
 const request=new Request('https://prismaspace.space/api/core/plan',{method:'POST',
  headers:{Origin:'https://prismaspace.space','Content-Type':'application/json'},body:JSON.stringify({text:'test'})});
 const response=await onRequest({request,next:async()=>{nextCalled++;return new Response('wrong-route');}},
  {fetcher:async(req)=>{upstream=req;return new Response('stable',{status:200});}});
 assert.equal(await response.text(),'stable');
 assert.equal(nextCalled,0);assert.equal(new URL(upstream.url).origin,STABLE_CORE_ORIGIN);
 assert.equal(response.headers.get('X-Prisma-Core-Backend'),'stable-17a6c338');
});

test('the isolated Qwen staging project never uses the production bridge',async()=>{
 let fetched=0,nextCalled=0;
 const request=new Request('https://59ae9592.prisma-queen-staging.pages.dev/api/core/qwen-interpret',{method:'POST',
  headers:{Origin:'https://59ae9592.prisma-queen-staging.pages.dev','Content-Type':'application/json'},body:'{}'});
 await onRequest({request,next:async()=>{nextCalled++;return new Response('staging');}},
  {fetcher:async()=>{fetched++;return new Response('stable');}});
 assert.equal(nextCalled,1);assert.equal(fetched,0);
});

test('off-site origins remain blocked before the stable API bridge',async()=>{
 let fetched=0;
 const request=new Request('https://prismaspace.space/api/core/plan',{method:'POST',
  headers:{Origin:'https://attacker.invalid','Content-Type':'application/json'},body:'{}'});
 const response=await onRequest({request,next:async()=>new Response('unexpected')},{fetcher:async()=>{fetched++;return new Response('unexpected');}});
 assert.equal(response.status,403);assert.equal(fetched,0);
});


// A single controlled live check, opt-in by an explicit commit marker on this
// isolated PR branch. Never automatically retries a timed-out inference.
if (process.env.GITHUB_ACTIONS === 'true' &&
    process.env.GITHUB_HEAD_REF === 'feat/qwen-dedicated-interpreter-proxy-20261115') {
  const {execFileSync} = await import('node:child_process');
  const subject=execFileSync('git',['log','-1','--format=%s'],{encoding:'utf8'}).trim();
  if (subject.includes('[qwen-proxy-smoke-once]')) {
    test('one real Qwen inference via immutable preview while preserving all other provider routes',
      {timeout:100000},async()=>{
      const preview='https://9c77086b.prismaspace.pages.dev';
      const baseline='https://17a6c338.prismaspace.pages.dev';
      const expected='bbe0eeb680e00ffbc279f33f52e70b18951108d2';
      const build=await fetch(preview+'/prisma-build.json',{signal:AbortSignal.timeout(12000),cache:'no-store'});
      assert.equal(build.status,200,'Preview build metadata must be reachable');
      assert.equal((await build.json()).build,expected,'Preview must be the audited proxy commit');
      const status=async origin=>{
        const r=await fetch(origin+'/api/providers/status',{signal:AbortSignal.timeout(25000),cache:'no-store'});
        assert.equal(r.status,200,'Provider status must work at '+origin);
        const body=await r.json();
        assert.equal(body.ok,true);
        assert.ok(body.credentialSlots);
        return {bridge:r.headers.get('X-Prisma-Core-Backend'),
          slots:Object.fromEntries(Object.entries(body.credentialSlots).map(([key,value])=>[key,Number(value.count)||0])),
          tavily:Number(body.research?.tavily?.configuredKeys)||0,
          jina:!!body.research?.jina?.configured,
          ai:!!body.configured?.cloudflare,d1:!!body.protection?.d1RateLimiting};
      };
      const [known,proxied]=await Promise.all([status(baseline),status(preview)]);
      const external=Object.values(known.slots).reduce((a,b)=>a+b,0);
      assert.ok(external>=40,'Known-good baseline must retain external provider slots');
      assert.ok(known.tavily>0&&known.jina&&known.ai&&known.d1,'Known-good baseline must be complete');
      assert.equal(proxied.bridge,'stable-17a6c338');
      assert.deepEqual({...proxied,bridge:null},{...known,bridge:null},'No provider slot regression');
      console.log('PROVIDER_BRIDGE_VERIFIED '+JSON.stringify({externalSlots:external,tavily:known.tavily,jina:known.jina,cloudflareAI:known.ai,d1:known.d1}));
      const ready=await fetch(preview+'/api/core/qwen-interpret',{signal:AbortSignal.timeout(12000),cache:'no-store'});
      assert.equal(ready.status,200);
      const readiness=await ready.json();
      assert.equal(readiness.ready,true,'Dedicated Qwen endpoint must be ready before inference');
      assert.equal(ready.headers.get('X-Prisma-Core-Backend'),'qwen-dedicated-service');
      console.log('QWEN_BRIDGE_READINESS '+JSON.stringify({ready:true,deploymentCommit:readiness.deploymentCommit||null}));
      const start=Date.now();
      // Exactly one real model inference, no retry after an uncertain response.
      const response=await fetch(preview+'/api/core/qwen-interpret',{
        method:'POST',headers:{Origin:preview,'Content-Type':'application/json'},
        body:JSON.stringify({text:'Extrae la segunda página del PDF y conviértela a Word',
          files:[{name:'informe.pdf',type:'application/pdf',size:1250}]}),
        signal:AbortSignal.timeout(50000)});
      const body=await response.json().catch(()=>({}));
      const ids=Array.isArray(body.tool_ids)?body.tool_ids:[];
      const evidence={httpStatus:response.status,bridge:response.headers.get('X-Prisma-Core-Backend'),
        ok:body.ok===true,code:body.code||null,source:body.source||null,intent:body.intent||null,
        toolIds:ids,inferences:Number(body.metrics?.inferences)||0,
        durationMs:Date.now()-start,deploymentCommit:body.deploymentCommit||null};
      console.log('QWEN_PROXY_ONE_SHOT '+JSON.stringify(evidence));
      assert.equal(response.status,200);
      assert.equal(evidence.bridge,'qwen-dedicated-service');
      assert.equal(evidence.ok,true);
      assert.equal(evidence.source,'qwen-core');
      assert.equal(evidence.intent,'tools');
      assert.ok(ids.includes('pdf-extract')&&ids.indexOf('pdf-to-word')>ids.indexOf('pdf-extract'),
        'Qwen must preserve requested operation order');
      assert.equal(evidence.inferences,1,'Require a real model inference');
    });
  }
}
