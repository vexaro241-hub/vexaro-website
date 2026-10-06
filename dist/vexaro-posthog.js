(function(){
  var TOKEN="phc_Bojw48aWn4mCa4tX3UGtX4NPTsYg89Qi54yQ4Fw6GR9h";
  var HOST="https://eu.i.posthog.com";
  function start(){
    if(!window.posthog || window.__VEXARO_POSTHOG_READY)return;
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
  if(!window.posthog){
    var s=document.createElement("script");
    s.src="https://eu-assets.i.posthog.com/static/array.js";
    s.async=true;
    s.onload=function(){setTimeout(start,2500)};
    document.head.appendChild(s);
  }else start();
  window.VEXARO_POSTHOG_IDENTIFY=function(id,props){
    try{if(window.posthog&&id)window.posthog.identify(String(id),props||{});}catch(_){}
  };
  window.VEXARO_POSTHOG_RESET=function(){
    try{if(window.posthog)window.posthog.reset();}catch(_){}
  };
})();