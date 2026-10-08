const base = process.env.VEXARO_BASE_URL || "https://vexaro-website.vexaro241.workers.dev";
const baseUrl = new URL(base);
const paths = ["/","/health","/community.html","/manifest.webmanifest","/robots.txt","/sitemap.xml","/clips.html","/loadouts.html","/settings.html","/marketplace.html","/membership.html","/about.html","/controller-settings.html","/graphics-settings.html","/warzone-movement-settings.html","/warzone-fov-settings.html","/warzone-xbox-settings.html"];
const requiredHeaders = ["content-security-policy","x-content-type-options","referrer-policy","permissions-policy"];

async function get(path){
  const response=await fetch(new URL(path,baseUrl),{
    headers:{"user-agent":"VEXARO-site-audit/1.2"},
    redirect:"follow",
    signal:AbortSignal.timeout(20000)
  });
  return {
    status:response.status,
    headers:Object.fromEntries(response.headers.entries()),
    body:await response.text(),
    url:response.url
  };
}

const failures=[];
const warnings=[];
for(const path of paths){
  try{
    const r=await get(path);
    if(r.status<200 || r.status>=400) failures.push(`${path}: HTTP ${r.status}`);
    if(new URL(r.url).origin!==baseUrl.origin) failures.push(`${path}: redirected outside production origin to ${r.url}`);
    if(path==="/" && !/VEXARO/i.test(r.body)) failures.push("/: VEXARO marker missing");
    if(path==="/" && !/rel=["']canonical["']/i.test(r.body)) failures.push("/: canonical link missing");
    if(path==="/" && !/rel=["']manifest["']/i.test(r.body)) failures.push("/: manifest link missing");
    if(path==="/" ){
      for(const h of requiredHeaders) if(!r.headers[h]) warnings.push(`/: missing ${h}`);
    }
  }catch(e){ failures.push(`${path}: ${e.message}`); }
}
if(warnings.length) console.warn(warnings.join("\n"));
if(failures.length){ console.error(failures.join("\n")); process.exit(1); }
console.log(`VEXARO site audit passed for ${base} with ${warnings.length} warning(s)`);
