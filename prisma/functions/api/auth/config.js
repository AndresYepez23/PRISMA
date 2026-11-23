// Public configuration only. Never return Supabase service-role or OAuth secrets.
export async function onRequestGet({env}){
 const url=String(env.PRISMA_SUPABASE_URL||'').trim();
 const key=String(env.PRISMA_SUPABASE_PUBLISHABLE_KEY||'').trim();
 // A misplaced service-role JWT must never become public configuration.
 let publicKey=/^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
 if(key.startsWith('eyJ')){
  try{
   const parts=key.split('.');
   const claims=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
   publicKey=parts.length===3&&claims.role==='anon';
  }catch{publicKey=false;}
 }
 const enabled=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)&&publicKey;
 const features={email:enabled,google:enabled&&env.PRISMA_AUTH_GOOGLE_ENABLED==='1',apple:enabled&&env.PRISMA_AUTH_APPLE_ENABLED==='1',phone:enabled&&env.PRISMA_AUTH_PHONE_ENABLED==='1'};
 return Response.json({enabled,url:enabled?url:null,publishableKey:enabled?key:null,features},{
   headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
 });
}
