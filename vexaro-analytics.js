(function(){
  'use strict';
  const key='vexaro_visitor_id';
  const automation=/bot|crawler|spider|headless|playwright|puppeteer|webdriver|agent-browser|browserstack/i.test(navigator.userAgent||'') || navigator.webdriver===true;
  let visitor=localStorage.getItem(key);
  if(!visitor){visitor=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));localStorage.setItem(key,visitor)}
  const path=(location.pathname.split('/').pop()||'index.html').slice(0,200);
  const qa=new URLSearchParams(location.search).get('vexaro_qa')==='1';
  function send(){
    try{
      if(automation||qa)return;
      if(!window.supabase||!window.VEXARO_SUPABASE_URL||!window.VEXARO_SUPABASE_KEY)return;
      const sb=window.vexaroSupabase;
      sb.auth.getSession().then(({data})=>{
        const userId=data.session?.user?.id||null;
        return sb.from('site_analytics').insert({
          visitor_id:visitor,
          path,
          referrer:document.referrer?document.referrer.slice(0,500):null,
          user_id:userId,
          excluded:false
        });
      }).catch(()=>{});
    }catch(e){}
  }
  function ready(){if(window.supabase&&window.VEXARO_SUPABASE_URL)send();}
  if(document.readyState==='complete')setTimeout(ready,1200);
  else window.addEventListener('load',()=>setTimeout(ready,1200),{once:true});
})();