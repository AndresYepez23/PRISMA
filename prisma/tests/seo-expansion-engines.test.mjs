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

test('reading time uses the selected pace and rejects unsupported speeds',async()=>{
 const text=Array(220).fill('palabra').join(' ');
 assert.match((await runTool('reading-time-local',[],{text,wpm:'220'})).text,/1 min 0 s/);
 assert.match((await runTool('reading-time-local',[],{text,wpm:'400'})).text,/33 segundos/);
 assert.match((await runTool('reading-time-local',[],{text:' \n\t ',wpm:80})).text,/Palabras: 0[\s\S]*0 segundos/);
 for(const wpm of [79,401,0,Infinity,'rápido',220.5])await assert.rejects(runTool('reading-time-local',[],{text,wpm}),/80 y 400/);
});
test('CSV and TSV conversion preserves multiline, quoted, empty and tabbed fields',async()=>{
 const csv='\uFEFFname,note,id\r\n"Ana, Jr.","Line 1\r\nLine 2 and ""quote""",0012\r\n,"tab\tinside",\r\n\r\n';
 const tsv=await runTool('csv-to-tsv-local',[],{text:csv,mode:'csv-to-tsv',delimiter:','});
 assert.equal(tsv.text,'name\tnote\tid\nAna, Jr.\t"Line 1\r\nLine 2 and ""quote"""\t0012\n\t"tab\tinside"\t\n""');
 assert.equal(await tsv.blob.text(),tsv.text);assert.equal(tsv.filename,'prisma-tabla.tsv');
 const restored=await runTool('csv-to-tsv-local',[],{text:tsv.text,mode:'tsv-to-csv',delimiter:','});
 assert.equal(restored.text,'name,note,id\n"Ana, Jr.","Line 1\r\nLine 2 and ""quote""",0012\n,tab\tinside,\n""');
 assert.equal(await restored.blob.text(),restored.text);assert.equal(restored.filename,'prisma-tabla.csv');
 const semicolon=await runTool('tsv-to-csv-local',[],{text:'id\tnote\n0012\t"x;y"',delimiter:';'});
 assert.equal(semicolon.text,'id;note\n0012;"x;y"');
 assert.equal((await runTool('csv-to-tsv-local',[],{text:semicolon.text,delimiter:';'})).text,'id\tnote\n0012\tx;y');
});
test('CSV and TSV conversion rejects malformed quotes instead of silently changing cells',async()=>{
 for(const text of ['a,"unterminated','a,b"c','a,"closed"tail'])await assert.rejects(runTool('csv-to-tsv-local',[],{text}),/comilla/i);
 await assert.rejects(runTool('csv-to-tsv-local',[],{text:'a|b',delimiter:'|'}),/coma/);
 await assert.rejects(runTool('csv-to-tsv-local',[],{text:''}),/CSV o TSV/);
});
