import https from "node:https";

const base = process.env.VEXARO_BASE_URL || "https://vexaro-website.vexaro241.workers.dev";
const paths = ["/","/health","/community.html","/manifest.webmanifest","/robots.txt","/sitemap.xml"];
const requiredHeaders = ["content-security-policy","x-content-type-options","referrer-policy","permissions-policy"];

function get(path){
  return new Promise((resolve,reject)=>{
    const req=https.get(new URL(path,base),{headers:{"user-agent":"VEXARO-site-audit/1.1"}},res=>{
      let body="";
      res.setEncoding("utf8");
      res.on("data",c=>body+=c);
      res.on("end",()=>resolve({status:res.statusCode||0,headers:res.headers,body}));
    });
    req.setTimeout(20000,()=>req.destroy(new Error("timeout")));
    req.on("error",reject);
  });
}

const failures=[];
const warnings=[];
for(const path of paths){
  try{
    const r=await get(path);
    if(r.status<200 || r.status>=400) failures.push(`${path}: HTTP ${r.status}`);
    else if(r.status>=300) warnings.push(`${path}: HTTP ${r.status} redirect`);
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
