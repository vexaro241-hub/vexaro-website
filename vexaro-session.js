(function(){
  const IDLE_LIMIT=24*60*60*1000;
  const now=Date.now(),last=Number(localStorage.getItem('vexaro_last_active')||0);
  if(!last||now-last<=IDLE_LIMIT){localStorage.setItem('vexaro_last_active',String(now));}
  else{localStorage.removeItem('vexaro_last_active');localStorage.removeItem('vexaro_session_role');}
  let timer=0;
  const touch=()=>{if(!timer)timer=setTimeout(()=>{localStorage.setItem('vexaro_last_active',String(Date.now()));timer=0;},60000)};
  ['pointerdown','keydown','touchstart','scroll'].forEach(ev=>window.addEventListener(ev,touch,{passive:true}));
})();