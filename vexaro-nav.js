(function(){
'use strict';
const links=[
 ['HOME','/'],['HQ','/#hq'],['CLIPS','/clips.html'],['LOADOUTS','/loadouts.html'],
 ['SETTINGS','/settings.html'],['LIVE','/live/'],['COMMUNITY','/community.html'],
 ['MARKETPLACE','/marketplace.html'],['PRO','/membership.html'],['ABOUT','/about.html'],
 ['APP','/app.html'],['SEARCH','/search.html']
];
function cleanupLegacyCache(){
 try{
  if('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).catch(()=>{});
  if('caches' in window) caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).catch(()=>{});
 }catch(e){}
}
function cleanHome(){
 const p=document.querySelector('.poster');
 if(p){
  const style=document.createElement('style');
  style.textContent='.poster:after{background:none!important;mix-blend-mode:normal!important}.poster-grid:after,.poster-content:before{display:none!important;content:none!important}';
  document.head.appendChild(style);
 }
}
function mobileMenu(){
 const button=document.getElementById('hamb'), menu=document.getElementById('mobilemenu');
 if(button&&menu){
  button.setAttribute('aria-expanded','false');
  button.onclick=()=>{
   const open=menu.classList.toggle('open');
   button.setAttribute('aria-expanded',String(open));
   button.textContent=open?'×':'☰';
  };
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
   menu.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='☰';
  }));
  return;
 }
 const b=document.createElement('button');b.id='vexaro-global-menu-btn';b.type='button';b.textContent='☰';
 Object.assign(b.style,{position:'fixed',top:'15px',right:'16px',zIndex:'10001',width:'46px',height:'46px',border:'1px solid rgba(255,255,255,.16)',borderRadius:'10px',background:'rgba(8,8,10,.94)',color:'#fff',fontSize:'25px'});
 const n=document.createElement('nav');n.id='vexaro-global-menu';
 Object.assign(n.style,{position:'fixed',top:'0',right:'0',bottom:'0',width:'min(390px,88vw)',zIndex:'10000',background:'#08080a',padding:'82px 22px 28px',overflow:'auto',display:'none'});
 n.innerHTML='<div style="color:#ff4038;font-size:10px;font-weight:900;letter-spacing:.2em;margin-bottom:18px">VEXARO / NAVIGATION</div>'+links.map(x=>'<a href="'+x[1]+'" style="display:block;padding:14px 12px;color:#ddd;text-decoration:none;font-size:11px;font-weight:900;letter-spacing:.12em">'+x[0]+'</a>').join('')+'<a href="/community.html?signin=1" style="display:block;padding:14px 12px;color:#ff4038">SIGN IN / JOIN VEXARO</a>';
 document.body.append(b,n);
 b.onclick=()=>{const open=n.style.display!=='block';n.style.display=open?'block':'none';b.textContent=open?'×':'☰'};
 n.querySelectorAll('a').forEach(a=>a.onclick=()=>{n.style.display='none';b.textContent='☰'});
}
cleanupLegacyCache();
cleanHome();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mobileMenu,{once:true});else mobileMenu();
})();