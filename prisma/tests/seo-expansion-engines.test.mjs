import test from 'node:test';
import assert from 'node:assert/strict';
import {runTool} from '../src/engines.js';
import {planPdfSplit} from '../src/pdf-split-options.js';

test('Anki download contains exactly the supplied cards and no header card',async()=>{
 const result=await runTool('flashcards-export',[],{text:'Capital | Bogotá\nQuote :: A "quoted", answer'});
 assert.equal(result.filename,'prisma-tarjetas-anki.csv');
 assert.equal(await result.blob.text(),'Capital,Bogotá\nQuote,"A ""quoted"", answer"');
 assert.equal(result.text,await result.blob.text());
 assert.match(result.summary,/2 tarjetas/);
});
test('text comparison reports changed lines and rejects over-limit inputs',async()=>{
 const result=await runTool('text-diff',[],{textA:'Same\nOld',textB:'Same\nNew'});
 assert.match(result.text,/\+ New/);assert.match(result.text,/- Old/);
 await assert.rejects(runTool('text-diff',[],{textA:'x\n'.repeat(451),textB:'x'}),/450/);
});
test('published PDF splitting examples match the actual planner',()=>{
 assert.deepEqual(planPdfSplit({mode:'ranges',ranges:'1-3;4-8'},8).groups.map(g=>g.indices.length),[3,5]);
 assert.equal(planPdfSplit({mode:'ranges',ranges:'2-4'},8).groups.length,1);
 assert.equal(planPdfSplit({mode:'selected',pages:'2,4-6'},8).groups.length,4);
 assert.deepEqual(planPdfSplit({mode:'chunk',chunkSize:3},8).groups.map(g=>g.indices.length),[3,3,2]);
 assert.throws(()=>planPdfSplit({mode:'ranges',ranges:'1-3;3-5'},8),/repetidas/);
});
