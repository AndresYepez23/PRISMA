import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { validatePages, toolUrl } from '../seo/generate.mjs';
import { SEO_BASE, FORMAT_PRESETS } from '../seo/config.mjs';
import { tools } from '../src/registry.js';
import { expansionPages } from '../seo/generate-expansion.mjs';
const root=new URL('../',import.meta.url),dist=new URL('../dist/',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const readOutput=p=>readFile(new URL(p,dist),'utf8');
const {pages}=JSON.parse(await read('seo/pages.json'));
const baseline=JSON.parse(await read('seo/baseline.json'));
const {categories}=JSON.parse(await read('seo/content-categories.json'));
const englishPages=JSON.parse(await read('seo/pages.en.json')).pages;
const englishCategories=JSON.parse(await read('seo/content-hubs.en.json')).categories;
const {solutions}=JSON.parse(await read('seo/content-solutions.json'));
const {guides}=JSON.parse(await read('seo/content-guides.json'));
const main=await read('src/main.js');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');

test('catalogue scales without a fixed batch size and preserves original pages',()=>{
 assert.doesNotThrow(()=>validatePages(pages));
 assert.doesNotThrow(()=>validatePages(pages.slice(0,1)));
 for(const previous of baseline){
  const current={...pages.find(p=>p.slug===previous.slug)};delete current.format;
  assert.equal(current.slug,previous.slug,'existing URL removed: '+previous.slug);
  assert.equal(current.tool,previous.tool,'existing tool changed: '+previous.slug);
 }
 for(const size of [50,70,100,200]){
  const synthetic=Array.from({length:size},(_,i)=>({...pages[0],slug:'test-'+i,title:'Title '+i,h1:'Heading '+i,description:'Description '+i}));
  assert.doesNotThrow(()=>validatePages(synthetic));
 }
});
test('invalid catalogue entries fail before writing HTML',()=>{
 const mutate=change=>[{...pages[0],...change}];
 for(const bad of [mutate({tool:'missing'}),mutate({tool:'pdf-protect'}),mutate({slug:'../escape'}),mutate({steps:[]}),mutate({faqs:[['question']]}),mutate({format:'mp3'}),mutate({params:{output:'pdf'}}),[pages[0],pages[0]]]) assert.throws(()=>validatePages(bad));
});
test('every preset matches the app allowlist and only supported URL fields are emitted',()=>{
 const actual=JSON.parse(main.match(/const allowed=(\{[^;]+\});/)[1].replaceAll("'",'"'));
 assert.deepEqual(FORMAT_PRESETS,actual);
 for(const p of pages){
  const url=new URL(toolUrl(p),SEO_BASE);
  assert.equal(url.searchParams.get('tool'),p.tool);
  assert.deepEqual([...url.searchParams.keys()],p.format?['tool','lang','format']:['tool','lang']);
  assert.equal(url.searchParams.get('lang'),'es');
  if(p.format)assert.ok(actual[p.tool]?.includes(p.format));
 }
 assert.match(main,/openTool\(target\)/);
});
test('rendered pages have one H1, unique metadata, valid JSON-LD and real CTA',async()=>{
 const titles=new Set(),descriptions=new Set(),incoming=new Map(pages.map(p=>[p.slug,0]));
 for(const p of pages){
  const path=new URL('herramientas/'+p.slug+'/index.html',dist),html=await readFile(path,'utf8');
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  assert.match(html,/^<!doctype html>/);
  assert.match(html,/<html lang="es"/);
  assert.match(html,/<meta name="viewport"/);
  assert.match(html,/<ol class="seo-steps">/);
  assert.ok((html.match(/<details>/g)||[]).length>=2);
  assert.ok(!/\b(?:undefined|NaN)\b/.test(html),p.slug);
  const tool=tools.find(item=>item.id===p.tool);
  if(['local','browser'].includes(tool.mode)) assert.ok(html.includes('PROCESAMIENTO LOCAL'),p.slug);
  else { assert.ok(html.includes('SERVICIO CONECTADO'),p.slug); assert.ok(!html.includes('GRATIS'),p.slug+' must not be advertised as universally free'); }
  const title=html.match(/<title>(.*?)<\/title>/)[1],description=html.match(/<meta name="description" content="(.*?)">/)[1];
  assert.ok(!titles.has(title));titles.add(title);assert.ok(!descriptions.has(description));descriptions.add(description);
  const canonical=decode(html.match(/rel="canonical" href="([^"]+)"/)[1]);
  assert.equal(canonical,SEO_BASE+'/herramientas/'+p.slug+'/');
  assert.ok(html.includes('property="og:url" content="'+canonical+'"'));
  const schemas=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schemas[0]['@type'],'WebApplication');assert.equal(schemas[0].url,canonical);
  assert.equal(schemas[1]['@type'],'BreadcrumbList');assert.equal(schemas[1].itemListElement.at(-1).item,canonical);
  const cta=decode(html.match(/class="seo-cta" href="([^"]+)"/)[1]);assert.equal(cta,toolUrl(p));
  for(const match of html.matchAll(/class="seo-related-card" href="\/herramientas\/([^/]+)\/"/g)){
   assert.ok(incoming.has(match[1]),'broken related link');assert.notEqual(match[1],p.slug);incoming.set(match[1],incoming.get(match[1])+1);
  }
  assert.ok((await stat(path)).size>2500);
 }
 for(const [slug,count] of incoming)assert.ok(count>0,slug+' has no contextual incoming link');
});
test('homepage metrics match the available tool registry',async()=>{
 const index=await read('index.html');
 const active=tools.filter(tool=>['ready','beta'].includes(tool.status));
 const local=active.filter(tool=>['local','browser'].includes(tool.mode));
 assert.equal(Number(index.match(/id="metric-tools">(\d+)/)?.[1]),active.length);
 assert.equal(Number(index.match(/id="metric-local">(\d+)/)?.[1]),local.length);
});

test('directory categories and sitemap expose exactly the current URLs',async()=>{
 const listing=await readFile(new URL('herramientas/index.html',dist),'utf8');
 const sitemap=await readFile(new URL('sitemap.xml',dist),'utf8');
 const robots=await readFile(new URL('robots.txt',dist),'utf8');
 const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));
 const sitemapEntries=new Map([...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match=>{
  const loc=decode(match[1].match(/<loc>(.*?)<\/loc>/)?.[1]||'');
  const lastmod=match[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1]||null;
  return [loc,lastmod];
 }));
 const spanishUrlCount=pages.length+4+categories.length+solutions.length+guides.length+3;
  assert.equal(urls.length,spanishUrlCount*2+expansionPages.length,'the sitemap must contain Spanish and English URLs');assert.equal(new Set(urls).size,urls.length);
 assert.ok(urls.every(url=>url.startsWith(SEO_BASE+'/')),'sitemap contains a non-canonical host or protocol');
 assert.ok(urls.every(url=>!/[?#]/.test(url)&&!/\.html$/i.test(new URL(url).pathname)),'sitemap contains a parameter or extension URL');
 for(const page of pages){
  const url=SEO_BASE+'/herramientas/'+page.slug+'/';
  assert.equal(sitemapEntries.get(url),page.lastmod||null,'sitemap lastmod mismatch for '+page.slug);
  if(page.lastmod)assert.match(page.lastmod,/^\d{4}-\d{2}-\d{2}$/,'invalid source lastmod for '+page.slug);
 }
 for(const p of pages){
  assert.ok(listing.includes('href="/herramientas/'+p.slug+'/"'));assert.ok(urls.includes(SEO_BASE+'/herramientas/'+p.slug+'/'));
  const category=tools.find(t=>t.id===p.tool).category;
  assert.ok(listing.includes('id="'+category+'"'));assert.ok(listing.includes('href="#'+category+'"'));
 }
 assert.ok(listing.includes('Explora '+(pages.length+expansionPages.filter(p=>p.path.startsWith('/herramientas/')).length)+' fichas'));
 assert.ok(listing.includes('href="/categorias/"'));
 assert.ok(listing.includes('href="/soluciones/"'));
 assert.ok(listing.includes('href="/guias/"'));
 assert.ok(robots.includes('Sitemap: '+SEO_BASE+'/sitemap.xml'));
 const about=await readFile(new URL('acerca.html',dist),'utf8');
 assert.ok(about.includes('Acerca de Prisma Space'));
 assert.ok(urls.includes(SEO_BASE+'/acerca'));
 assert.ok(!listing.includes('Herramientas online gratuitas'));
 for(const item of categories)assert.ok(urls.includes(SEO_BASE+'/categorias/'+item.slug+'/'));
 for(const item of solutions)assert.ok(urls.includes(SEO_BASE+'/soluciones/'+item.slug+'/'));
 for(const item of guides)assert.ok(urls.includes(SEO_BASE+'/guias/'+item.slug+'/'));
});

test('SEO category, solution and guide hubs are useful, canonical and internally connected',async()=>{
 const allTitles=new Set(),allDescriptions=new Set();
 const checkPage=async(path,canonical,type)=>{
  const html=await readFile(new URL(path,dist),'utf8');
  assert.match(html,/^<!doctype html>/);
  assert.equal((html.match(/<h1>/g)||[]).length,1,path);
  const title=html.split('<title>')[1]?.split('</title>')[0];
  const description=html.match(/<meta name="description" content="(.*?)">/)?.[1];
  assert.ok(title&&description,path+' metadata missing');
  assert.ok(title.length<=70,path+' title too long: '+title.length);
  assert.ok(description.length<=160,path+' description too long: '+description.length);
  assert.ok(!allTitles.has(title),'duplicate title: '+title);allTitles.add(title);
  assert.ok(!allDescriptions.has(description),'duplicate description: '+description);allDescriptions.add(description);
  const canonicalUrl=decode(html.match(/rel="canonical" href="([^"]+)"/)?.[1]||'');
  assert.equal(canonicalUrl,canonical,path+' canonical mismatch');
  const schema=JSON.parse(html.split('<script type="application/ld+json">')[1]?.split('</script>')[0]||'{}');
  assert.equal(schema['@type'],type,path+' schema mismatch');
  assert.ok((await stat(new URL(path,dist))).size>1800,path+' too small');
  return html;
 };
 const categoryIndex=await checkPage('categorias/index.html',SEO_BASE+'/categorias/','CollectionPage');
 const solutionIndex=await checkPage('soluciones/index.html',SEO_BASE+'/soluciones/','CollectionPage');
 const guideIndex=await checkPage('guias/index.html',SEO_BASE+'/guias/','CollectionPage');
 for(const item of categories){
  const html=await checkPage('categorias/'+item.slug+'/index.html',SEO_BASE+'/categorias/'+item.slug+'/','CollectionPage');
  assert.ok(html.includes('seo-tool-card'),'category has no tool cards: '+item.slug);
  assert.ok(html.includes('/soluciones/'),'category has no solution links: '+item.slug);
 }
 for(const item of solutions){
  const html=await checkPage('soluciones/'+item.slug+'/index.html',SEO_BASE+'/soluciones/'+item.slug+'/','WebPage');
  assert.ok(html.includes('seo-workflow-steps'),'solution has no workflow: '+item.slug);
  assert.ok(html.includes('seo-tool-card'),'solution has no tool links: '+item.slug);
 }
 for(const item of guides){
  const html=await checkPage('guias/'+item.slug+'/index.html',SEO_BASE+'/guias/'+item.slug+'/','HowTo');
  assert.ok(html.includes('seo-article-sections'),'guide has no explanatory content: '+item.slug);
  assert.ok(html.includes('seo-workflow-steps'),'guide has no steps: '+item.slug);
 }
 assert.ok(categoryIndex.includes('/categorias/pdf-documentos/'));
 assert.ok(solutionIndex.includes('/soluciones/organizar-documentos-pdf/'));
 assert.ok(guideIndex.includes('/guias/unir-varios-pdf/'));
 const firstTool=await readFile(new URL('herramientas/unir-pdf/index.html',dist),'utf8');
 assert.ok(firstTool.includes('class="seo-discovery"'));
 assert.ok(firstTool.includes('/categorias/pdf-documentos/'));
 assert.ok(firstTool.includes('/soluciones/organizar-documentos-pdf/'));
});


test('expansion tool pages are grouped into their localized directory and category hubs',async()=>{
 const expandedTools=expansionPages.filter(page=>page.path.startsWith('/herramientas/')||page.path.startsWith('/en/tools/'));
 assert.equal(expandedTools.filter(page=>page.language==='es').length,6);
 assert.equal(expandedTools.filter(page=>page.language==='en').length,6);
 const groups=new Map();
 for(const page of expandedTools){
  const en=page.language==='en';
  const tool=tools.find(item=>item.id===page.tool);
  assert.ok(tool,'missing registry tool for '+page.path);
  const sourceCategory=categories.find(item=>item.toolCategories.includes(tool.category));
  const category=en?englishCategories.find(item=>item.sourceSlug===sourceCategory?.slug):sourceCategory;
  assert.ok(category,'missing category mapping for '+page.path);
  const categorySlug=en?category.englishSlug:category.slug;
  const categoryHref=en?'/en/categories/'+categorySlug+'/':'/categorias/'+categorySlug+'/';
  const categoryFile=en?'en/categories/'+categorySlug+'/index.html':'categorias/'+categorySlug+'/index.html';
  const directoryFile=en?'en/tools/index.html':'herramientas/index.html';
  const landingFile=page.path.slice(1)+'index.html';
  const [categoryHtml,directoryHtml,landingHtml]=await Promise.all([
   readOutput(categoryFile),readOutput(directoryFile),readOutput(landingFile)
  ]);
  assert.ok(categoryHtml.includes('href="'+page.path+'"'),'category does not link to '+page.path);
  assert.ok(landingHtml.includes('href="'+categoryHref+'"'),'tool landing does not link back to '+categoryHref);
  const sectionStart=directoryHtml.indexOf('<section class="seo-category" id="'+tool.category+'">');
  const sectionEnd=sectionStart<0?-1:directoryHtml.indexOf('</section>',sectionStart);
  assert.ok(sectionStart>=0&&sectionEnd>sectionStart,'directory category missing for '+page.path);
  assert.ok(directoryHtml.slice(sectionStart,sectionEnd).includes('href="'+page.path+'"'),'tool page is not grouped under its directory category: '+page.path);
  const key=page.language+'|'+categorySlug;
  if(!groups.has(key))groups.set(key,{page,category,categoryFile,categoryHref,count:0});
  groups.get(key).count++;
 }
 for(const group of groups.values()){
  const en=group.page.language==='en';
  const basePages=en?englishPages:pages;
  const tool=tools.find(item=>item.id===group.page.tool);
  const baseCount=basePages.filter(item=>{
   const itemTool=tools.find(candidate=>candidate.id===item.tool);
   return group.category.toolCategories.includes(itemTool?.category);
  }).length;
  const total=baseCount+group.count;
  const categoryHtml=await readOutput(group.categoryFile);
  assert.ok(categoryHtml.includes(en?'Explore '+total+' tools and operations':'Explora '+total+' herramientas y operaciones'));
  const schema=JSON.parse(categoryHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema.mainEntity.numberOfItems,total);
  for(const page of expandedTools.filter(item=>{
   const pageTool=tools.find(candidate=>candidate.id===item.tool);
   return item.language===group.page.language&&group.category.toolCategories.includes(pageTool?.category);
  }))assert.ok(schema.mainEntity.itemListElement.some(item=>item.url===SEO_BASE+page.path),'category ItemList misses '+page.path);
  const indexHtml=await readOutput(en?'en/categories/index.html':'categorias/index.html');
  const cardStart=indexHtml.indexOf('<a class="seo-hub-card" href="'+group.categoryHref+'">');
  const cardEnd=cardStart<0?-1:indexHtml.indexOf('</a>',cardStart);
  assert.ok(cardStart>=0&&cardEnd>cardStart,'category index misses '+group.categoryHref);
  const card=indexHtml.slice(cardStart,cardEnd);
  assert.ok(en?card.includes(group.count+' additional tool page'+(group.count===1?'':'s')):card.includes(total+' fichas de herramienta'));
 }
});
