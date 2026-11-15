import {extractPayload,isInformationalIntent} from './core-capabilities.js';
import {parsePdfPageSelection} from './pdf-split-options.js';
const inspections=new WeakMap();
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const labels={pdf:'PDF',docx:'Word (.docx)',image:'imagen',video:'vídeo',audio:'audio',text:'texto',csv:'CSV',json:'JSON',excel:'Excel',zip:'ZIP'};
const kindOf=value=>/pdf/.test(value)?'pdf':/docx|wordprocessingml|\bword\b/.test(value)?'docx':/image|foto|png|jpe?g|webp|gif|bmp|svg/.test(value)?'image':/video|mp4|mov|mkv|webm|avi/.test(value)?'video':/audio|mp3|wav|ogg|flac|aac|m4a/.test(value)?'audio':/csv/.test(value)?'csv':/json/.test(value)?'json':/xlsx?|spreadsheet/.test(value)?'excel':/text|txt|markdown|html?/.test(value)?'text':'';
const blocked=(code,message)=>({ok:false,code,message});
export const fileValidationError=(code,message)=>Object.assign(Error(message),{code,fileValidation:true});
export async function inspectExecutionFile(file,inspect){
 if(!file||typeof file.slice!=='function'||!Number.isFinite(file.size))throw fileValidationError('UNREADABLE_FILE','No puedo leer el archivo adjunto. Vuelve a adjuntarlo desde una copia local.');
 if(!file.size)throw fileValidationError('EMPTY_FILE','«'+file.name+'» está vacío. Adjunta un archivo con contenido.');
 if(file.size>100*1024*1024)throw fileValidationError('FILE_SIZE_LIMIT','«'+file.name+'» supera el límite local de 100 MB. Divide o reduce el archivo antes de procesarlo.');
 if(!inspections.has(file)){
  const promise=(async()=>{
   let result;try{result=await inspect(file);}catch(error){
    if(error.fileValidation)throw error;
    if(/fetch|import|network|cargar.*motor/i.test(String(error.message)))throw fileValidationError('INSPECTION_UNAVAILABLE','No pude cargar el lector local de archivos. Comprueba la conexión e inténtalo más tarde; no se ha ejecutado la operación.');
    throw fileValidationError('UNREADABLE_FILE','No pude leer la estructura de «'+file.name+'». Puede estar incompleto o no ser compatible; prueba a abrirlo y guardarlo de nuevo.');
   }
   const evidence=result?.inspection||result;
   if(!evidence||typeof evidence.kind!=='string')throw fileValidationError('INSPECTION_UNAVAILABLE','No pude comprobar el tipo de «'+file.name+'». Inténtalo más tarde o usa una copia legible.');
   return evidence;
  })();
  inspections.set(file,promise);promise.catch(()=>inspections.delete(file));
 }
 const evidence=await inspections.get(file);
 if(evidence.requiresPassword||evidence.restricted)throw fileValidationError('PROTECTED_FILE','«'+file.name+'» está protegido. Este motor no admite introducir su contraseña: abre una copia autorizada y guárdala sin protección antes de adjuntarla.');
 if(evidence.readable===false)throw fileValidationError('UNREADABLE_FILE','No pude leer «'+file.name+'» como '+(labels[evidence.kind]||'archivo')+'. Puede estar dañado o incompleto; comprueba que se abre correctamente y vuelve a guardarlo.');
 const extension=norm(file.name).split('.').pop(),mime=norm(file.type);
 const declared=[kindOf(extension),mime==='application/octet-stream'?'':kindOf(mime)].filter(Boolean);
 const imageFormats={jpeg:'jpg',jpg:'jpg',png:'png',webp:'webp',gif:'gif'};
 const declaredImages=[imageFormats[extension],imageFormats[mime.replace('image/','')]].filter(Boolean);
 if(evidence.format&&declaredImages.some(format=>format!==evidence.format))throw fileValidationError('FORMAT_MISMATCH','Los bytes de «'+file.name+'» son '+evidence.format.toUpperCase()+', pero su extensión o MIME indica otro formato. Adjunta el archivo con su formato correcto.');
 if(evidence.kind&&declared.some(kind=>kind!==evidence.kind))throw fileValidationError('FORMAT_MISMATCH','El contenido de «'+file.name+'» es '+(labels[evidence.kind]||evidence.kind)+', pero su extensión o MIME indica otro formato. Adjunta el original con su formato correcto.');
 if(!evidence.kind&&declared.some(kind=>['pdf','docx','image'].includes(kind)))throw fileValidationError('UNRECOGNIZED_FORMAT','No reconozco la estructura de «'+file.name+'» como '+labels[declared[0]]+'. La extensión no basta para convertirlo; comprueba el archivo original.');
 return evidence;
}
export async function validateFileRequest(text,files,{inspect,tools=[]}={}){
 const instruction=extractPayload(text).instruction;
 if(isInformationalIntent(text))return {ok:true};
 const q=norm(instruction).split(/[,;.!?]|\s+(?:pero|y)\s+/).filter(s=>!/^\s*(?:no\b|sin\b|nunca\b)/.test(s)).join(' ');
 if(!/\b(?:conviert\w*|convertir|transform\w*|comprim\w*|extra\w*|une|unir|fusion\w*|junta\w*|divide\w*|dividir|recorta\w*|redimensiona\w*|quita\w*|elimina\w*|rota\w*|gira\w*|procesa\w*|ocr)\b/.test(q))return {ok:true};
 const source=q.match(/\b(?:este|esta|estos|estas|el|la|los|las|del|desde|de)\s+(?:(?:archivo|documento)\s+)?(pdf|docx|word|video|imagen|foto|audio|csv|json|excel)\b/);
 if(!files.length)return source||/\b(?:este|el|un|los|estos)\s+(?:archivo|documento)s?\b/.test(q)?blocked('MISSING_FILE','Adjunta el archivo de origen para «'+instruction.slice(0,120)+'». Comprobaré su formato antes de ejecutar.'):{ok:true};
 const numbers={dos:2,tres:3,cuatro:4,cinco:5,seis:6};
 const exact=q.match(/\b(?:une|unir|fusiona|junta|combina)\s+(?:(?:estos|los|mis)\s+)?(\d+|dos|tres|cuatro|cinco|seis)\s+(?:pdf|archivos|documentos)\b/);
 const required=exact&&(numbers[exact[1]]||Number(exact[1]));
 if(required&&files.length!==required)return blocked('FILE_COUNT','Pediste unir '+required+' archivos, pero hay '+files.length+' adjunto(s). '+(files.length<required?'Adjunta '+(required-files.length)+' más o indica que use solo los actuales.':'Indica cuáles quieres unir antes de continuar.'));
 try{
  const evidence=[];
  for(const file of files){
   const item=await inspectExecutionFile(file,inspect);evidence.push(item);
   const expected=source&&kindOf(source[1]);
   if(expected&&item.kind&&item.kind!==expected)return blocked('SOURCE_CONTRADICTION','El archivo «'+file.name+'» está en formato '+(labels[item.kind]||item.kind)+', no en '+labels[expected]+'. ¿Quieres convertirlo a '+labels[expected]+' o realizar otra operación?');
   const page=q.match(/\bpaginas?\s+(\d+)(?:\s*(?:a|-)\s*(\d+))?/);
   if(item.kind==='pdf'&&item.pages&&page&&Math.max(Number(page[1]),Number(page[2]||page[1]))>item.pages)return blocked('PAGE_RANGE','El documento tiene '+item.pages+' páginas; no puedo seleccionar la página '+(page[2]||page[1])+'. Elige una página entre la 1 y la '+item.pages+'.');
   if(item.kind==='pdf'&&item.hasSelectableText===false&&/\b(?:a|en)\s+(?:excel|xlsx)\b/.test(q)&&!/\b(?:ocr|reconoce|reconocer)\b/.test(q))return blocked('OCR_REQUIRED','No encontré texto seleccionable en las páginas comprobadas. '+(tools.some(t=>t.id==='image-ocr'&&['ready','beta'].includes(t.status))?'El escaneo necesita OCR antes de preparar Excel; indica las columnas o el formato de la tabla. El reconocimiento puede contener errores.':'No hay un motor OCR disponible para este escaneo; adjunta texto o una tabla legible.'));
  }
  return {ok:true,evidence};
 }catch(error){return blocked(error.code||'FILE_INSPECTION_FAILED',error.message);}
}
export async function validateFileToolInputs(tool,files,params,{inspect}={}){
 if(!tool||!['ready','beta'].includes(tool.status))throw fileValidationError('TOOL_UNAVAILABLE','La herramienta solicitada no está disponible. Elige una herramienta activa de Prisma.');
 if(!tool.file||['file-inspector','hash-file'].includes(tool.id))return;
 if(!files.length)throw fileValidationError('MISSING_FILE','«'+tool.name+'» necesita un archivo adjunto. Selecciona el archivo antes de ejecutar.');
 if(tool.id==='pdf-merge'&&files.length<2)throw fileValidationError('FILE_COUNT','Para unir PDF necesito al menos dos documentos. Adjunta el que falta.');
 if(tool.maxFiles&&files.length>tool.maxFiles)throw fileValidationError('FILE_COUNT','«'+tool.name+'» admite como máximo '+tool.maxFiles+' archivos. Divide el lote.');
 const accepted=String(tool.accept||'*/*').toLowerCase().split(',').map(x=>x.trim());
 for(const file of files){
  const item=await inspectExecutionFile(file,inspect);
  const matches=accepted.some(a=>a==='*/*'||a[0]==='.'&&norm(file.name).endsWith(a)||a.endsWith('/*')&&norm(file.type).startsWith(a.slice(0,-1))||norm(file.type)===a);
  if(!matches)throw fileValidationError('INCOMPATIBLE_FILE','«'+tool.name+'» no admite '+(labels[item.kind]||'el formato de')+' «'+file.name+'». Adjunta un archivo compatible ('+tool.accept+').');
  if(['pdf-to-word','pdf-text'].includes(tool.id)&&item.hasSelectableText===false&&item.textCheckedPages===item.pages)throw fileValidationError('OCR_REQUIRED','No encontré texto seleccionable en «'+file.name+'». El documento necesita OCR antes de extraer texto o convertirlo a Word; no generaré un archivo vacío.');
  if(item.kind==='pdf'&&item.pages&&params.pages)try{parsePdfPageSelection(params.pages,item.pages);}catch{throw fileValidationError('PAGE_RANGE','El documento tiene '+item.pages+' páginas. Revisa la selección «'+params.pages+'»; usa páginas entre 1 y '+item.pages+'.');}
 }
}

// Read the bounded ZIP directory, without inflating entries or executing data.
// This identifies the Office container, not the fidelity of its document content.
export async function inspectArchiveFormat(file){
 const tail=new Uint8Array(await file.slice(Math.max(0,file.size-65557)).arrayBuffer());
 const end=new DataView(tail.buffer);let offset=-1;
 for(let i=tail.length-22;i>=0;i--)if(end.getUint32(i,true)===0x06054b50&&i+22+end.getUint16(i+20,true)===tail.length){offset=i;break;}
 if(offset<0)throw Error('El contenedor ZIP no tiene un directorio válido.');
 const count=end.getUint16(offset+10,true),size=end.getUint32(offset+12,true),start=end.getUint32(offset+16,true);
 if(count>1000||size>1024*1024||start+size>file.size-tail.length+offset||end.getUint16(offset+4,true)||end.getUint16(offset+6,true))throw Error('El directorio ZIP supera los límites de inspección o usa un formato no admitido.');
 const buffer=await file.slice(start,start+size).arrayBuffer(),view=new DataView(buffer),names=new Set();
 let cursor=0,expanded=0;
 for(let i=0;i<count;i++){
  if(cursor+46>size||view.getUint32(cursor,true)!==0x02014b50)throw Error('El directorio ZIP está dañado.');
  const length=view.getUint16(cursor+28,true),next=cursor+46+length+view.getUint16(cursor+30,true)+view.getUint16(cursor+32,true);
  expanded+=view.getUint32(cursor+24,true);
  if(next>size||expanded>50*1024*1024)throw Error('El ZIP excede el límite de contenido expandido para inspección.');
  names.add(new TextDecoder().decode(new Uint8Array(buffer,cursor+46,length)));cursor=next;
 }
 if(cursor!==size)throw Error('El tamaño del directorio ZIP no coincide.');
 if(names.has('[Content_Types].xml')){
  if(names.has('word/document.xml'))return {kind:'docx',signature:'DOCX (directorio ZIP de Word)'};
  if(names.has('xl/workbook.xml'))return {kind:'excel',signature:'XLSX (directorio ZIP de Excel)'};
  if(names.has('ppt/presentation.xml'))return {kind:'pptx',signature:'PPTX (directorio ZIP de PowerPoint)'};
 }
 return {kind:'zip',signature:'ZIP (sin estructura Office reconocida)'};
}
