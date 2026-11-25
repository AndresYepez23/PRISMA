import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest, STABLE_CORE_ORIGIN} from '../functions/api/_middleware.js';
import {onRequestPost} from '../functions/api/core/metrics.js';

const preview='https://sample123.prismaspace.pages.dev';
const request=(path, init={})=>new Request(preview+path, init);
const next=()=>Response.json({local:true});

test('preview APIs use the immutable working deployment, preserving cookies and query',async()=>{
  let sent;
  const result=await onRequest({request:request('/api/providers/status?probe=1',{headers:{Cookie:'session=test',Authorization:'Bearer test'}}),next},
    {fetcher:async r=>{sent=r;return Response.json({ok:true,credentialSlots:{gemini:{count:7}}});}});
  assert.equal(sent.url,STABLE_CORE_ORIGIN+'/api/providers/status?probe=1');
  assert.equal(sent.headers.get('cookie'),'session=test');
  assert.equal(sent.headers.get('authorization'),'Bearer test');
  assert.equal(result.headers.get('X-Prisma-Core-Backend'),'stable-17a6c338');
  assert.equal((await result.json()).ok,true);
});

test('POST keeps request body and translates only trusted same-origin Origin',async()=>{
  let sent,body;
  const payload=JSON.stringify({text:'Una pregunta sobre PDF',files:[]});
  const result=await onRequest({request:request('/api/core/plan',{
    method:'POST',headers:{Origin:preview,'Content-Type':'application/json',Referer:preview+'/chat'},body:payload}),next},
    {fetcher:async r=>{sent=r;body=await r.text();return Response.json({ok:true,source:'queen'});}});
  assert.equal(sent.headers.get('origin'),STABLE_CORE_ORIGIN);
  assert.equal(sent.headers.get('referer'),STABLE_CORE_ORIGIN+'/chat');
  assert.equal(body,payload);
  assert.equal((await result.json()).source,'queen');
});

test('cross-origin POST is denied before using privileged stable backend',async()=>{
  let fetched=false;
  const result=await onRequest({request:request('/api/core/plan',{
    method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),next},
    {fetcher:async()=>{fetched=true;throw Error('should not run');}});
  assert.equal(result.status,403);
  assert.equal(fetched,false);
});

test('static files are not proxied',async()=>{
  let fetched=false;
  const result=await onRequest({request:request('/src/core.js'),next},
    {fetcher:async()=>{fetched=true;throw Error('should not run');}});
  assert.equal(fetched,false);
  assert.deepEqual(await result.json(),{local:true});
});

test('isolated Queen staging never reaches production backend',async()=>{
  const req=new Request('https://prisma-queen-staging.pages.dev/api/core/plan');
  let fetched=false;
  const result=await onRequest({request:req,next},
    {fetcher:async()=>{fetched=true;throw Error('should not run');}});
  assert.equal(fetched,false);
  assert.deepEqual(await result.json(),{local:true});
});

test('redirects remain same origin to the browser',async()=>{
  const result=await onRequest({request:request('/api/a'),next},
    {fetcher:async()=>new Response('',{status:302,headers:{Location:STABLE_CORE_ORIGIN+'/api/login'}})});
  assert.equal(result.headers.get('location'),preview+'/api/login');
});

test('backend failures do not silently call keyless new deployment',async()=>{
  const result=await onRequest({request:request('/api/core/plan'),next},
    {fetcher:async()=>{throw Error('network error')}});
  assert.equal(result.status,502);
  assert.equal((await result.json()).code,'CORE_BACKEND_UNREACHABLE');
});

test('metrics reach the current handler through the real middleware, preserving origin and privacy',async()=>{
 for(const privacy of ['', 'DNT', 'Sec-GPC']){
  const headers={Origin:preview,'Content-Type':'application/json'};if(privacy)headers[privacy]='1';
  const req=request('/api/core/metrics',{method:'POST',headers,body:'null'});
  let fetched=false;
  const result=await onRequest({request:req,next:()=>onRequestPost({request:req,env:{}})},{fetcher:async()=>{fetched=true;throw Error('Old backend must not receive metrics');}});
  assert.equal(fetched,false);assert.equal(result.status,privacy?204:400);assert.equal(result.headers.get('X-Prisma-Core-Backend'),null);
 }
});
test('metrics keep cross-origin rejection before the local exception',async()=>{
 let local=false,fetched=false;
 const result=await onRequest({request:request('/api/core/metrics',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),next:()=>{local=true;return new Response();}},{fetcher:async()=>{fetched=true;return new Response();}});
 assert.equal(result.status,403);assert.equal(local,false);assert.equal(fetched,false);
});
