import {tools} from '../src/registry.js';
import {toolContract,toolOutcome} from './tool-experience.mjs';
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const inlineToolIds=new Set(['pdf-split','image-strip-metadata','pdf-merge','image-compress','html-format','js-format','citation-generator']);
const directFilePages=new Set(['pdf-a-word','pdf-a-jpg','jpg-a-pdf','png-a-pdf','imagen-a-texto','collage-de-fotos','ver-metadatos-exif','comprimir-pdf','extraer-texto-pdf','redimensionar-imagen','recortar-imagen']);
export const hasInlineTool=page=>tools.some(tool=>tool.id===page.tool&&['local','browser'].includes(tool.mode)&&tool.status!=='soon');

function fileToolForm(id,language){
 const en=language==='en',pdf=id==='pdf-split',merge=id==='pdf-merge',compress=id==='image-compress';
 const label=(es,english)=>en?english:es;
 const input=(name,title,type,value,extra='')=>'<label data-split-field="'+name+'" hidden>'+esc(title)+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+' disabled></label>';
 const options=pdf?'<label>'+label('Forma de división','Split mode')+'<select name="mode"><option value="all">'+label('Cada página','Every page')+'</option><option value="selected">'+label('Páginas concretas','Selected pages')+'</option><option value="ranges">'+label('Un PDF por rango','One PDF per range')+'</option><option value="parts">'+label('Número de partes','Number of parts')+'</option><option value="chunk">'+label('Bloques de páginas','Page blocks')+'</option></select></label>'+
  input('pages',label('Páginas (ejemplo: 2, 4-6)','Pages (example: 2, 4-6)'),'text','', 'placeholder="2, 4-6"')+
  input('ranges',label('Rangos (ejemplo: 1-4; 5-8)','Ranges (example: 1-4; 5-8)'),'text','', 'placeholder="1-4; 5-8"')+
  input('parts',label('Partes (2 a 20)','Parts (2 to 20)'),'number','2','min="2" max="20" step="1"')+
  input('chunkSize',label('Páginas por bloque (1 a 200)','Pages per block (1 to 200)'),'number','3','min="1" max="200" step="1"')+
  '<p class="seo-inline-preview" aria-live="polite">'+label('Selecciona un PDF para ver el plan de división.','Select a PDF to preview the split plan.')+'</p>':
  merge?'<div class="seo-inline-wide"><strong>'+label('Orden de los PDF','PDF order')+'</strong><p>'+label('Selecciona al menos dos archivos. Usa las flechas para ajustar el orden antes de unirlos.','Select at least two files. Use the arrows to set their order before merging.')+'</p><ol class="seo-inline-order" aria-live="polite"></ol></div>':
  compress?'<label>'+label('Calidad (10 a 100)','Quality (10 to 100)')+'<input name="quality" type="number" value="78" min="10" max="100" step="1" required></label><label>'+label('Formato de salida','Output format')+'<select name="format"><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option></select></label>':'';
 const description=pdf?
  label('El PDF se procesa en este navegador. Un resultado se descarga como PDF; varios se agrupan en un ZIP.','The PDF is processed in this browser. One result downloads as a PDF; multiple results are packaged in a ZIP.'):
  merge?label('Une PDF en el orden mostrado abajo, sin subir los archivos. Comprueba el resultado antes de entregarlo.','Merge PDFs in the order shown below without uploading the files. Check the result before submitting it.'):
  compress?label('Elige WebP o JPG y ajusta calidad. Se conservan los píxeles originales; el archivo final puede ser incluso mayor.','Choose WebP or JPG and adjust quality. Pixel dimensions stay the same; the output may even be larger.'):
  label('Ejemplo: una foto con ubicación GPS y datos de cámara se vuelve a codificar sin los metadatos EXIF habituales. Revisa el nombre del archivo y cualquier dirección o rostro visible: esta herramienta no los oculta.','Example: a photo with GPS location and camera details is re-encoded without common EXIF metadata. Check the filename and any visible address or face: this tool does not hide them.');
 const fallback=en?'/en/?tool='+id:'/?tool='+id+'&amp;lang=es';
 const fileLabel=pdf||merge?label(merge?'Archivos PDF':'Archivo PDF',merge?'PDF files':'PDF file'):label('Imagen JPEG, PNG o WebP','JPEG, PNG or WebP image');
 const submit=pdf?label('Dividir y preparar descarga','Split and prepare download'):merge?label('Unir y preparar descarga','Merge and prepare download'):compress?label('Comprimir y preparar descarga','Compress and prepare download'):label('Eliminar EXIF y preparar descarga','Remove EXIF and prepare download');
 return '<section class="seo-panel seo-inline-tool" aria-labelledby="inline-tool-title"><h2 id="inline-tool-title">'+label('Usar esta herramienta aquí','Use this tool here')+'</h2><p>'+description+'</p><form data-seo-inline-tool="'+id+'" class="seo-inline-form"><label>'+fileLabel+'<input name="file" type="file" accept="'+(pdf||merge?'.pdf,application/pdf':'image/jpeg,image/png,image/webp')+'"'+(merge?' multiple':'')+' required></label>'+options+'<button type="submit" class="seo-cta">'+submit+'</button><p class="seo-inline-status" role="status" aria-live="polite"></p><a class="seo-cta seo-inline-download" hidden download>'+label('Descargar resultado','Download result')+'</a>'+(pdf||merge?'':'<img class="seo-inline-image" alt="'+label(compress?'Vista previa de la imagen comprimida':'Vista previa de la imagen sin metadatos',compress?'Preview of the compressed image':'Preview of the image without metadata')+'" hidden>')+'</form><p><a href="'+fallback+'">'+label('Abrir en Prisma Core','Open in Prisma Core')+' ↗</a></p></section><script type="module" src="/src/seo-inline-tools.js"></script>';
}

function directFileForm(id,language,page){
 const en=language==='en',slug=page.sourceSlug||page.slug,label=(es,english)=>en?english:es;
 const multi=['image-pdf','image-collage'].includes(id);
 const accept=slug==='jpg-a-pdf'?'image/jpeg,.jpg,.jpeg':slug==='png-a-pdf'?'image/png,.png':
  ['pdf-to-word','pdf-to-image','pdf-compress','pdf-text'].includes(id)?'.pdf,application/pdf':'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
 const notes={
  'pdf-to-word':label('Selecciona un PDF digital con texto seleccionable. El DOCX puede necesitar ajustes de diseño.','Choose a digital PDF with selectable text. The DOCX may need layout corrections.'),
  'pdf-to-image':label('Obtendrás un ZIP con un JPG por página seleccionada.','You will get a ZIP with one JPG per selected page.'),
  'image-pdf':label('Cada imagen ocupa una página; revisa el orden antes de convertir.','Each image gets one page; check the selection order before converting.'),
  'image-ocr':label('El OCR entrega texto, no una copia del diseño. La primera ejecución descarga el modelo de idioma. Revisa cifras y nombres.','OCR returns text, not a copy of the layout. The first run downloads the language model. Check numbers and names.'),
  'image-collage':label('Selecciona entre 2 y 12 fotos. La cuadrícula recorta cada celda automáticamente.','Select 2 to 12 photos. The grid crops each cell automatically.'),
  'image-metadata':label('Consulta los datos EXIF presentes sin modificar la imagen.','Read existing EXIF details without changing the image.'),
  'pdf-compress':label('Se reescribe la estructura del PDF; el archivo resultante no siempre es más pequeño.','The PDF structure is rewritten; the result is not always smaller.'),
  'pdf-text':label('Extrae la capa de texto de un PDF digital. Un escaneo necesita OCR.','Extract the text layer from a digital PDF. A scan needs OCR.'),
  'image-resize':label('Ajusta las dimensiones en píxeles y revisa la imagen descargada.','Set pixel dimensions and review the downloaded image.'),
  'image-crop':label('El recorte es centrado; no permite mover el foco.','The crop is centered; its focus cannot be moved.')
 };
 const options=id==='pdf-to-image'?'<input type="hidden" name="format" value="jpeg"><label>'+label('Páginas (opcional)','Pages (optional)')+'<input name="pages" placeholder="1-3, 5" maxlength="80"></label><label>'+label('Resolución','Resolution')+'<select name="scale"><option value="1">'+label('Estándar','Standard')+'</option><option value="1.5" selected>'+label('Alta','High')+'</option><option value="2">'+label('Muy alta','Very high')+'</option></select></label>':
  id==='image-pdf'?'<label>'+label('Tamaño de página','Page size')+'<select name="pageSize"><option value="a4">A4</option><option value="letter">'+label('Carta','Letter')+'</option><option value="fit">'+label('Ajustar a la imagen','Fit to image')+'</option></select></label>':
  id==='image-ocr'?'<label>'+label('Idioma del texto','Text language')+'<select name="language"><option value="spa"'+(en?'':' selected')+'>'+label('Español','Spanish')+'</option><option value="eng"'+(en?' selected':'')+'>'+label('Inglés','English')+'</option><option value="spa+eng">'+label('Español e inglés','Spanish and English')+'</option></select></label>':
  id==='image-collage'?'<label>'+label('Fondo','Background')+'<select name="background"><option value="#ffffff">'+label('Blanco','White')+'</option><option value="#101218">'+label('Oscuro','Dark')+'</option><option value="#9adbd2">'+label('Turquesa','Turquoise')+'</option></select></label>':
  id==='image-resize'?'<label>'+label('Ancho (px)','Width (px)')+'<input type="number" name="width" value="1200" min="1" max="12000" required></label><label>'+label('Alto (px)','Height (px)')+'<input type="number" name="height" value="800" min="1" max="12000" required></label><label class="seo-inline-wide seo-inline-check"><input type="checkbox" name="keep" checked> '+label('Mantener proporción','Keep aspect ratio')+'</label>':
  id==='image-crop'?'<label>'+label('Ancho del recorte (%)','Crop width (%)')+'<input type="number" name="widthPct" value="80" min="10" max="100" required></label><label>'+label('Alto del recorte (%)','Crop height (%)')+'<input type="number" name="heightPct" value="80" min="10" max="100" required></label>':'';
 const query=new URLSearchParams({tool:id,...(language==='es'?{lang:'es'}:{}),...(page.format?{format:page.format}:{})});
 const fallback=(en?'/en/':'/')+'?'+query.toString().replaceAll('&','&amp;');
 const resultText=['image-ocr','image-metadata','pdf-text'].includes(id);
 return '<section class="seo-panel seo-inline-tool" aria-labelledby="inline-tool-title"><div class="seo-section-label">'+label('HERRAMIENTA','TOOL')+'</div><h2 id="inline-tool-title">'+label('Usar aquí: ','Use here: ')+esc(page.h1)+'</h2><p>'+notes[id]+'</p><form data-seo-inline-tool="'+id+'" data-max-files="'+(id==='image-collage'?12:multi?20:1)+'" class="seo-inline-form"><label class="seo-inline-wide">'+label(multi?'Archivos en orden de selección':'Archivo',multi?'Files in selection order':'File')+'<input name="file" type="file" accept="'+accept+'"'+(multi?' multiple':'')+' required></label>'+options+'<button type="submit" class="seo-cta">'+label('Procesar archivo','Process file')+'</button><p class="seo-inline-status" role="status" aria-live="polite"></p>'+(multi?'<ol class="seo-inline-order seo-inline-wide" aria-live="polite"></ol>':'')+'<a class="seo-cta seo-inline-download" hidden download>'+label('Descargar resultado','Download result')+'</a>'+(resultText?'<pre class="seo-inline-result" tabindex="0" hidden></pre>':'<img class="seo-inline-image" alt="'+label('Vista previa del resultado','Result preview')+'" hidden>')+'</form><p><a href="'+fallback+'">'+label('Abrir en Prisma Core','Open in Prisma Core')+' ↗</a></p></section><script type="module" src="/src/seo-inline-tools.js"></script>';
}

export function inlineToolForm(id,language,page){
 if(page&&directFilePages.has(page.sourceSlug||page.slug))return directFileForm(id,language,page);
 if(['pdf-split','image-strip-metadata','pdf-merge','image-compress'].includes(id))return fileToolForm(id,language);
 if(!['html-format','js-format','citation-generator'].includes(id))return page?sharedToolForm(page,language):'';
 const en=language==='en',citation=id==='citation-generator';
 const label=(es,english)=>en?english:es;
 const field=(name,title,required=false)=>'<label>'+esc(title)+'<input name="'+name+'" maxlength="300"'+(required?' required':'')+'></label>';
 const controls=citation?
  field('author',label('Autor','Author'),true)+field('year',label('Año','Year'),true)+field('title',label('Título','Title'),true)+
  field('source',label('Revista o editorial','Journal or publisher'))+field('doi','DOI')+field('url','URL')+
  '<label>'+label('Estilo','Style')+'<select name="style"><option value="apa">APA 7</option><option value="vancouver">Vancouver</option><option value="mla">MLA 9</option></select></label>':
  '<label class="seo-inline-wide">'+label('Código fuente','Source code')+'<textarea name="text" rows="8" maxlength="250000" required spellcheck="false"></textarea></label>'+
  '<label>'+label('Sangría','Indentation')+'<select name="indent"><option value="2">2</option><option value="4">4</option><option value="tab">Tab</option></select></label>'+
  (id==='js-format'?'<label>'+label('Comillas','Quotes')+'<select name="quote"><option value="double">'+label('Dobles','Double')+'</option><option value="single">'+label('Simples','Single')+'</option></select></label><label>'+label('Punto y coma','Semicolons')+'<select name="semicolon"><option value="true">'+label('Sí','Yes')+'</option><option value="false">No</option></select></label>':'');
 return '<section class="seo-panel seo-inline-tool" aria-labelledby="inline-tool-title"><h2 id="inline-tool-title">'+label('Usar esta herramienta aquí','Use this tool here')+'</h2><p>'+(
  citation?label('Ejemplo: García, A.; 2024; Manual de estudio; Editorial Ejemplo. Elige APA 7 o Vancouver y revisa la salida contra la fuente. Vancouver también requiere numerar la bibliografía según el orden de citación; el generador no conoce ese orden.','Example: Smith, J.; 2024; Study handbook; Example Press. Choose APA 7 or Vancouver and check the result against the source. Vancouver also requires numbering references in citation order; the generator does not know that order.'):
  label('Formatea el código en tu navegador. Se carga Prettier al ejecutar; el código no se ejecuta.','Format code in your browser. Prettier loads when you run it; your code is not executed.'))+
  '</p><form data-seo-inline-tool="'+id+'" class="seo-inline-form">'+controls+'<button type="submit" class="seo-cta">'+label('Generar resultado','Generate result')+'</button><p class="seo-inline-status" role="status" aria-live="polite"></p><pre class="seo-inline-result" tabindex="0" hidden></pre></form></section><script type="module" src="/src/seo-inline-tools.js"></script>';
}

function sharedToolForm(page,language){
 const en=language==='en',label=(es,english)=>en?english:es,tool=tools.find(t=>t.id===page.tool);
 const query=new URLSearchParams({tool:tool.id,...(en?{}:{lang:'es'}),...(page.format?{format:page.format}:{})});
 const fallback=(en?'/en/':'/')+'?'+esc(query.toString());
 if(!hasInlineTool(page))return '<section class="seo-panel seo-launch-tool" aria-labelledby="launch-tool-title"><div class="seo-section-label">'+label('SERVICIO CONECTADO','CONNECTED SERVICE')+'</div><h2 id="launch-tool-title">'+label('Antes de abrir la herramienta','Before opening the tool')+'</h2><p>'+label('La herramienta necesita conexión a un servicio externo. En Prisma Core puedes consultar los motores disponibles y configurar una conexión personal si la operación lo requiere. Las cuotas y la disponibilidad pueden variar.','This tool needs an external service. In Prisma Core you can check available engines and configure a personal connection if required. Quotas and availability may vary.')+'</p><a class="seo-cta" href="'+fallback+'">'+label('Abrir esta operación','Open this operation')+' →</a></section>';
 const fields=toolContract(tool,language);
 const controls=fields.map(f=>{
  const title='<span>'+esc(f.label)+'</span>',hint=f.hint?'<small>'+esc(f.hint)+'</small>':'';
  if(f.type==='checkbox')return '<label class="seo-inline-check"><input type="checkbox" name="'+f.name+'"'+(f.value?' checked':'')+'>'+title+'</label>';
  let value=page.format&&f.name==='format'?page.format:f.value;
  if(tool.id==='image-ocr'&&f.name==='language')value=en?'eng':'spa';
  const control=f.type==='textarea'?'<textarea name="'+f.name+'" rows="7" maxlength="200000" spellcheck="false">'+esc(value)+'</textarea>':f.type==='select'?'<select name="'+f.name+'">'+f.options.map(([key,text])=>'<option value="'+esc(key)+'"'+(String(key)===String(value)?' selected':'')+'>'+esc(text)+'</option>').join('')+'</select>':'<input name="'+f.name+'" type="'+f.type+'" value="'+esc(value)+'" '+(f.extra||'')+(f.type==='text'?' maxlength="10000"':'')+'>';
  return '<label'+(f.type==='textarea'?' class="seo-inline-wide"':'')+'>'+title+control+hint+'</label>';
 }).join('');
 const modelNote=tool.id==='image-bg'&&page.tip?'<p>'+esc(page.tip)+'</p>':'';
 const file=tool.file?'<label class="seo-inline-wide">'+label(tool.multiple?'Archivos':'Archivo',tool.multiple?'Files':'File')+'<input type="file" name="file" accept="'+esc(tool.accept||'*/*')+'"'+(tool.multiple?' multiple':'')+' required><small>'+label('Hasta '+(tool.maxBytes?Math.round(tool.maxBytes/1048576):100)+' MB en total. El archivo se procesa en tu dispositivo.','Up to '+(tool.maxBytes?Math.round(tool.maxBytes/1048576):100)+' MB in total. The file is processed on your device.')+'</small></label><p class="seo-inline-selected seo-inline-wide" aria-live="polite"></p>':'';
 return '<section class="seo-panel seo-inline-tool" aria-labelledby="inline-tool-title"><div class="seo-section-label">'+label('ESPACIO DE TRABAJO','WORKSPACE')+'</div><h2 id="inline-tool-title">'+label('Usar aquí: ','Use here: ')+esc(page.h1||page.title)+'</h2><p>'+esc(toolOutcome(page,language))+'</p>'+modelNote+'<form data-seo-inline-tool="'+tool.id+'" data-max-files="'+(tool.multiple?20:1)+'" data-max-bytes="'+(tool.maxBytes||104857600)+'" class="seo-inline-form">'+file+controls+'<div class="seo-inline-wide seo-inline-actions"><button type="submit" class="seo-cta">'+label('Generar resultado','Generate result')+'</button>'+(!tool.file?'<button type="button" class="seo-example-load" hidden>'+label('Probar un ejemplo','Try an example')+'</button>':'')+'</div><p class="seo-inline-status" role="status" aria-live="polite"></p><a class="seo-cta seo-inline-download" hidden download>'+label('Descargar resultado','Download result')+'</a><pre class="seo-inline-result" tabindex="0" hidden></pre><img class="seo-inline-image" alt="'+label('Vista previa del resultado','Result preview')+'" hidden><audio controls class="seo-inline-media" hidden></audio><video controls playsinline class="seo-inline-media" hidden></video><button type="button" class="seo-inline-print" hidden>'+label('Abrir vista para guardar como PDF','Open view to save as PDF')+'</button></form><p><a href="'+fallback+'">'+label('Abrir esta operación en Prisma Core','Open this operation in Prisma Core')+' ↗</a></p></section><script type="module" src="/src/seo-inline-tools.js"></script>';
}
