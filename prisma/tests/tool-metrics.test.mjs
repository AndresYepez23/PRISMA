import test from 'node:test';
import assert from 'node:assert/strict';
import {metricEvent,metricsAllowed} from '../src/core-telemetry.js';
import {onRequestPost} from '../functions/api/core/metrics.js';
const url='https://prismaspace.space/api/core/metrics';
const request=body=>new Request(url,{method:'POST',headers:{Origin:new URL(url).origin,'Content-Type':'application/json'},body:JSON.stringify(body)});

test('aggregate counters enable only the canonical production domain and honor browser privacy signals',()=>{
 assert.equal(metricsAllowed('prismaspace.space'),true);
 for(const host of ['prismaspace.pages.dev','branch.prismaspace.pages.dev','localhost','evil.example'])assert.equal(metricsAllowed(host),false);
 assert.equal(metricsAllowed('prismaspace.space',{doNotTrack:'1'}),false);assert.equal(metricsAllowed('prismaspace.space',{globalPrivacyControl:true}),false);
 assert.deepEqual(metricEvent('word-count','copied',{duration:Infinity,files:-4,text:'SECRET',filename:'private.txt'}),{id:'word-count',event:'copied',duration:0,files:0});
});
test('metrics ingestion rejects malformed JSON shapes and binds only whitelisted aggregate fields',async()=>{
 for(const value of [null,{},'secret',{events:[null]},{events:[]},{events:[{id:'private-name',event:'succeeded'}]}])assert.equal((await onRequestPost({request:request(value),env:{}})).status,400);
 const batches=[],db={prepare:sql=>({bind:(...values)=>{assert.ok(!sql.includes('SECRET'));return values;}}),batch:async rows=>{batches.push(rows);}};
 assert.equal((await onRequestPost({request:request({events:[{id:'word-count',event:'download-clicked',duration:12,files:2,text:'SECRET'}]}),env:{PRISMA_RATE_DB:db}})).status,204);
 assert.deepEqual(batches[0][0].slice(1),['word-count','download-clicked',12,2]);
 const large=request({events:[{id:'word-count',event:'succeeded',text:'😀'.repeat(2000)}]});assert.equal((await onRequestPost({request:large,env:{}})).status,413);
});
test('leaving the page flushes the bounded queue once, without cookies or referrers; transport failures are harmless',async()=>{
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;
 const target=new EventTarget(),doc=new EventTarget(),sent=[];
 target.location={hostname:'prismaspace.space'};target.navigator={};target.document=doc;doc.visibilityState='visible';
 globalThis.window=target;globalThis.fetch=async(path,options)=>{sent.push({path,options});throw Error('network unavailable');};
 try{
  const metrics=await import('../src/core-telemetry.js?lifecycle');
  metrics.recordCoreMetric('word-count','succeeded',{duration:15,files:0,text:'SECRET'});
  doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));target.dispatchEvent(new Event('pagehide'));
  await metrics.flushCoreMetrics();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(sent.length,1);assert.equal(sent[0].path,'/api/core/metrics');assert.equal(sent[0].options.credentials,'omit');assert.equal(sent[0].options.referrerPolicy,'no-referrer');
  assert.equal(sent[0].options.keepalive,true);assert.ok(!sent[0].options.body.includes('SECRET'));
 }finally{globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
