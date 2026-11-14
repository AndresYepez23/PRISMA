import test from 'node:test';
import assert from 'node:assert/strict';
import {requestQueenPlan,queenCircuitState,resetQueenCircuitForTests} from '../src/queen-client.js';

const args={text:'Extrae la segunda página del PDF y conviértela a Word',files:[{name:'a.pdf',type:'application/pdf',size:1000}]};
const ok={ok:true,source:'queen',plan:{intent:'execute',steps:[]}};
test('successful Queen planning uses neural route and keeps it available',async()=>{
 resetQueenCircuitForTests();
 let calls=0;
 const result=await requestQueenPlan(args,{now:()=>1000,fetchImpl:async(_url,req)=>{calls++;assert.equal(req.method,'POST');return new Response(JSON.stringify(ok),{status:200});}});
 assert.equal(result.source,'queen');assert.equal(calls,1);assert.equal(queenCircuitState(1000).available,true);
});
test('transient failure falls back immediately and suppresses repeat quota spend for 30 seconds',async()=>{
 resetQueenCircuitForTests();let calls=0;
 const fetchImpl=async()=>{calls++;return new Response('',{status:503});};
 assert.equal(await requestQueenPlan(args,{now:()=>2000,fetchImpl}),null);
 assert.equal(queenCircuitState(2001).retryAfterMs,29999);
 assert.equal(await requestQueenPlan(args,{now:()=>2002,fetchImpl}),null);
 assert.equal(calls,1);
 assert.equal(await requestQueenPlan(args,{now:()=>32001,fetchImpl}),null);
 assert.equal(calls,2);
});
test('validation errors do not block unrelated future requests',async()=>{
 resetQueenCircuitForTests();
 await requestQueenPlan(args,{now:()=>5000,fetchImpl:async()=>new Response('',{status:422})});
 assert.equal(queenCircuitState(5001).available,true);
});
test('explicit cancellation never dispatches neural inference',async()=>{
 resetQueenCircuitForTests();let calls=0;
 const controller=new AbortController();controller.abort();
 const result=await requestQueenPlan(args,{signal:controller.signal,fetchImpl:async()=>{calls++;return new Response('{}');}});
 assert.equal(result,null);assert.equal(calls,0);
});
test('network uncertainty does not trigger an automatic replay',async()=>{
 resetQueenCircuitForTests();let calls=0;
 const result=await requestQueenPlan(args,{now:()=>1000,fetchImpl:async()=>{calls++;throw Error('connection reset')}});
 assert.equal(result,null);assert.equal(calls,1);
 assert.equal(queenCircuitState(1001).available,true);
});
test('fallback payload from an unavailable backend opens circuit without leaking response details',async()=>{
 resetQueenCircuitForTests();
 const result=await requestQueenPlan(args,{now:()=>9000,fetchImpl:async()=>new Response(JSON.stringify({ok:false,fallback:true,code:'QUEEN_UNAVAILABLE'}),{status:200})});
 assert.equal(result,null);assert.equal(queenCircuitState(9001).retryAfterMs,29999);
});
