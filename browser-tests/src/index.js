import puppeteer from "@cloudflare/puppeteer";

const TARGETS = { production: "https://vexaro-website.vexaro241.workers.dev" };
const TEST_PATHS = ["/","/health","/community.html","/manifest.webmanifest","/robots.txt","/sitemap.xml"];

const json = (data, status=200) => Response.json(data, {
  status,
  headers: {"cache-control":"no-store","content-type":"application/json; charset=utf-8"}
});
const cleanUrl = url => { const u=new URL(url); return u.origin+u.pathname; };

async function runBrowserSuite(env, targetName="production") {
  const base=TARGETS[targetName];
  if(!base) throw new Error("Unknown target");
  const browser=await puppeteer.launch(env.BROWSER);
  const started=Date.now(), results=[], errors=[];
  try {
    for(const viewport of [
      {name:"mobile",width:390,height:844,isMobile:true,hasTouch:true},
      {name:"desktop",width:1440,height:900,isMobile:false,hasTouch:false}
    ]) {
      const page=await browser.newPage();
      await page.setViewport({width:viewport.width,height:viewport.height,isMobile:viewport.isMobile,hasTouch:viewport.hasTouch,deviceScaleFactor:1});
      const consoleErrors=[], pageErrors=[];
      page.on("console",msg=>{if(msg.type()==="error") consoleErrors.push(msg.text());});
      page.on("pageerror",err=>pageErrors.push(String(err)));
      const response=await page.goto(base+"/",{waitUntil:"networkidle2",timeout:30000});
      const home=await page.evaluate(()=>({
        title:document.title,
        bodyText:document.body?.innerText?.slice(0,5000)||"",
        links:[...document.querySelectorAll("a[href]")].slice(0,100).map(a=>({text:(a.textContent||"").trim(),href:a.href}))
      }));
      results.push({viewport:viewport.name,homepageStatus:response?.status()??null,homepageUrl:cleanUrl(page.url()),title:home.title,vexaroMarker:/VEXARO/i.test(home.bodyText),consoleErrors,pageErrors});
      if(!home.title) errors.push(viewport.name+": missing document title");
      if(!/VEXARO/i.test(home.bodyText)) errors.push(viewport.name+": VEXARO marker missing");
      if(consoleErrors.length) errors.push(viewport.name+": browser console errors: "+consoleErrors.slice(0,3).join(" | "));
      if(pageErrors.length) errors.push(viewport.name+": page errors: "+pageErrors.slice(0,3).join(" | "));
      const signIn=home.links.find(x=>/sign\s*in/i.test(x.text));
      if(signIn) {
        await page.goto(signIn.href,{waitUntil:"networkidle2",timeout:30000});
        const auth=await page.evaluate(()=>({url:location.href,text:document.body?.innerText?.slice(0,4000)||"",modal:!!document.querySelector('[role="dialog"],#authModal,#signInModal,.auth-modal,[data-auth-modal]')}));
        results.push({viewport:viewport.name,signInSmoke:{reached:true,url:cleanUrl(page.url()),hasAuthUi:auth.modal||/sign\s*in|email|password/i.test(auth.text)}});
        if(!auth.modal&&!/sign\s*in|email|password/i.test(auth.text)) errors.push(viewport.name+": SIGN IN did not expose authentication UI");
      } else errors.push(viewport.name+": SIGN IN link/button not discoverable");
      await page.close();
    }
    const page=await browser.newPage();
    for(const path of TEST_PATHS) {
      const response=await page.goto(base+path,{waitUntil:"domcontentloaded",timeout:30000});
      const status=response?.status()??null;
      results.push({path,status,finalUrl:cleanUrl(page.url())});
      if(status!==200) errors.push(path+": expected HTTP 200, got "+status);
    }
    await page.close();
  } finally { await browser.close(); }
  return {ok:errors.length===0,target:targetName,base,durationMs:Date.now()-started,checkedAt:new Date().toISOString(),results,errors};
}

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname==="/health") return json({ok:true,service:"vexaro-live-browser-tests"});
    const expected=env.TEST_TOKEN;
    const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
    if(!expected||supplied!==expected) return json({ok:false,error:"unauthorized"},401);
    if(url.pathname==="/run"&&request.method==="POST") {
      try {
        const result=await runBrowserSuite(env,url.searchParams.get("target")||"production");
        console.log(JSON.stringify({event:"vexaro_browser_suite",ok:result.ok,target:result.target,durationMs:result.durationMs,errors:result.errors}));
        return json(result,result.ok?200:502);
      } catch(error) {
        console.error("Browser suite failed",error);
        return json({ok:false,error:String(error),checkedAt:new Date().toISOString()},502);
      }
    }
    return json({ok:false,error:"Use POST /run with Authorization: Bearer <TEST_TOKEN>"},405);
  }
};
