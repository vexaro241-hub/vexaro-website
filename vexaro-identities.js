(function(){
'use strict';
const KEY='vexaro_active_identity';
const MEMBERS_APP='https://vexaro-members.vexaro241.workers.dev/';
const ADMIN_APP='https://vexaro-admin.vexaro241.workers.dev/';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
window.VEXARO_IDENTITIES={
 list:[],active:null,sb:null,
 async acceptHandoff(sb){
  try{
   const p=new URLSearchParams(location.hash.replace(/^#/,''));
   const access=p.get('vexaro_access'), refresh=p.get('vexaro_refresh');
   if(!access||!refresh)return null;
   const result=await sb.auth.setSession({access_token:access,refresh_token:refresh});
   history.replaceState({},document.title,location.pathname+location.search);
   return result.data?.session||null;
  }catch(e){
   try{history.replaceState({},document.title,location.pathname+location.search)}catch(_){}
   console.warn('VEXARO session handoff failed');
   return null;
  }
 },
 async init(sb,userId,preferredType){
  if(!sb||!userId)return null;
  this.sb=sb;
  const {data,error}=await sb.from('profile_identities').select('id,slug,username,display_name,bio,avatar_url,identity_type,can_post,can_moderate,can_view_business').eq('user_id',userId).order('identity_type');
  if(error){console.warn('Identity switcher:',error.message);return null}
  this.list=data||[];
  const path=(location.pathname||'').toLowerCase();
  const wanted=preferredType||((path.includes('admin-app')||location.hostname.includes('vexaro-admin'))?'admin':((path.includes('community')||location.hostname.includes('vexaro-members')||path==='/')?'creator':null));
  const saved=localStorage.getItem(KEY);
  this.active=this.list.find(x=>x.identity_type===wanted)||this.list.find(x=>x.id===saved)||this.list.find(x=>x.identity_type==='creator')||this.list[0]||null;
  if(this.active)localStorage.setItem(KEY,this.active.id);
  this.render();
  return this.active;
 },
 async switchTo(id){
  const x=this.list.find(v=>v.id===id);
  if(!x)return;
  this.active=x;
  localStorage.setItem(KEY,x.id);
  let target=x.identity_type==='admin'?ADMIN_APP:MEMBERS_APP;
  try{
   const result=await this.sb?.auth.getSession();
   const s=result?.data?.session;
   if(s?.access_token&&s?.refresh_token){
    target+='?handoff=1#vexaro_access='+encodeURIComponent(s.access_token)+'&vexaro_refresh='+encodeURIComponent(s.refresh_token);
   }
  }catch(_){}
  location.href=target;
 },
 render(){
  const el=document.getElementById('identitySwitcher');
  if(!el||!this.active)return;
  const other=this.list.find(x=>x.id!==this.active.id);
  const label=other?'Switch to '+esc(other.display_name):'';
  el.innerHTML='<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap"><span style="font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#777">Using</span><strong>'+esc(this.active.display_name)+'</strong><span style="font-size:9px;border:1px solid rgba(225,6,0,.35);border-radius:999px;padding:4px 7px;color:#e10600">'+esc(this.active.identity_type.toUpperCase())+'</span>'+(other?'<button class="btn mini" id="switchIdentityBtn" type="button">'+label+'</button>':'')+'</div>';
  const b=document.getElementById('switchIdentityBtn');
  if(b&&other)b.onclick=()=>this.switchTo(other.id);
 }
};
})();