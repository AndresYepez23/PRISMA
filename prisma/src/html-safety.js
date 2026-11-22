// Mammoth explicitly does not sanitize HTML produced from untrusted DOCX files.
const allowedTags=new Set(['P','BR','H1','H2','H3','H4','H5','H6','STRONG','EM','B','I','U','S','SUP','SUB','UL','OL','LI','BLOCKQUOTE','PRE','CODE','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','A','IMG','HR']);
const safeLink=value=>/^(https?:\/\/|mailto:|#)/i.test(value);

export function sanitizeDocumentHtml(source){
 const doc=new DOMParser().parseFromString(String(source),'text/html');
 for(const element of [...doc.body.querySelectorAll('*')]){
  if(!allowedTags.has(element.tagName)){element.remove();continue;}
  for(const attribute of [...element.attributes]){
   const {name,value}=attribute;
   const permitted=element.tagName==='A'&&name==='href'&&safeLink(value)
    ||element.tagName==='IMG'&&name==='src'&&/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(value)
    ||element.tagName==='IMG'&&name==='alt'
    ||['TH','TD'].includes(element.tagName)&&['colspan','rowspan'].includes(name)&&/^[1-9]\d?$/.test(value);
   if(!permitted)element.removeAttribute(name);
  }
 }
 return doc.body.innerHTML;
}

export const escapeDocumentTitle=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
