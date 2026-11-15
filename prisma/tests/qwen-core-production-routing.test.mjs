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
