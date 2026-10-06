import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const HTML_EXT = new Set([".html", ".htm"]);
const ASSET_EXT = new Set([".html", ".htm", ".js", ".css", ".json", ".webmanifest", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2", ".txt", ".xml"]);

function walk(dir){
  const out=[];
  for(const name of readdirSync(dir)){
    if([".git","node_modules","qa-results"].includes(name)) continue;
    const p=join(dir,name), s=statSync(p);
    if(s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
function fail(msg){ console.error("FAIL:",msg); failures++; }
let failures=0, warnings=0;
const files=walk(ROOT);
const htmlFiles=files.filter(p=>HTML_EXT.has(extname(p).toLowerCase()));

for(const file of htmlFiles){
  const rel=file.slice(ROOT.length+1).replaceAll("\\","/");
  const html=readFileSync(file,"utf8");
  let cursor=0, scriptNo=0;
  while(true){
    const a=html.indexOf("<script",cursor);
    if(a<0) break;
    const b=html.indexOf(">",a), c=html.indexOf("</script>",b);
    if(b<0||c<0){ fail(rel+": unterminated script tag"); break; }
    const tag=html.slice(a,b+1), code=html.slice(b+1,c);
    if(!/\bsrc\s*=/.test(tag) && code.trim()){
      try{ new Function(code); }
      catch(e){ fail(rel+" inline script "+(++scriptNo)+": "+e.message); }
    }
    cursor=c+9;
  }
  const refs=[];
  for(const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)) refs.push(m[1]);
  for(const ref of refs){
    if(!ref || /^(?:https?:|data:|mailto:|tel:|#|javascript:)/i.test(ref)) continue;
    const clean=ref.split("#")[0].split("?")[0];
    if(!clean || clean.endsWith("/")) continue;
    const target=join(ROOT, rel.includes("/")?rel.slice(0,rel.lastIndexOf("/")+1):"", clean);
    if(!ASSET_EXT.has(extname(clean).toLowerCase())) continue;
    if(!statExists(target)) fail(rel+" references missing local asset: "+ref);
  }
}
function statExists(p){try{return statSync(p).isFile()}catch{return false}}
console.log(JSON.stringify({ok:failures===0,checkedHtml:htmlFiles.length,failures,warnings},null,2));
if(failures) process.exit(1);
