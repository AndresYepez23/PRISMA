const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function fileToolForm(id,language){
 const en=language==='en',pdf=id==='pdf-split';
 const label=(es,english)=>en?english:es;
 const input=(name,title,type,value,extra='')=>'<label data-split-field="'+name+'" hidden>'+esc(title)+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+' disabled></label>';
 const options=pdf?'<label>'+label('Forma de división','Split mode')+'<select name="mode"><option value="all">'+label('Cada página','Every page')+'</option><option value="selected">'+label('Páginas concretas','Selected pages')+'</option><option value="ranges">'+label('Un PDF por rango','One PDF per range')+'</option><option value="parts">'+label('Número de partes','Number of parts')+'</option><option value="chunk">'+label('Bloques de páginas','Page blocks')+'</option></select></label>'+
  input('pages',label('Páginas (ejemplo: 2, 4-6)','Pages (example: 2, 4-6)'),'text','', 'placeholder="2, 4-6"')+
  input('ranges',label('Rangos (ejemplo: 1-4; 5-8)','Ranges (example: 1-4; 5-8)'),'text','', 'placeholder="1-4; 5-8"')+
  input('parts',label('Partes (2 a 20)','Parts (2 to 20)'),'number','2','min="2" max="20" step="1"')+
  input('chunkSize',label('Páginas por bloque (1 a 200)','Pages per block (1 to 200)'),'number','3','min="1" max="200" step="1"')+
  '<p class="seo-inline-preview" aria-live="polite">'+label('Selecciona un PDF para ver el plan de división.','Select a PDF to preview the split plan.')+'</p>':'';
 const description=pdf?
  label('El PDF se procesa en este navegador. Un resultado se descarga como PDF; varios se agrupan en un ZIP.','The PDF is processed in this browser. One result downloads as a PDF; multiple results are packaged in a ZIP.'):
  label('Ejemplo: una foto con ubicación GPS y datos de cámara se vuelve a codificar sin los metadatos EXIF habituales. Revisa el nombre del archivo y cualquier dirección o rostro visible: esta herramienta no los oculta.','Example: a photo with GPS location and camera details is re-encoded without common EXIF metadata. Check the filename and any visible address or face: this tool does not hide them.');
 const fallback=en?'/en/?tool='+id:'/?tool='+id+'&amp;lang=es';
 return '<section class="seo-panel seo-inline-tool" aria-labelledby="inline-tool-title"><h2 id="inline-tool-title">'+label('Usar esta herramienta aquí','Use this tool here')+'</h2><p>'+description+'</p><form data-seo-inline-tool="'+id+'" class="seo-inline-form"><label>'+label(pdf?'Archivo PDF':'Imagen JPEG, PNG o WebP',pdf?'PDF file':'JPEG, PNG or WebP image')+'<input name="file" type="file" accept="'+(pdf?'.pdf,application/pdf':'image/jpeg,image/png,image/webp')+'" required></label>'+options+'<button type="submit" class="seo-cta">'+label(pdf?'Dividir y preparar descarga':'Eliminar EXIF y preparar descarga',pdf?'Split and prepare download':'Remove EXIF and prepare download')+'</button><p class="seo-inline-status" role="status" aria-live="polite"></p><a class="seo-cta seo-inline-download" hidden download>'+label('Descargar resultado','Download result')+'</a>'+(pdf?'':'<img class="seo-inline-image" alt="'+label('Vista previa de la imagen sin metadatos','Preview of the image without metadata')+'" hidden>')+'</form><p><a href="'+fallback+'">'+label('Abrir en Prisma Core','Open in Prisma Core')+' ↗</a></p></section><script type="module" src="/src/seo-inline-tools.js"></script>';
}

export function inlineToolForm(id,language){
 if(['pdf-split','image-strip-metadata'].includes(id))return fileToolForm(id,language);
 if(!['html-format','js-format','citation-generator'].includes(id))return '';
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
