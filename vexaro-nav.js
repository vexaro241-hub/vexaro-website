(function(){
'use strict';
/* VEXARO site-wide rule: browser refresh returns to Home.
   Normal navigation and back/forward history are unchanged. */
const nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
if(nav&&nav.type==='reload'&&(location.pathname!=='/'||location.search||location.hash)){
 location.replace('/');
 return;
}
const links=[
 ['HOME','/'],['HQ','/#hq'],['CLIPS','/clips.html'],['LOADOUTS','/loadouts.html'],
 ['SETTINGS','/settings.html'],['LIVE','/live/'],['COMMUNITY','/community.html'],
 ['MARKETPLACE','/marketplace.html'],['PRO','/membership.html'],['ABOUT','/about.html'],
 ['APP','/app.html'],['SEARCH','/search.html']
];
function cleanupLegacyCache(){
 try{
  if('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).catch(()=>{});
  if('caches' in window) caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))).catch(()=>{}));
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
function menuStyles(){
 const s=document.createElement('style');
 s.id='vexaro-menu-responsive';
 s.textContent=`
html,body{max-width:100%;overflow-x:hidden}
/* Lock the site header to one consistent position across every page. */
.topbar{width:100%!important;position:sticky!important;top:0!important;z-index:9990!important}
.topbar .nav{width:min(1180px,calc(100% - 40px))!important;min-height:74px!important;height:74px!important;margin:0 auto!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:20px!important;position:relative!important}
.topbar .brand{flex:0 0 auto!important;white-space:nowrap!important}
.topbar .navlinks{margin-left:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:nowrap!important;gap:6px!important;max-width:calc(100% - 150px)!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;white-space:nowrap!important}
.topbar .navlinks::-webkit-scrollbar{display:none!important}
.topbar .navlinks a{flex:0 0 auto!important;white-space:nowrap!important}
@media(max-width:800px){
 .topbar .nav{width:calc(100% - 26px)!important;min-height:64px!important;height:64px!important;padding:0!important;gap:12px!important}
 .topbar .navlinks{max-width:calc(100% - 100px)!important;gap:4px!important}
 .topbar .navlinks a{padding:8px 6px!important;font-size:8px!important}
}
@media(max-width:520px){
 .topbar .nav{width:calc(100% - 20px)!important;min-height:60px!important;height:60px!important}
 .topbar .navlinks{max-width:calc(100% - 88px)!important}
}
*,*:before,*:after{box-sizing:border-box}
img,video,iframe,svg{max-width:100%}
.mobilemenu{position:fixed!important;top:76px!important;right:14px!important;left:14px!important;z-index:9999!important;display:none!important;flex-direction:column!important;gap:0!important;padding:12px!important;max-height:calc(100dvh - 92px)!important;overflow:auto!important;background:rgba(8,8,10,.98)!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:14px!important;box-shadow:0 24px 70px rgba(0,0,0,.7)!important;backdrop-filter:blur(18px)!important}
.mobilemenu.open{display:flex!important}
.mobilemenu a{display:block!important;width:100%!important;padding:14px 13px!important;border-bottom:1px solid rgba(255,255,255,.07)!important;color:#ddd!important;font-size:11px!important;font-weight:900!important;letter-spacing:.12em!important;text-transform:uppercase!important}
.mobilemenu a:last-child{border-bottom:0!important}
.mobilemenu a:hover,.mobilemenu a:focus{color:#fff!important;background:rgba(225,6,0,.10)!important}
@media(max-width:1024px){
 .wrap{width:min(1180px,calc(100% - 26px))!important}
 .grid,.hq,.code-grid,.clips,.loadouts,.socials,.hub-grid,.hub-strip{max-width:100%!important}
 h1,h2,h3{overflow-wrap:anywhere}
}
@media(max-width:520px){
 .topbar .nav{min-height:64px!important;height:auto!important}
 .mobilemenu{top:70px!important;left:10px!important;right:10px!important;max-height:calc(100dvh - 82px)!important}
 .mobilemenu a{padding:13px 11px!important}
 .hero,.poster{max-width:100vw!important}
 .section,.wrap,.hero-content{min-width:0!important;max-width:100%!important}
 .btn{max-width:100%;white-space:normal!important}
}
@media(orientation:landscape) and (max-height:600px){
 .mobilemenu{max-height:calc(100dvh - 78px)!important}
}
`;
 document.head.appendChild(s);
}
function mobileMenu(){
 const button=document.getElementById('hamb'), menu=document.getElementById('mobilemenu');
 menuStyles();
 if(button&&menu){
  button.setAttribute('aria-expanded','false');
  button.setAttribute('type','button');
  const close=()=>{menu.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='☰';document.body.style.overflow='';};
  button.onclick=()=>{
   const open=!menu.classList.contains('open');
   if(open){menu.classList.add('open');button.setAttribute('aria-expanded','true');button.textContent='×';}
   else close();
  };
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  document.addEventListener('click',e=>{if(menu.classList.contains('open')&&!menu.contains(e.target)&&e.target!==button)close();});
  return;
 }
 const b=document.createElement('button');b.id='vexaro-global-menu-btn';b.type='button';b.textContent='☰';b.setAttribute('aria-label','Open VEXARO navigation');
 Object.assign(b.style,{position:'fixed',top:'15px',right:'16px',zIndex:'10001',width:'46px',height:'46px',border:'1px solid rgba(255,255,255,.16)',borderRadius:'10px',background:'rgba(8,8,10,.96)',color:'#fff',fontSize:'25px',cursor:'pointer'});
 const n=document.createElement('nav');n.id='vexaro-global-menu';n.setAttribute('aria-label','VEXARO navigation');
 Object.assign(n.style,{position:'fixed',top:'0',right:'0',bottom:'0',width:'min(390px,88vw)',zIndex:'10000',background:'#08080a',padding:'82px 22px 28px',overflow:'auto',display:'none',borderLeft:'1px solid rgba(255,255,255,.12)',boxShadow:'-25px 0 70px rgba(0,0,0,.6)'});
 n.innerHTML='<div style="color:#e10600;font-size:10px;font-weight:900;letter-spacing:.2em;margin-bottom:18px">VEXARO / NAVIGATION</div>'+links.map(x=>'<a href="'+x[1]+'" style="display:block;padding:14px 12px;border-bottom:1px solid rgba(255,255,255,.07);color:#ddd;text-decoration:none;font-size:11px;font-weight:900;letter-spacing:.12em">'+x[0]+'</a>').join('')+'<a href="/community.html?signin=1" style="display:block;padding:14px 12px;color:#e10600">SIGN IN / JOIN VEXARO</a>';
 document.body.append(b,n);
 const close=()=>{n.style.display='none';b.textContent='☰';};
 b.onclick=()=>{const open=n.style.display!=='block';n.style.display=open?'block':'none';b.textContent=open?'×':'☰';};
 n.querySelectorAll('a').forEach(a=>a.onclick=close);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
}
cleanupLegacyCache();
cleanHome();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mobileMenu,{once:true});else mobileMenu();
})();