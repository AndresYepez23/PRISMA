import {readFile,writeFile} from 'node:fs/promises';
import {tools} from '../src/registry.js';
import {hasInlineTool} from './inline-tool.mjs';
import {SEO_BASE as BASE} from './config.mjs';

// These published support addresses must remain usable without Cloudflare's
// decoder script. Opt out per link, preserving the zone-wide protection.
export function preserveContactLinks(html){
 return html.replace(/<!--email_off-->[\s\S]*?<!--\/email_off-->|<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<a\b[^>]*\bhref="mailto:[^"]*"[^>]*>[\s\S]*?<\/a>/gi,tag=>/^<a\b/i.test(tag)?'<!--email_off-->'+tag+'<!--/email_off-->':tag);
}

// This pass improves shared navigation after all existing generators have run.
// Public routes, canonical, language alternates and sitemap entries are untouched.
export async function enhancePublicPages(output){
 const sitemap=await readFile(new URL('sitemap.xml',output),'utf8');
 const paths=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
 const source=JSON.parse(await readFile(new URL('pages.json',import.meta.url),'utf8')).pages;
 const english=JSON.parse(await readFile(new URL('pages.en.json',import.meta.url),'utf8')).pages;
 const expansion=JSON.parse(await readFile(new URL('expansion-pages.json',import.meta.url),'utf8'));
 const toolMap=new Map(tools.map(t=>[t.id,t]));
 const byPath=new Map([...source.map(p=>['/herramientas/'+p.slug+'/',p.tool]),...english.map(p=>['/en/tools/'+p.englishSlug+'/',p.tool]),...expansion.filter(p=>/\/(?:herramientas|tools)\//.test(p.path)).map(p=>[p.path,p.tool])]);
 let enhanced=0;
 for(const pathname of paths){
  const file=new URL(pathname.slice(1)+(pathname.endsWith('/')?'index.html':'.html'),output);
  let html=await readFile(file,'utf8');
  const en=pathname.startsWith('/en/'),label=(es,english)=>en?english:es;
  if(!html.includes('<main'))throw Error('Public page has no main landmark: '+pathname);
  html=html.replace(/<main\b([^>]*)>/,(tag,attrs)=>/\bid=/.test(attrs)?tag:'<main id="page-main"'+attrs+'>');
  const target=html.match(/<main\b[^>]*\bid="([^"]+)"/)?.[1];
  const skip='<a class="prisma-skip-link" href="#'+target+'">'+label('Saltar al contenido','Skip to content')+'</a>';
  html=html.replace(/(<body\b[^>]*>)/,'$1'+skip);
  // The SEO shell has a complete native mobile menu, including the links that
  // the old narrow header hid. Core retains its existing application sidebar.
  if(html.includes('class="seo-page"')){
   if(!byPath.has(pathname)){
    html=html.replace(/href="([^"]+)"/g,(attribute,href)=>{
     const destination=new URL(href.replaceAll('&amp;','&'),BASE);
     if(destination.origin!==BASE||!['/','/en/'].includes(destination.pathname))return attribute;
     const id=destination.searchParams.get('tool');
     if(!id)return attribute;
     const records=en?english:source;
     const matches=records.filter(p=>p.tool===id&&hasInlineTool(p)&&(!destination.searchParams.has('format')||p.format===destination.searchParams.get('format')));
     if(matches.length!==1)return attribute;
     const route=en?'/en/tools/'+matches[0].englishSlug+'/':'/herramientas/'+matches[0].slug+'/';
     return 'href="'+route+'#inline-tool-title"';
    });
   }
   const nav=html.match(/<nav class="seo-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
   const links=[...nav.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].filter(m=>!m[0].includes('seo-language-switch')).map(m=>m[0].replace(/ class="[^"]*"/g,'')).join('');
   const menu='<details class="seo-browse"><summary>'+label('Menú','Menu')+'</summary><nav aria-label="'+label('Navegación móvil','Mobile navigation')+'">'+links+'</nav></details>';
   html=html.replace('</div></header>',menu+'</div></header>');
   html=html.replace('</footer>','<a class="seo-contact" href="mailto:proyectosmetas25@gmail.com">'+label('Contacto y problemas con herramientas','Contact and tool support')+'</a></footer>');
   const listPage=/^\/(?:en\/)?(?:herramientas|tools|categorias|categories|guias|guides|soluciones|solutions)\/$/.test(pathname)||/^\/(?:en\/categories|categorias)\/[^/]+\/$/.test(pathname);
   let count=0;
   const headings=[];
   html=html.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/g,(tag,attrs,text)=>{
    const id=attrs.match(/\bid="([^"]+)"/)?.[1]||'page-section-'+(++count);
    if(!/\bid=/.test(attrs))tag='<h2 id="'+id+'"'+attrs+'>'+text+'</h2>';
    if(!/seo-(?:directory|hub|tool)-card/.test(text))headings.push({id,text:text.replace(/<[^>]*>/g,'')});
    return tag;
   });
   if(headings.length>1&&!listPage){
    const toc='<details class="seo-page-contents"><summary>'+label('En esta página','On this page')+'</summary><nav aria-label="'+label('Secciones de la página','Page sections')+'">'+headings.slice(0,12).map(h=>'<a href="#'+h.id+'">'+h.text+'</a>').join('')+'</nav></details>';
    html=html.replace(/(<main\b[^>]*>)/,'$1'+toc);
   }

   if(listPage){
    let cards=0;
    html=html.replace(/<a class="(seo-(?:directory|tool|hub)-card)" href="([^"]+)"/g,(tag,cls,href)=>{
     cards++;const tool=toolMap.get(byPath.get(href)),local=tool&&['local','browser'].includes(tool.mode);
     return tag+' data-catalog-card data-mode="'+(tool?(local?'local':'connected'):'resource')+'"';
    });
    const search='<form class="seo-catalog-search" data-catalog-search hidden role="search"><label for="catalog-query">'+label('Encuentra una herramienta o recurso','Find a tool or resource')+'</label><div><input id="catalog-query" type="search" placeholder="'+label('Ej.: PDF, imagen, CSV, referencias…','E.g. PDF, image, CSV, references…')+'" autocomplete="off"><select aria-label="'+label('Tipo de procesamiento','Processing type')+'"><option value="all">'+label('Todos','All')+'</option><option value="local">'+label('En tu dispositivo','On your device')+'</option><option value="connected">'+label('Servicio conectado','Connected service')+'</option></select><button type="reset">'+label('Limpiar','Clear')+'</button></div><p role="status" aria-live="polite"></p></form>';
    if(cards)html=html.includes('<div class="seo-tags">')?html.replace('<div class="seo-tags">',search+'<div class="seo-tags">'):html.replace(/(<section class="seo-(?:category|hub-section)|<div class="seo-hub-grid)/,search+'$1');
   }
   html=html.replace('</body>','<script type="module" src="/src/public-pages.js"></script></body>');
  }
  // The institutional documents share keyboard access with the rest of the site.
  if(!html.includes('class="seo-page"'))html=html.replace('</head>','<style>.prisma-skip-link{position:fixed;top:8px;left:8px;z-index:10000;transform:translateY(-200%);padding:10px 16px;background:#91dbd5;color:#142432;border-radius:8px}.prisma-skip-link:focus{transform:none}</style></head>');
  await writeFile(file,preserveContactLinks(html));enhanced++;
 }
 console.log('Prisma experience: '+enhanced+' existing public pages enhanced; '+byPath.size+' tool routes preserved.');
}
