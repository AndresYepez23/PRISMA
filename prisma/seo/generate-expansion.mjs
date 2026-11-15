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
  if(!['es','en'].includes(p.language)||!/^\/(?:herramientas|guias|en\/(?:tools|guides|solutions))\/[a-z0-9-]+\/$/.test(p.path))throw Error('Invalid regional page route');
  if(p.path.startsWith('/en/')!==(p.language==='en')||paths.has(p.path)||existing.has(BASE+p.path))throw Error('Duplicate or conflicting page '+p.path);
  if(!tools.some(t=>t.id===p.tool&&t.status!=='soon'))throw Error('Unavailable tool '+p.tool);
  if(!p.title||!p.description||!p.intro||p.sections.length<3||p.faqs.length<2)throw Error('Incomplete page '+p.path);
  paths.set(p.path,p);
 }
 for(const p of pages)if(p.pair){const other=paths.get(p.pair);if(!other||other.pair!==p.path||other.language===p.language||other.tool!==p.tool)throw Error('Invalid reciprocal equivalent '+p.path);}
 return paths;
}
const alternates=p=>{
 if(!p.pair)return '';
 const es=BASE+(p.language==='es'?p.path:p.pair),en=BASE+(p.language==='en'?p.path:p.pair);
 return [['es',es],['en',en],['x-default',es]].map(([lang,url])=>'<link rel="alternate" hreflang="'+lang+'" href="'+url+'">').join('\n');
};
export async function generateExpansionPages(output){
 const sitemapFile=new URL('sitemap.xml',output);let sitemap=await readFile(sitemapFile,'utf8');
 const existing=new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]));
 validateExpansion(expansionPages,existing);
 for(const p of expansionPages){
  const en=p.language==='en',url=BASE+p.path;
  const cta=(en?'/en/?tool=':'/?lang=es&tool=')+encodeURIComponent(p.tool);
  const body='<main class="seo-main"><section class="seo-directory-hero"><h1>'+esc(p.title)+'</h1><p>'+esc(p.intro)+'</p><a class="seo-cta" href="'+esc(cta)+'">'+(en?'Open tool':'Abrir herramienta')+' ↗</a></section><div class="seo-article-sections">'+p.sections.map(([heading,text])=>'<section class="seo-article-section"><h2>'+esc(heading)+'</h2><p>'+esc(text)+'</p></section>').join('')+'</div><section class="seo-faq"><h2>'+(en?'Frequently asked questions':'Preguntas frecuentes')+'</h2>'+p.faqs.map(([q,a])=>'<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('')+'</section><section class="seo-related"><h2>'+(en?'Related resources':'Recursos relacionados')+'</h2>'+[...p.related,...p.sources].map(([href,label])=>'<p><a href="'+esc(href)+'">'+esc(label)+'</a></p>').join('')+'</section></main>';
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
  listing=listing.replace('</main>','<section class="seo-related"><h2><a href="'+p.path+'">'+esc(p.title)+'</a></h2><p>'+esc(p.description)+'</p></section></main>');await writeFile(index,listing);
  const links=alternates(p).replaceAll('<link ','<xhtml:link ').replaceAll('>','/>');
  sitemap=sitemap.replace('</urlset>','  <url><loc>'+url+'</loc>'+links+'</url>\n</urlset>');
 }
 await writeFile(sitemapFile,sitemap);
}
