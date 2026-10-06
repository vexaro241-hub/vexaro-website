(function(){
  const key='vexaro_visitor_id';
  let visitor=localStorage.getItem(key);
  if(!visitor){visitor=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));localStorage.setItem(key,visitor)}
  const path=(location.pathname.split('/').pop()||'index.html').slice(0,200);
  function send(){
    try{
      if(!window.supabase||!window.VEXARO_SUPABASE_URL||!window.VEXARO_SUPABASE_KEY)return;
      const sb=window.supabase.createClient(window.VEXARO_SUPABASE_URL,window.VEXARO_SUPABASE_KEY);
      sb.auth.getSession().then(({data})=>sb.from('site_analytics').insert({visitor_id:visitor,path,referrer:document.referrer?document.referrer.slice(0,500):null,user_id:data.session?.user?.id||null}));
    }catch(e){}
  }
  function ready(){ if(window.supabase&&window.VEXARO_SUPABASE_URL){send();} }
  if(document.readyState==='complete')setTimeout(ready,1200);else window.addEventListener('load',()=>setTimeout(ready,1200),{once:true});
})();