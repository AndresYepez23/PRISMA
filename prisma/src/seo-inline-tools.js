import {runTool} from './engines.js';
import {planPdfSplit} from './pdf-split-options.js';

const form=document.querySelector('[data-seo-inline-tool]');
if(form){
 const id=form.dataset.seoInlineTool,en=document.documentElement.lang==='en';
 const fileTool=['pdf-split','image-strip-metadata','pdf-merge','image-compress'].includes(id);
 const fileInput=form.querySelector('input[type=file]');
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
     button.addEventListener('click',()=>{[order[position],order[position+direction]]=[order[position+direction],order[position]];renderOrder();});
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
  fileInput.addEventListener('change',()=>{link.hidden=true;if(image)image.hidden=true;if(mode)void previewSplit();if(orderList){order=[...fileInput.files].map((_,index)=>index);renderOrder();}});
  if(mode){mode.addEventListener('change',()=>{updateFields();void previewSplit();});for(const input of form.querySelectorAll('[data-split-field] input'))input.addEventListener('input',()=>{void previewSplit();});updateFields();}
  window.addEventListener('pagehide',releaseUrls,{once:true});
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=form.querySelector('button[type=submit]'),status=form.querySelector('[role=status]'),output=form.querySelector('pre');
  const params=Object.fromEntries(new FormData(form));
  const file=fileInput?.files?.[0];delete params.file;
  const files=id==='pdf-merge'?order.map(index=>fileInput.files[index]):file?[file]:[];
  button.disabled=true;status.textContent=en?'Processing…':'Procesando…';if(output)output.hidden=true;
  const link=form.querySelector('.seo-inline-download'),image=form.querySelector('.seo-inline-image');
  if(link)link.hidden=true;if(image)image.hidden=true;releaseUrls();
  try{
   if(fileTool&&!file)throw Error(en?'Select a file first.':'Selecciona un archivo.');
   const result=await runTool(id,files,params);
   if(fileTool){
    if(!result.blob)throw Error(en?'No downloadable result.':'No hay un resultado descargable.');
    downloadUrl=URL.createObjectURL(result.blob);link.href=downloadUrl;link.download=result.filename||'prisma-result';link.hidden=false;
    if(image&&result.previewUrl){previewUrl=result.previewUrl;image.src=previewUrl;image.hidden=false;}
    if(id==='image-compress'){
     const size=value=>Math.ceil(value/1024)+' KB';
     status.textContent=(en?'Original: ':'Original: ')+size(file.size)+' → '+size(result.blob.size)+'. '+(result.blob.size>=file.size?(en?'The copy is not smaller; try another quality or format.':'La copia no es más pequeña; prueba otra calidad o formato.'):(en?'Check image quality before sharing.':'Revisa la calidad antes de compartir.'));
    }else status.textContent=en?'Download ready. Review the result before sharing it.':result.summary||'Descarga lista. Revisa el resultado antes de compartirlo.';
   }else{
    if(typeof result.text!=='string')throw Error('No text result');
    output.textContent=result.text;output.hidden=false;
    status.textContent=en?'Result ready. Review it before use.':'Resultado listo. Revísalo antes de usarlo.';
   }
  }catch(error){status.textContent=error?.message||'Error';}
  finally{button.disabled=false;}
 });
}
