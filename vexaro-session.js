(function(){
  const HOME='index.html';
  const IDLE_LIMIT=24*60*60*1000;
  const nav=(performance.getEntriesByType('navigation')[0]||{}).type;
  const path=(location.pathname||'').split('/').pop()||'index.html';
  const isHome=path===''||path==='index.html';
  if(nav==='reload'&&!isHome){location.replace(HOME);return}
  const now=Date.now();
  const last=Number(localStorage.getItem('vexaro_last_active')||0);
  const role=localStorage.getItem('vexaro_session_role')||'member';
  async function expireIfNeeded(){
    if(!last||role==='admin'||now-last<=IDLE_LIMIT){localStorage.setItem('vexaro_last_active',String(now));return}
    try{
      if(!window.supabase){
        await new Promise(resolve=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});
      }
      if(!window.VEXARO_SUPABASE_URL){
        await new Promise(resolve=>{const s=document.createElement('script');s.src='supabase-config.js';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});
      }
      if(window.supabase&&window.VEXARO_SUPABASE_URL&&window.VEXARO_SUPABASE_KEY){
        const sb=window.supabase.createClient(window.VEXARO_SUPABASE_URL,window.VEXARO_SUPABASE_KEY);
        await sb.auth.signOut({scope:'local'});
      }
    }catch(e){}
    localStorage.removeItem('vexaro_last_active');
    localStorage.removeItem('vexaro_session_role');
    location.replace(HOME);
  }
  expireIfNeeded();
  let timer=0;
  const touch=()=>{if(!timer){timer=setTimeout(()=>{localStorage.setItem('vexaro_last_active',String(Date.now()));timer=0},60000)}};
  ['pointerdown','keydown','touchstart','scroll'].forEach(ev=>window.addEventListener(ev,touch,{passive:true}));
})();