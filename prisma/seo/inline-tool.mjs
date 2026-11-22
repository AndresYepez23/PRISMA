const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function inlineToolForm(id,language){
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
  citation?label('Introduce los datos de la fuente y revisa cada referencia con la publicación original.','Enter the source details and verify each reference against the original publication.'):
  label('Formatea el código en tu navegador. Se carga Prettier al ejecutar; el código no se ejecuta.','Format code in your browser. Prettier loads when you run it; your code is not executed.'))+
  '</p><form data-seo-inline-tool="'+id+'" class="seo-inline-form">'+controls+'<button type="submit" class="seo-cta">'+label('Generar resultado','Generate result')+'</button><p class="seo-inline-status" role="status" aria-live="polite"></p><pre class="seo-inline-result" tabindex="0" hidden></pre></form></section><script type="module" src="/src/seo-inline-tools.js"></script>';
}
