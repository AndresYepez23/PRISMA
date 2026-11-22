import {runTool} from './engines.js';

const form=document.querySelector('[data-seo-inline-tool]');
if(form){
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=form.querySelector('button[type=submit]'),status=form.querySelector('[role=status]'),output=form.querySelector('pre');
  const params=Object.fromEntries(new FormData(form));
  button.disabled=true;status.textContent=document.documentElement.lang==='en'?'Processing…':'Procesando…';output.hidden=true;
  try{
   const result=await runTool(form.dataset.seoInlineTool,[],params);
   if(typeof result.text!=='string')throw Error('No text result');
   output.textContent=result.text;output.hidden=false;
   status.textContent=document.documentElement.lang==='en'?'Result ready. Review it before use.':'Resultado listo. Revísalo antes de usarlo.';
  }catch(error){status.textContent=error?.message||'Error';}
  finally{button.disabled=false;}
 });
}
