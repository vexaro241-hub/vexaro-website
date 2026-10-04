(function(){
'use strict';
const KEY='vexaro_active_identity';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
window.VEXARO_IDENTITIES={
  list:[],active:null,
  async init(sb,userId,preferredType){
    if(!sb||!userId)return;
    const {data,error}=await sb.from('profile_identities').select('id,slug,username,display_name,bio,avatar_url,identity_type,can_post,can_moderate,can_view_business').eq('user_id',userId).order('identity_type');
    if(error){console.warn('Identity switcher:',error.message);return}
    this.list=data||[];
    const path=(location.pathname||'').toLowerCase();
    const wanted=preferredType||((path.includes('admin-app')||path.includes('admin'))?'admin':path.includes('community')||path==='/'?'creator':null);
    const saved=localStorage.getItem(KEY);
    this.active=this.list.find(x=>x.identity_type===wanted)||this.list.find(x=>x.id===saved)||this.list.find(x=>x.identity_type==='creator')||this.list[0]||null;
    if(this.active)localStorage.setItem(KEY,this.active.id);
    this.render(); return this.active;
  },
  set(id){
    const x=this.list.find(v=>v.id===id); if(!x)return;
    this.active=x;localStorage.setItem(KEY,x.id);this.render();
    if(x.identity_type==='admin') location.href='/admin-app.html';
    else location.href='/';
  },
  render(){
    const el=document.getElementById('identitySwitcher'); if(!el||!this.active)return;
    const other=this.list.find(x=>x.id!==this.active.id);
    el.innerHTML='<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap"><span style="font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#777">Using</span><strong>'+esc(this.active.display_name)+'</strong><span style="font-size:9px;border:1px solid rgba(225,6,0,.35);border-radius:999px;padding:4px 7px;color:#e10600">'+esc(this.active.identity_type.toUpperCase())+'</span>'+(other?'<button type="button" class="btn mini" id="switchIdentityBtn">Switch to '+esc(other.display_name)+'</button>':'')+'</div>';
    const b=document.getElementById('switchIdentityBtn'); if(b)b.onclick=()=>this.set(other.id);
  }
};
})();