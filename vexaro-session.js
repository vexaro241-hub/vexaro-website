(function(){
'use strict';
/* VEXARO auth hygiene: member sessions persist across normal reloads. Explicit sign-out and inactivity/hidden-time limits still clear them. */
const IDLE_LIMIT=30*60*1000;
const HIDDEN_LIMIT=15*60*1000;
const now=()=>Date.now();
const clearSession=()=>{
  try{
    Object.keys(localStorage).filter(k=>/^sb-.*-auth-token$/.test(k)).forEach(k=>localStorage.removeItem(k));
    localStorage.removeItem('vexaro_last_active');
    localStorage.removeItem('vexaro_session_role');
  }catch(e){}
};
const forceSignedOut=()=>{
  clearSession();
  try{sessionStorage.setItem('vexaro_signed_out','1')}catch(e){}
  try{window.dispatchEvent(new CustomEvent('vexaro:signed-out'))}catch(e){}
  if(location.pathname==='/'&&!location.search&&!location.hash) location.reload();
};
let last=Number(localStorage.getItem('vexaro_last_active')||0);
if(last&&now()-last>IDLE_LIMIT) clearSession();
else localStorage.setItem('vexaro_last_active',String(now()));
let hiddenAt=0, timer=0;
const touch=()=>{
  localStorage.setItem('vexaro_last_active',String(now()));
  hiddenAt=0;
  if(timer){clearTimeout(timer);timer=0;}
};
const check=()=>{
  const lastSeen=Number(localStorage.getItem('vexaro_last_active')||0);
  if(lastSeen&&now()-lastSeen>IDLE_LIMIT){forceSignedOut();return;}
  if(hiddenAt&&now()-hiddenAt>HIDDEN_LIMIT){forceSignedOut();return;}
  timer=setTimeout(check,60000);
};
['pointerdown','keydown','touchstart','scroll','click'].forEach(ev=>window.addEventListener(ev,touch,{passive:true}));
window.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){hiddenAt=now();}
  else{
    const lastSeen=Number(localStorage.getItem('vexaro_last_active')||0);
    if((lastSeen&&now()-lastSeen>IDLE_LIMIT)||(hiddenAt&&now()-hiddenAt>HIDDEN_LIMIT)){forceSignedOut();return;}
    touch();
  }
});
window.addEventListener('pageshow',()=>{
  const lastSeen=Number(localStorage.getItem('vexaro_last_active')||0);
  if(lastSeen&&now()-lastSeen>IDLE_LIMIT) forceSignedOut();
});
check();
try{
 if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).catch(()=>{});
 if('caches' in window)caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).catch(()=>{});
}catch(e){}
})();