const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const search=document.querySelector('[data-catalog-search]');
if(search){
 const cards=[...document.querySelectorAll('[data-catalog-card]')];
 const rows=cards.map(card=>({card,text:normalize(card.textContent),mode:card.dataset.mode}));
 const input=search.querySelector('input'),select=search.querySelector('select'),status=search.querySelector('[role=status]'),en=document.documentElement.lang==='en';
 const sections=[...document.querySelectorAll('section.seo-category')].filter(section=>section.querySelector('[data-catalog-card]'));
 if(!rows.some(row=>row.mode==='connected'))select.querySelector('[value=connected]').remove();
 if(!rows.some(row=>row.mode==='local'))select.hidden=true;
 const update=()=>{
  const terms=normalize(input.value).trim().split(/\s+/).filter(Boolean);let visible=0;
  for(const row of rows){const show=terms.every(term=>row.text.includes(term))&&(select.value==='all'||select.value===row.mode);row.card.hidden=!show;if(show)visible++;}
  for(const section of sections)section.hidden=![...section.querySelectorAll('[data-catalog-card]')].some(card=>!card.hidden);
  status.textContent=en?(visible?visible+' results.':'No results. Try another term or clear the filters.'):(visible?visible+' resultados.':'Sin resultados. Prueba otro término o limpia los filtros.');
 };
 search.hidden=false;search.addEventListener('submit',event=>event.preventDefault());input.addEventListener('input',update);select.addEventListener('change',update);search.addEventListener('reset',()=>queueMicrotask(update));update();
}
for(const menu of document.querySelectorAll('.seo-browse,.seo-page-contents')){
 menu.addEventListener('click',event=>{if(event.target.closest('a'))menu.open=false;});
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}});
}
