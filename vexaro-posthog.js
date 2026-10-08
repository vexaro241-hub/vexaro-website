(function(){
  'use strict';
  var TOKEN="phc_Bojw48aWn4mCa4tX3UGtX4NPTsYg89Qi54yQ4Fw6GR9h";
  var HOST="https://eu.i.posthog.com";
  var automated=navigator.webdriver===true||/bot|crawler|spider|headless|playwright|puppeteer|webdriver|agent-browser|browserstack/i.test(navigator.userAgent||'');
  var qa=new URLSearchParams(location.search).get('vexaro_qa')==='1';
  function start(){
    if(automated||qa||!window.posthog||window.__VEXARO_POSTHOG_READY)return;
    window.__VEXARO_POSTHOG_READY=true;
    window.posthog.init(TOKEN,{
      api_host:HOST,
      defaults:"2026-05-30",
      autocapture:false,
      capture_pageview:true,
      capture_pageleave:true,
      person_profiles:"identified_only",
      session_recording:false
    });
    window.posthog.capture("vexaro_app_loaded",{app:document.title||"VEXARO"});
  }
  function authSafeStart(){
    if(automated||qa)return;
    if(window.supabase&&window.VEXARO_SUPABASE_URL&&window.VEXARO_SUPABASE_KEY){
      try{
        var sb=window.vexaroSupabase;
        sb.auth.getSession().then(function(res){
          var s=res&&res.data&&res.data.session;
          if(!s){start();return;}
          sb.from('profiles').select('role').eq('id',s.user.id).maybeSingle().then(function(r){
            if(String(r&&r.data&&r.data.role||'').toLowerCase()==='admin')return;
            start();
          }).catch(start);
        }).catch(start);
        return;
      }catch(_){}
    }
    setTimeout(authSafeStart,800);
  }
  function waitForPosthog(){
    if(window.posthog){authSafeStart();return;}
    var s=document.createElement("script");
    s.src="https://eu-assets.i.posthog.com/static/array.js";
    s.async=true;
    s.onload=function(){setTimeout(authSafeStart,250)};
    document.head.appendChild(s);
  }
  waitForPosthog();
  window.VEXARO_POSTHOG_IDENTIFY=function(id,props){
    try{if(window.posthog&&id)window.posthog.identify(String(id),props||{});}catch(_){}
  };
  window.VEXARO_POSTHOG_RESET=function(){
    try{if(window.posthog)window.posthog.reset();}catch(_){}
  };
})();