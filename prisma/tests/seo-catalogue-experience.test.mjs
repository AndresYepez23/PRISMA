import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tools} from '../src/registry.js';
import {hasInlineTool} from '../seo/inline-tool.mjs';
import {toolContract,toolOutcome} from '../seo/tool-experience.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const es=JSON.parse(read('../seo/pages.json')).pages,en=JSON.parse(read('../seo/pages.en.json')).pages,extra=JSON.parse(read('../seo/expansion-pages.json'));
const pages=[...es.map(p=>({...p,path:'/herramientas/'+p.slug+'/',language:'es'})),...en.map(p=>({...p,path:'/en/tools/'+p.englishSlug+'/',language:'en'})),...extra.filter(p=>/\/(herramientas|tools)\//.test(p.path))];

test('every existing tool page has a truthful operation overview and usable local form or exact connected launch',()=>{
 assert.equal(pages.length,292);
 for(const page of pages){
  const html=read('../dist'+page.path+'index.html'),tool=tools.find(t=>t.id===page.tool);
  assert.ok(toolOutcome(page,page.language),page.path);
  assert.ok(html.includes('class="seo-operation-card"')||html.includes('class="seo-example"'),page.path+' operation overview');
  assert.ok(!html.includes('class="seo-preview"'),page.path+' generic preview returned');
  if(hasInlineTool(page)){
   assert.ok(html.includes('data-seo-inline-tool="'+tool.id+'"'),page.path+' missing workbench');
   assert.ok(html.includes('href="#inline-tool-title"'),page.path+' wrong CTA');
   const contract=toolContract(tool,page.language);
   if(!['pdf-split','html-format','js-format','citation-generator'].includes(tool.id))for(const field of contract)assert.ok(html.includes('name="'+field.name+'"'),page.path+' missing '+field.name);
   if(tool.file)assert.ok(html.includes('type="file"'),page.path+' missing file input');
   if(page.format)assert.ok(new RegExp('value="'+page.format+'"(?: selected|>)').test(html),page.path+' format preset');
  }else{
   assert.ok(/class="[^"]*\bseo-launch-tool\b/.test(html),page.path+' connected requirements');
   assert.ok(html.includes('tool='+tool.id),page.path+' wrong connected tool');
   assert.ok(!html.includes('data-seo-inline-tool'),page.path+' external service must use its configured flow');
  }
 }
});

test('all 388 existing public pages provide keyboard access and catalogue pages retain search without hiding static links',()=>{
 const urls=[...read('../dist/sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);assert.equal(urls.length,388);
 for(const path of urls){
  const html=read('../dist'+path+(path.endsWith('/')?'index.html':'.html'));
  assert.match(html,/<a class="prisma-skip-link" href="#[^"]+">/,path);
  if(html.includes('class="seo-page"'))assert.ok(html.includes('class="seo-browse"'),path+' mobile menu');
 }
 for(const path of ['/herramientas/','/en/tools/','/categorias/','/en/categories/','/guias/','/en/guides/','/soluciones/','/en/solutions/']){
  const html=read('../dist'+path+'index.html');assert.ok(html.includes('data-catalog-search'),path+' search');assert.ok(html.includes('data-catalog-card'),path+' cards');
  assert.ok(!/<a[^>]*data-catalog-card[^>]* hidden/.test(html),path+' static links hidden');
 }
});
