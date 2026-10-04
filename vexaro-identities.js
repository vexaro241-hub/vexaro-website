(function(){
'use strict';
const KEY='vexaro_active_identity';
const MEMBERS_APP='https://vexaro-members.vexaro241.workers.dev/';
const ADMIN_APP='https://vexaro-admin.vexaro241.workers.dev/';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const enc=v=>btoa(unescape(encodeURIComponent(JSON.stringify(v)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const dec=v=>JSON.parse(decodeURIComponent(escape(atob(v.replace(/-/g,'+').replace(/_/g,'/')))));
window.VEXARO_IDENTITIES={
 list:[],active:null,sb:null,
 async acceptHandoff(sb){
  try{
   const raw=new URL(location.href).hash.match(/(?:^#|&)vexaro_session=([^&]+)/)?.[1];
   if(!raw)return null;
   const s=dec(raw);
   if(!s?.access_token||!s?.refresh_token)return null;
   const {data,error}=await sb.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
   history.replaceState({},document.title,location.pathname+location.search);
   if(error)throw error;
   return data?.session||null;
  }catch(e){console.warn('VEXARO session handoff failed:',e?.message||e);try{history.replaceState({},document.title,location.pathname+location.search)}catch(_){}return null}
 },
 async init(sb,userId,preferredType){
  if(!sb||!userId)return;
  this.sb=sb;
  const {data,error}=await sb.from('profile_identities').select('id,slug,username,display_name,bio,avatar_url,identity_type,can_post,can_moderate,can_view_business').eq('user_id',userId).order('identity_type');
  if(error){console.warn('Identity switcher:',error.message);return}
  this.list=data||[];
  const path=(location.pathname||'').toLowerCase();
  const wanted=preferredType||((path.includes('admin-app')||location.hostname.includes('vexaro-admin'))?'admin':(path.includes('community')||location.hostname.includes('vexaro-members')||path==='/')?'creator':null);
  const saved=localStorage.getItem(KEY);
  this.active=this.list.find(x=>x.identity_type===wanted)||this.list.find(x=>x.id===saved)||this.list.find(x=>x.identity_type==='creator')||this.list[0]||null;
  if(this.active)localStorage.setItem(KEY,this.active.id);
  this.render();return this.active;
 },
 async targetFor(other){
  if(!other)return '';
  const target=other.identity_type==='admin'?ADMIN_APP:MEMBERS_APP;
  let suffix='';
  try{
   const {data}=await this.sb?.auth.getSession();
   const s=data?.session;
   if(s?.access_token&&s?.refresh_token)s='#'+ 'vexaro_session='+enc({access_token:s.access_token,refresh_token:s.refresh_token});
   else s='';
   suffix=s||'';
  }catch(_){}
  return target+suffix;
 },
 async switchTo(id){
  const x=this.list.find(v=>v.id===id);if(!x)return;
  this.active=x;localStorage.setItem(KEY,x.id);
  const target=await this.targetFor(x);
  location.href=target;
 },
 render(){
  const el=document.getElementById('identitySwitcher');if(!el||!this.active)return;
  const other=this.list.find(x=>x.id!==this.active.id);
  const switchLabel=other?'Switch to '+esc(other.display_name):'';
  el.innerHTML='<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap"><span style="font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#777">Using</span><strong>'+esc(this.active.display_name)+'</strong><span style="font-size:9px;border:1px solid rgba(225,6,0,.35);border-radius:999px;padding:4px 7px;color:#e10600">'+esc(this.active.identity_type.toUpperCase())+'</span>'+(other?'<button class="btn mini" id="switchIdentityBtn" type="button">'+switchLabel+'</button>':'')+'</div>';
  const b=document.getElementById('switchIdentityBtn');
  if(b&&other)b.addEventListener('click',()=>this.switchTo(other.id));
 }
};
})();