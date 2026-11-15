// Local-only converters. Keep strict separated-value parsing isolated from the
// legacy CSV callers, whose existing behavior is outside this change.
export function parseSeparatedValues(value,delimiter){
 const text=String(value).replace(/^\uFEFF/,'');
 if(!text.length)throw Error('Pega los datos CSV o TSV que quieres convertir.');
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}
   else if(ch==='"'){quoted=false;closed=true;}
   else cell+=ch;
  }else if(ch===delimiter){row.push(cell);cell='';closed=false;}
  else if(ch==='\n'||ch==='\r'){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   row.push(cell);rows.push(row);row=[];cell='';closed=false;
  }else if(ch==='"'){
   if(cell||closed)throw Error('Comillas inválidas: encierra el campo completo entre comillas y duplica las comillas internas.');
   quoted=true;
  }else{
   if(closed)throw Error('Hay texto después de una comilla de cierre. Revisa el separador seleccionado.');
   cell+=ch;
  }
 }
 if(quoted)throw Error('Falta una comilla de cierre en los datos.');
 // A record terminator finishes the current record; it does not add a new one.
 if(cell!==''||row.length||closed||!/[\r\n]$/.test(text)){row.push(cell);rows.push(row);}
 return rows;
}
export function stringifySeparatedValues(rows,delimiter){
 return rows.map(row=>row.map(value=>{
  const text=String(value);
  return (text===''&&row.length===1)||text.includes(delimiter)||/["\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
 }).join(delimiter)).join('\n');
}
export function convertSeparatedValues(text,parameters={},defaultMode='csv-to-tsv'){
 const mode=parameters.mode||defaultMode;
 if(!['csv-to-tsv','tsv-to-csv'].includes(mode))throw Error('Selecciona CSV a TSV o TSV a CSV.');
 const csvDelimiter=parameters.delimiter||',';
 if(![',',';'].includes(csvDelimiter))throw Error('Selecciona coma o punto y coma como separador CSV.');
 const toTsv=mode==='csv-to-tsv';
 const rows=parseSeparatedValues(text,toTsv?csvDelimiter:'\t');
 const output=stringifySeparatedValues(rows,toTsv?'\t':csvDelimiter);
 const extension=toTsv?'tsv':'csv';
 return {text:output,blob:new Blob([output],{type:(toTsv?'text/tab-separated-values':'text/csv')+';charset=utf-8'}),filename:'prisma-tabla.'+extension,summary:rows.length+' filas convertidas a '+extension.toUpperCase()+'.'};
}

const markdownText=text=>text.replace(/\\/g,'\\\\').replace(/([\[\]*_`])/g,'\\$1');
export function htmlToMarkdown(text){
 if(text.length>200000)throw Error('El HTML debe tener como máximo 200.000 caracteres.');
 // Template contents are inert, including their images, frames and scripts.
 // The parsed nodes are never attached to the live document.
 const template=document.createElement('template');template.innerHTML=text;
 const ignored=new Set(['script','style','iframe','object','embed','template','noscript','svg','canvas','img','link','meta']);
 const convert=node=>{
  if(node.nodeType===3)return markdownText(node.nodeValue||'').replace(/\s+/g,' ');
  if(node.nodeType!==1&&node.nodeType!==11)return '';
  const tag=node.tagName?.toLowerCase()||'';
  if(ignored.has(tag))return '';
  if(tag==='pre'){
   const code=node.textContent||'';
   const fence='`'.repeat([...code.matchAll(/`+/g)].reduce((length,match)=>Math.max(length,match[0].length+1),3));
   return '\n\n'+fence+'\n'+code.replace(/\n$/,'')+'\n'+fence+'\n\n';
  }
  if(tag==='code'){
   const code=node.textContent||'';
   const fence='`'.repeat([...code.matchAll(/`+/g)].reduce((length,match)=>Math.max(length,match[0].length+1),1));
   return fence+' '+code+' '+fence;
  }
  const inner=[...node.childNodes].map(convert).join('');
  if(/^h[1-6]$/.test(tag))return '\n\n'+'#'.repeat(Number(tag[1]))+' '+inner.trim()+'\n\n';
  switch(tag){
   case 'strong':case 'b':return '**'+inner+'**';
   case 'em':case 'i':return '*'+inner+'*';
   case 'a':{
    const href=(node.getAttribute('href')||'').replace(/[\u0000-\u0020\u007f]/g,'');
    if(!href)return inner;
    try{if(!['http:','https:'].includes(new URL(href,'https://prismaspace.space/').protocol))return inner;}catch{return inner;}
    return '['+inner+']('+href.replace(/[()<>\\]/g,ch=>'%'+ch.charCodeAt(0).toString(16).toUpperCase())+')';
   }
   case 'li':{
    const siblings=[...node.parentNode.children].filter(child=>child.tagName==='LI');
    const marker=node.parentNode.tagName==='OL'?(siblings.indexOf(node)+1)+'. ':'- ';
    return '\n'+marker+inner.trim();
   }
   case 'ul':case 'ol':return '\n'+inner+'\n\n';
   case 'blockquote':return '\n\n'+inner.trim().split('\n').map(line=>'> '+line).join('\n')+'\n\n';
   case 'br':return '\n';
   case 'p':case 'div':case 'section':case 'article':return '\n\n'+inner.trim()+'\n\n';
   case 'tr':return inner.trim()+'\n';
   case 'td':case 'th':return inner+' ';
   default:return inner;
  }
 };
 return {text:convert(template.content).replace(/\n{3,}/g,'\n\n').trim(),summary:'HTML básico convertido localmente. No conserva estilos, imágenes ni tablas complejas.'};
}
