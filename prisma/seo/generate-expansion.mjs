import {toolOverview} from './tool-experience.mjs';
import {inlineToolForm,hasInlineTool} from './inline-tool.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {markup as spanishMarkup} from './generate.mjs';
import {markup as englishMarkup} from './generate-international.mjs';
import {tools} from '../src/registry.js';
import {SEO_BASE as BASE} from './config.mjs';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const expansionPages=JSON.parse(await readFile(new URL('./expansion-pages.json',import.meta.url),'utf8'));
export function validateExpansion(pages,existing=new Set()){
 const paths=new Map();
 for(const p of pages){
  if(!['es','en'].includes(p.language)||!/^\/(?:herramientas|guias|soluciones|en\/(?:tools|guides|solutions))\/[a-z0-9-]+\/$/.test(p.path))throw Error('Invalid regional page route');
  if(p.path.startsWith('/en/')!==(p.language==='en')||paths.has(p.path)||existing.has(BASE+p.path))throw Error('Duplicate or conflicting page '+p.path);
  if(!tools.some(t=>t.id===p.tool&&t.status!=='soon'))throw Error('Unavailable tool '+p.tool);
  if(!p.title||!p.description||!p.intro||p.sections.length<3||p.faqs.length<2)throw Error('Incomplete page '+p.path);
  paths.set(p.path,p);
 }
 for(const p of pages)if(p.pair){const other=paths.get(p.pair);if(!other||other.pair!==p.path||other.language===p.language||other.tool!==p.tool)throw Error('Invalid reciprocal equivalent '+p.path);}
 return paths;
}

const isToolLanding=page=>page.path.startsWith('/herramientas/')||page.path.startsWith('/en/tools/');
const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
function toolLabels(tool,language){
 const en=language==='en';
 return {
  status:tool.status==='beta'?(en?'Beta':'En beta'):(en?'Available':'Disponible'),
  mode:tool.mode==='local'?(en?'Local processing':'Procesamiento local'):tool.mode==='browser'?(en?'In your browser':'En el navegador'):(en?'Connected service':'Servicio conectado'),
  action:en?'Open ↗':'Abrir herramienta ↗'
 };
}
function addDirectoryToolCard(html,page,tool,language){
 const labels=toolLabels(tool,language);
 const card='<a class="seo-directory-card" href="'+esc(page.path)+'"><strong>'+esc(page.title)+'</strong><span>'+esc(page.description)+'</span><small>'+labels.status+' · '+labels.action+'</small></a>';
 if(html.includes('href="'+page.path+'"'))return html;
 const sectionMarker='<section class="seo-category" id="'+esc(tool.category)+'">';
 const sectionStart=html.indexOf(sectionMarker);
 if(sectionStart<0)throw new Error('SEO expansion: directory category missing for '+page.path+' ('+tool.category+')');
 const gridStart=html.indexOf('<div class="seo-directory-grid">',sectionStart);
 const gridEnd=gridStart<0?-1:html.indexOf('</div></section>',gridStart);
 if(gridStart<0||gridEnd<0)throw new Error('SEO expansion: directory grid missing for '+page.path);
 return html.slice(0,gridEnd)+card+html.slice(gridEnd);
}
function addCategoryToolCard(html,page,tool,language){
 const labels=toolLabels(tool,language);
 const card='<a class="seo-tool-card" href="'+esc(page.path)+'"><strong>'+esc(page.title)+'</strong><span>'+esc(page.description)+'</span><small>'+labels.status+' · '+labels.mode+' · '+labels.action+'</small></a>';
 if(!html.includes('href="'+page.path+'"')){
  const gridStart=html.indexOf('<div class="seo-tool-grid">');
  const gridEnd=gridStart<0?-1:html.indexOf('</div></section>',gridStart);
  if(gridStart<0||gridEnd<0)throw new Error('SEO expansion: category tool grid missing for '+page.path);
  html=html.slice(0,gridEnd)+card+html.slice(gridEnd);
 }
 const heading=language==='en'?/(Explore\s+)(\d+)(\s+tools and operations)/:/(Explora\s+)(\d+)(\s+herramientas y operaciones)/;
 const match=html.match(heading);
 if(!match)throw new Error('SEO expansion: category item count missing for '+page.path);
 const total=Number(match[2])+1;
 html=html.replace(heading,(_,before,count,after)=>before+total+after);
 const schemaTag=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 if(!schemaTag)throw new Error('SEO expansion: category structured data missing for '+page.path);
 const schema=JSON.parse(schemaTag[1]);
 const itemList=schema.mainEntity?.itemListElement;
 if(!Array.isArray(itemList))throw new Error('SEO expansion: category ItemList missing for '+page.path);
 const absoluteUrl=BASE+page.path;
 if(!itemList.some(item=>item.url===absoluteUrl))itemList.push({'@type':'ListItem',position:itemList.length+1,name:page.title,url:absoluteUrl});
 schema.mainEntity.numberOfItems=total;
 return html.replace(schemaTag[0],'<script type="application/ld+json">'+safeJson(schema)+'</script>');
}
function updateCategoryIndexCard(html,href,language,added){
 const start=html.indexOf('<a class="seo-hub-card" href="'+href+'">');
 const end=start<0?-1:html.indexOf('</a>',start);
 if(start<0||end<0)throw new Error('SEO expansion: category index card missing for '+href);
 let card=html.slice(start,end+4);
 if(language==='es'){
  const count=card.match(/(\d+)\s+fichas de herramienta/);
  if(!count)throw new Error('SEO expansion: category count missing for '+href);
  card=card.replace(count[0],(Number(count[1])+added)+' fichas de herramienta');
 }else{
  const description=card.match(/(<strong>[\s\S]*?<\/strong><span>)([\s\S]*?)(<\/span><small>)/);
  if(!description)throw new Error('SEO expansion: English category description missing for '+href);
  const suffix=added+' additional tool page'+(added===1?'':'s');
  card=card.replace(description[0],description[1]+description[2]+' · '+suffix+description[3]);
 }
 return html.slice(0,start)+card+html.slice(end+4);
}

const alternates=p=>{
 if(!p.pair)return '';
 const es=BASE+(p.language==='es'?p.path:p.pair),en=BASE+(p.language==='en'?p.path:p.pair);
 return [['es',es],['en',en],['x-default',es]].map(([lang,url])=>'<link rel="alternate" hreflang="'+lang+'" href="'+url+'">').join('\n');
};
export async function generateExpansionPages(output){
 const sourceCategories=JSON.parse(await readFile(new URL('./content-categories.json',import.meta.url),'utf8')).categories;
 const englishCategories=JSON.parse(await readFile(new URL('./content-hubs.en.json',import.meta.url),'utf8')).categories;
 const categoryGroups=new Map();
 const toolMap=new Map(tools.map(tool=>[tool.id,tool]));
 for(const page of expansionPages.filter(isToolLanding)){
  const tool=toolMap.get(page.tool);
  const category=sourceCategories.find(item=>item.toolCategories.includes(tool?.category));
  const englishCategory=category&&englishCategories.find(item=>item.sourceSlug===category.slug);
  if(!tool||!category||!englishCategory)throw new Error('SEO expansion: tool category mapping missing for '+page.path);
  const key=page.language+'|'+category.slug;
  if(!categoryGroups.has(key))categoryGroups.set(key,{language:page.language,category,englishCategory,pages:[]});
  categoryGroups.get(key).pages.push({page,tool});
 }
 const sitemapFile=new URL('sitemap.xml',output);let sitemap=await readFile(sitemapFile,'utf8');
 const existing=new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]));
 validateExpansion(expansionPages,existing);
 for(const p of expansionPages){
  const en=p.language==='en',url=BASE+p.path;
  const appCta=(en?'/en/?tool=':'/?lang=es&tool=')+encodeURIComponent(p.tool);
  const cta=isToolLanding(p)&&hasInlineTool(p)?'#inline-tool-title':appCta;
  const sourceCategory=isToolLanding(p)?sourceCategories.find(item=>item.toolCategories.includes(toolMap.get(p.tool)?.category)):null;
  const englishCategory=sourceCategory&&englishCategories.find(item=>item.sourceSlug===sourceCategory.slug);
  const categoryHref=sourceCategory?(en?'/en/categories/'+englishCategory.englishSlug+'/':'/categorias/'+sourceCategory.slug+'/'):'';
  const categoryName=sourceCategory?(en?englishCategory.name:sourceCategory.name):'';
  const categoryLink=sourceCategory?'<p><a href="'+esc(categoryHref)+'">'+(en?'Browse category: ':'Ver categoría: ')+esc(categoryName)+' ↗</a></p>':'';
  const body='<main class="seo-main"><section class="'+(isToolLanding(p)?'seo-hero':'seo-directory-hero')+'"><div class="seo-hero-copy"><h1>'+esc(p.title)+'</h1><p class="seo-lead">'+esc(p.intro)+'</p><div class="seo-actions"><a class="seo-cta" href="'+esc(cta)+'">'+(isToolLanding(p)&&hasInlineTool(p)?(en?'Use here':'Usar aquí'):(en?'Open tool':'Abrir herramienta'))+' ↗</a></div></div>'+(isToolLanding(p)?toolOverview(p,p.language):'')+'</section>'+(isToolLanding(p)?inlineToolForm(p.tool,p.language,{...p,h1:p.title}):'')+'<div class="seo-article-sections">'+p.sections.map(([heading,text])=>'<section class="seo-article-section"><h2>'+esc(heading)+'</h2><p>'+esc(text)+'</p></section>').join('')+'</div><section class="seo-faq"><h2>'+(en?'Frequently asked questions':'Preguntas frecuentes')+'</h2>'+p.faqs.map(([q,a])=>'<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('')+'</section><section class="seo-related"><h2>'+(en?'Related resources':'Recursos relacionados')+'</h2>'+[...p.related,...p.sources].map(([href,label])=>'<p><a href="'+esc(href)+'">'+esc(label)+'</a></p>').join('')+categoryLink+'</section></main>';
  const schema={'@context':'https://schema.org','@type':'WebPage',name:p.title,description:p.description,url,inLanguage:p.language};
  let html=(en?englishMarkup:spanishMarkup)(p.title,p.description,url,schema,body,en&&p.pair?BASE+p.pair:undefined);
  html=html.replace(/<link\b[^>]*rel="alternate"[^>]*>/g,'').replace('</head>',alternates(p)+'\n</head>');
  // A locale-only article offers the other language directory, never a false equivalent.
  html=html.replace(/<a class="seo-language-switch"[^>]*>.*?<\/a>/g,'');
  const switchUrl=p.pair||(en?'/guias/':'/en/guides/');
  const switchLabel=p.pair?(en?'Ver en español':'Read in English'):(en?'Guías en español':'Guides in English');
  html=html.replace(/(<nav class="seo-nav"[^>]*>)([\s\S]*?)(<\/nav>)/,'$1$2<a class="seo-language-switch" lang="'+(en?'es':'en')+'" href="'+switchUrl+'">'+switchLabel+'</a>$3');
  const folder=new URL(p.path.slice(1),output);await mkdir(folder,{recursive:true});await writeFile(new URL('index.html',folder),html);
  const directory=p.path.slice(0,p.path.lastIndexOf('/',p.path.length-2)+1);
  const index=new URL(directory.slice(1)+'index.html',output);let listing=await readFile(index,'utf8');
  listing=listing.replace(/(\d+)( fichas| practical tool pages)/g,(_,count,label)=>(Number(count)+1)+label);
  listing=listing.replace(/"numberOfItems":(\d+)/g,(_,count)=>'"numberOfItems":'+(Number(count)+1));
  if(isToolLanding(p)){
   const tool=toolMap.get(p.tool);
   listing=addDirectoryToolCard(listing,p,tool,en?'en':'es');
  }else{
   listing=listing.replace('</main>','<section class="seo-related"><h2><a href="'+p.path+'">'+esc(p.title)+'</a></h2><p>'+esc(p.description)+'</p></section></main>');
  }
  await writeFile(index,listing);
  const links=alternates(p).replaceAll('<link ','<xhtml:link ').replaceAll('>','/>');
  sitemap=sitemap.replace('</urlset>','  <url><loc>'+url+'</loc>'+links+'</url>\n</urlset>');
 }
 for(const group of categoryGroups.values()){
  const en=group.language==='en';
  const categorySlug=en?group.englishCategory.englishSlug:group.category.slug;
  const categoryPath=en?'en/categories/'+categorySlug+'/index.html':'categorias/'+categorySlug+'/index.html';
  let categoryHtml=await readFile(new URL(categoryPath,output),'utf8');
  for(const item of group.pages)categoryHtml=addCategoryToolCard(categoryHtml,item.page,item.tool,group.language);
  await writeFile(new URL(categoryPath,output),categoryHtml);
  const indexPath=en?'en/categories/index.html':'categorias/index.html';
  const categoryIndex=await readFile(new URL(indexPath,output),'utf8');
  const categoryHref=en?'/en/categories/'+categorySlug+'/':'/categorias/'+categorySlug+'/';
  await writeFile(new URL(indexPath,output),updateCategoryIndexCard(categoryIndex,categoryHref,group.language,group.pages.length));
 }
 await writeFile(sitemapFile,sitemap);
}
