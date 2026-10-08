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
  const legacyLive=rel==="live/index.html";
  const html=readFileSync(file,"utf8");
  const clientCreations=(html.match(/(?:window\\.)?supabase\\.createClient\\s*\\(/g)||[]).length;
  if(rel!=="admin-app.html"&&clientCreations>0) fail(rel+": use the shared Supabase client instead of creating another auth client");
  if(rel==="admin-app.html"&&clientCreations>1) fail(rel+": Admin Hub must reuse its single auth client");
  const hasSupabaseUmd=/supabase-js@2\\/dist\\/umd\\/supabase\\.min\\.js/.test(html);
  const hasSupabaseConfig=/supabase-config\\.js/.test(html);
  const hasInlineAdminConfig=rel==="admin-app.html"&&/window\\.VEXARO_SUPABASE_URL/.test(html);
  if(hasSupabaseUmd&&!hasSupabaseConfig&&!hasInlineAdminConfig) fail(rel+": Supabase library is loaded without its shared config");
  let cursor=0;
  while(true){
    const a=html.indexOf("<script",cursor);
    if(a<0) break;
    const b=html.indexOf(">",a), c=html.indexOf("</script>",b);
    if(b<0||c<0){ fail(rel+": unterminated script tag"); break; }
    const tag=html.slice(a,b+1), code=html.slice(b+1,c);
    if (/\\bsrc\\s*=\\s*["'][^"']*\\s+(?:defer|async|type|crossorigin)(?:\\s|>)/i.test(tag)) {
      fail(rel+": malformed script src attribute: "+tag.trim());
    }
    if (/\\bsrc\\s*=\\s*["'][^"']*(?:\\s+defer|\\s+async|\\s+type\\s*=)/i.test(tag) && !/["']\\s*(?:defer|async|type\\s*=|>)/i.test(tag.slice(tag.toLowerCase().indexOf("src")))) {
      fail(rel+": script attributes appear to be embedded inside src");
    }
    const type=(tag.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]||"").toLowerCase();
    if(!/\bsrc\s*=/.test(tag) && code.trim() && type==="application/ld+json") warnings++;
    cursor=c+9;
  }

  if(legacyLive) continue;

  for(const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)){
    const ref=m[1];
    if(!ref || /^(?:https?:|data:|mailto:|tel:|#|javascript:)/i.test(ref)) continue;
    const clean=ref.split("#")[0].split("?")[0];
    if(!clean || clean.endsWith("/")) continue;
    const target=clean.startsWith("/")
      ? join(ROOT, clean.slice(1))
      : join(ROOT, rel.includes("/")?rel.slice(0,rel.lastIndexOf("/")+1):"", clean);
    if(!ASSET_EXT.has(extname(clean).toLowerCase())) continue;
    if(!statExists(target)) fail(rel+" references missing local asset: "+ref);
  }
}
console.log(JSON.stringify({ok:failures===0,checkedHtml:htmlFiles.length,failures,warnings},null,2));
if(failures) process.exit(1);

function statExists(p){try{return statSync(p).isFile()}catch{return false}}
