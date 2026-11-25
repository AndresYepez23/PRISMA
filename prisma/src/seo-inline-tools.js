import {recordCoreMetric} from './core-telemetry.js';
import {toolProgress,toolFailure} from './tool-feedback.js';
import {runTool} from './engines.js';
import {planPdfSplit} from './pdf-split-options.js';
import {toolExample} from './tool-examples.js';
import {updateUnitInputs} from './tool-input-options.js';

const form=document.querySelector('[data-seo-inline-tool]');
if(form){
 const id=form.dataset.seoInlineTool,en=document.documentElement.lang==='en';
 const fileInput=form.querySelector('input[type=file]');
 const fileTool=!!fileInput;
 const submit=form.querySelector('button[type=submit]'),submitLabel=submit.textContent;
 const meter=appendProgress();
 function appendProgress(){const node=document.createElement('progress');node.className='seo-inline-meter';node.max=1;node.hidden=true;node.setAttribute('aria-label',en?'Operation progress':'Progreso de la operación');form.querySelector('[role=status]').before(node);return node;}
 const word=(es,english)=>en?english:es;
 const append=(tag,className,content)=>{const node=document.createElement(tag);node.className=className;node.hidden=true;if(content)node.textContent=content;form.append(node);return node;};
 const output=form.querySelector('pre')||append('pre','seo-inline-result');output.tabIndex=0;
 const resultLink=form.querySelector('.seo-inline-download')||append('a','seo-cta seo-inline-download',word('Descargar resultado','Download result'));resultLink.setAttribute('download','');
 const copy=append('button','seo-inline-copy',word('Copiar resultado','Copy result'));copy.type='button';
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output.textContent);recordCoreMetric(id,'copied');form.querySelector('[role=status]').textContent=word('Resultado copiado.','Result copied.');}catch{output.focus();form.querySelector('[role=status]').textContent=word('Selecciona el texto para copiarlo.','Select the result text to copy it.');}});
 let printHtml='',revision=0;
 const print=form.querySelector('.seo-inline-print')||append('button','seo-inline-print',word('Abrir vista para guardar como PDF','Open view to save as PDF'));print.type='button';
 resultLink.addEventListener('click',()=>recordCoreMetric(id,'download-clicked'));
 print.addEventListener('click',()=>{if(!printHtml)return;const win=window.open('','_blank');if(!win){form.querySelector('[role=status]').textContent=word('Permite la ventana emergente para abrir la vista de impresión.','Allow the popup to open the print view.');return;}recordCoreMetric(id,'print-opened');win.opener=null;win.document.open();win.document.write(printHtml);win.document.close();win.addEventListener('load',()=>win.print());});
 const reload=append('button','seo-inline-reload',word('Recargar página','Reload page'));reload.type='button';reload.addEventListener('click',()=>location.reload());
 const example=!fileTool?(form.querySelector('.seo-example-load')||append('button','seo-example-load',word('Probar un ejemplo','Try an example'))):null;if(example)example.type='button';
 const resetResult=()=>{reload.hidden=true;meter.hidden=true;submit.textContent=submitLabel;delete submit.dataset.retry;printHtml='';resultLink.hidden=true;output.hidden=true;copy.hidden=true;print.hidden=true;for(const media of form.querySelectorAll('img,audio,video')){media.pause?.();media.removeAttribute('src');media.hidden=true;}form.querySelector('[role=status]').textContent='';};
 if(example){
  const sample=toolExample(id)||Object.fromEntries([...form.querySelectorAll('[name]')].map(field=>[field.name,field.type==='checkbox'?field.defaultChecked:field.defaultValue??field.value]));
  if(Object.values(sample).some(Boolean)){example.hidden=false;example.addEventListener('click',()=>{revision++;resetResult();releaseUrls();for(const [name,value] of Object.entries(sample)){const field=form.elements.namedItem(name);if(!field)continue;if(field.type==='checkbox')field.checked=Boolean(value);else field.value=String(value);}form.querySelector('textarea,input')?.focus();form.querySelector('[role=status]').textContent=word('Ejemplo cargado. Puedes editarlo antes de ejecutar.','Example loaded. You can edit it before running.');});}
 }
 if(id==='units')form.querySelector('[name=kind]').addEventListener('change',()=>updateUnitInputs(form,en?'en':'es'));
 if(id==='timestamp')form.querySelector('[name=mode]').addEventListener('change',()=>{form.querySelector('[name=value]').value=form.querySelector('[name=mode]').value==='unix-to-date'?'1762550400':'2026-01-01T12:00:00Z';});
 let order=[];
 let downloadUrl='',previewUrl='',previewRequest=0;
 const releaseUrls=()=>{if(downloadUrl)URL.revokeObjectURL(downloadUrl);if(previewUrl)URL.revokeObjectURL(previewUrl);downloadUrl='';previewUrl='';};
 if(fileTool){
  const link=form.querySelector('.seo-inline-download'),image=form.querySelector('.seo-inline-image');
  const mode=form.querySelector('[name=mode]');
  const orderList=form.querySelector('.seo-inline-order');
  const renderOrder=()=>{
   if(!orderList)return;
   orderList.replaceChildren();
   const files=[...fileInput.files];
   order.forEach((index,position)=>{
    const row=document.createElement('li'),name=document.createElement('span');
    name.textContent=files[index].name;row.append(name);
    for(const [direction,symbol] of [[-1,'↑'],[1,'↓']]){
     const button=document.createElement('button');button.type='button';button.textContent=symbol;
     button.setAttribute('aria-label',(en?direction<0?'Move up: ':'Move down: ':direction<0?'Subir: ':'Bajar: ')+files[index].name);
     button.disabled=position+direction<0||position+direction>=order.length;
     button.addEventListener('click',()=>{revision++;resetResult();releaseUrls();[order[position],order[position+direction]]=[order[position+direction],order[position]];renderOrder();});
     row.append(button);
    }
    orderList.append(row);
   });
  };
  const updateFields=()=>{
   for(const label of form.querySelectorAll('[data-split-field]')){
    const active=label.dataset.splitField===({selected:'pages',ranges:'ranges',parts:'parts',chunk:'chunk'}[mode?.value]);
    label.hidden=!active;label.querySelector('input').disabled=!active;
   }
  };
  async function previewSplit(){
   const notice=form.querySelector('.seo-inline-preview'),file=fileInput.files?.[0],request=++previewRequest;
   if(!file){notice.textContent=en?'Select a PDF to preview the split plan.':'Selecciona un PDF para ver el plan de división.';return;}
   if(file.size>100*1024*1024){notice.textContent=en?'The local file limit is 100 MB.':'El límite local es de 100 MB.';return;}
   notice.textContent=en?'Reading PDF…':'Leyendo PDF…';
   try{
    const {PDFDocument}=await import('https://esm.sh/pdf-lib@1.17.1');
    const pdf=await PDFDocument.load(await file.arrayBuffer());
    const plan=planPdfSplit(Object.fromEntries(new FormData(form)),pdf.getPageCount());
    if(request!==previewRequest)return;
    notice.textContent=en?`${plan.totalPages} pages. ${plan.groups.length} output PDF${plan.groups.length===1?'':'s'}; ${plan.selectedCount} pages selected.`:
     `${plan.totalPages} páginas. ${plan.groups.length} PDF de salida; ${plan.selectedCount} páginas seleccionadas.`;
   }catch(error){if(request===previewRequest)notice.textContent=(en?'Check the PDF and selection: ':'Revisa el PDF y la selección: ')+String(error?.message||'Error');}
  }
  fileInput.addEventListener('change',()=>{resetResult();releaseUrls();const output=form.querySelector('pre');if(output)output.hidden=true;form.querySelector('[role=status]').textContent='';const selected=form.querySelector('.seo-inline-selected');if(selected)selected.textContent=[...fileInput.files].map(file=>file.name).join(' · ');if(id==='pdf-split'&&mode)void previewSplit();if(orderList){order=[...fileInput.files].map((_,index)=>index);renderOrder();}});
  if(id==='pdf-split'&&mode){mode.addEventListener('change',()=>{updateFields();void previewSplit();});for(const input of form.querySelectorAll('[data-split-field] input'))input.addEventListener('input',()=>{void previewSplit();});updateFields();}

 }
 form.addEventListener('input',()=>{revision++;resetResult();releaseUrls();});
 window.addEventListener('pagehide',event=>{if(!event.persisted)releaseUrls();});
 form.dataset.ready='true';
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(form.hasAttribute('aria-busy'))return;
  if(submit.dataset.retry==='true')recordCoreMetric(id,'retry');
  const button=form.querySelector('button[type=submit]'),status=form.querySelector('[role=status]'),output=form.querySelector('pre');
  const params=Object.fromEntries(new FormData(form));
  for(const checkbox of form.querySelectorAll('input[type=checkbox]'))params[checkbox.name]=checkbox.checked;
  const operationRevision=revision;
  const file=fileInput?.files?.[0];delete params.file;
  const files=form.querySelector('.seo-inline-order')?order.map(index=>fileInput.files[index]):fileInput?.multiple?[...fileInput.files]:file?[file]:[];
  resetResult();button.disabled=true;form.setAttribute('aria-busy','true');status.textContent=en?'Processing…':'Procesando…';if(output)output.hidden=true;
  const link=form.querySelector('.seo-inline-download'),image=form.querySelector('.seo-inline-image');
  if(link)link.hidden=true;if(image)image.hidden=true;releaseUrls();meter.hidden=false;meter.removeAttribute('value');
  try{
   if(fileTool){
    if(!files.length)throw Error(en?'Select a file first.':'Selecciona un archivo.');
    const max=Number(form.dataset.maxFiles)||20;
    if(files.length>max||id==='image-collage'&&files.length<2)throw Error(en?`Select ${id==='image-collage'?'2 to 12':'at most '+max} files.`:`Selecciona ${id==='image-collage'?'de 2 a 12':'como máximo '+max} archivos.`);
    const maxBytes=Number(form.dataset.maxBytes)||104857600;
    if(files.reduce((sum,item)=>sum+item.size,0)>maxBytes)throw Error(en?'The local limit is '+Math.round(maxBytes/1048576)+' MB in total.':'El límite local es de '+Math.round(maxBytes/1048576)+' MB en total.');
    const accepted=fileInput.accept.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
    if(files.some(item=>!accepted.some(rule=>rule.startsWith('.')?item.name.toLowerCase().endsWith(rule):rule==='*/*'||(rule.endsWith('/*')?item.type.toLowerCase().startsWith(rule.slice(0,-1)):item.type.toLowerCase()===rule))))throw Error(en?'Choose a supported file type.':'Selecciona un formato admitido.');
   }
   const result=await runTool(id,files,params,(progress,message,detail)=>{if(operationRevision!==revision)return;const state=toolProgress(progress,message,detail,en?'en':'es');status.textContent=state.text;if(state.fraction===null)meter.removeAttribute('value');else meter.value=state.fraction;});
   if(operationRevision!==revision){if(result.previewUrl)URL.revokeObjectURL(result.previewUrl);status.textContent=word('La entrada cambió durante el proceso. Ejecuta de nuevo con la selección actual.','The input changed during processing. Run again with the current selection.');return;}
   const text=typeof result.text==='string'?result.text:typeof result.html==='string'?result.html:result.colors?.join('\n');
   const blob=result.blob||(typeof text==='string'?new Blob([text],{type:'text/plain;charset=utf-8'}):null);
   if(blob){downloadUrl=URL.createObjectURL(blob);link.href=downloadUrl;link.download=result.filename||'prisma-'+id+'.txt';link.hidden=false;}
   if(typeof text==='string'){output.textContent=text;output.hidden=false;copy.hidden=false;}
   printHtml=result.printHtml||'';print.hidden=!printHtml;
   const mime=result.blob?.type||'';
   if(mime.startsWith('image/')){const preview=image||append('img','seo-inline-image');preview.alt=word('Vista previa del resultado','Result preview');previewUrl=result.previewUrl||'';preview.src=previewUrl||downloadUrl;preview.hidden=false;}
   if(mime.startsWith('audio/')||mime.startsWith('video/')){const kind=mime.startsWith('audio/')?'audio':'video';const preview=form.querySelector(kind)||append(kind,'seo-inline-media');preview.controls=true;preview.src=downloadUrl;preview.hidden=false;}
   if(!blob&&!printHtml)throw Error(word('No hay un resultado utilizable.','No usable result.'));
   if(id==='image-compress'){
    const size=value=>Math.ceil(value/1024)+' KB';
    status.textContent='Original: '+size(file.size)+' → '+size(result.blob.size)+'. '+(result.blob.size>=file.size?word('La copia no es más pequeña; prueba otra calidad o formato.','The copy is not smaller; try another quality or format.'):word('Revisa la calidad antes de compartir.','Check image quality before sharing.'));
   }else status.textContent=en?'Result ready. Review it before use.':result.summary||'Resultado listo. Revísalo antes de usarlo.';
  }catch(error){if(operationRevision===revision){const failure=toolFailure(error,en?'en':'es',navigator.onLine!==false);status.textContent=failure.text;reload.hidden=!failure.reload;if(failure.retry){button.textContent=word('Reintentar','Try again');button.dataset.retry='true';}}}
  finally{meter.hidden=true;button.disabled=false;form.removeAttribute('aria-busy');}
 });
}
