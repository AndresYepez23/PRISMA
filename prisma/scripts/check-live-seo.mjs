import {readFile} from 'node:fs/promises';

const base='https://prismaspace.space';
const xml=await readFile(new URL('../dist/sitemap.xml',import.meta.url),'utf8');
const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].replaceAll('&amp;','&'));
if(!urls.length||new Set(urls).size!==urls.length)throw Error('Sitemap vacío o con URLs duplicadas.');
const failures=[];
async function inspect(url,expected=200){
 let current=url,redirects=0;
 const seen=new Set();
 for(;;){
  if(seen.has(current)||redirects>5)throw Error('Redirección circular o demasiado larga');
  seen.add(current);
  const response=await fetch(current,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'PrismaSEOCheck/1.0'}});
  if([301,302,307,308].includes(response.status)){
   current=new URL(response.headers.get('location'),current).href;
   if(!current.startsWith(base+'/'))throw Error('Redirección fuera del sitio');
   redirects++;continue;
  }
  if(response.status!==expected)throw Error('HTTP '+response.status+' (se esperaba '+expected+')');
  const html=await response.text();
  if(!/text\/html/i.test(response.headers.get('content-type')||''))throw Error('No es HTML');
  if(expected===404){if(!/name="robots" content="noindex/.test(html))throw Error('404 sin noindex');return;}
  if(current!==url)throw Error('URL del sitemap redirige a '+current);
  const canonical=[...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/g)];
  if(canonical.length!==1||canonical[0][1]!==url)throw Error('Canonical incorrecto o duplicado');
  if((html.match(/<h1\b/g)||[]).length!==1)throw Error('Número de H1 distinto de uno');
  if(!/<meta name="description" content="[^"]+"/.test(html))throw Error('Falta metadescripción');
  if(!/<title>[^<]+<\/title>/.test(html)||/\| Prisma Space \| Prisma Space/.test(html.match(/<title>[^<]+<\/title>/)?.[0]||''))throw Error('Título inválido');
  if(!/name="robots" content="index,follow/.test(html)&&!['/','/en/'].includes(new URL(url).pathname))throw Error('Directiva index ausente');
  if(/<title>Prisma Space — Crea, convierte y experimenta<\/title>/.test(html)&&url!==base+'/')throw Error('Portada servida como soft 404');
  return;
 }
}
let cursor=0;
await Promise.all(Array.from({length:6},async()=>{
 for(;;){
  const index=cursor++;if(index>=urls.length)return;
  try{await inspect(urls[index]);}catch(error){failures.push({url:urls[index],error:error.message});}
 }
}));
try{await inspect(base+'/nonexistent-seo-route-check-1737/',404);}catch(error){failures.push({url:'404 probe',error:error.message});}
console.log(JSON.stringify({checked:urls.length,passed:urls.length+1-failures.length,failed:failures.length,failures:failures.slice(0,20)},null,2));
if(failures.length)process.exitCode=1;
