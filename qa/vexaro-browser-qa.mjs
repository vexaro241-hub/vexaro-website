import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const OUT = "qa-results";
mkdirSync(OUT, { recursive: true });

const targets = [
  { name: "main", url: "https://vexaro-website.vexaro241.workers.dev/" },
  { name: "member", url: "https://vexaro-members.vexaro241.workers.dev/community.html" },
  { name: "admin", url: "https://vexaro-admin.vexaro241.workers.dev/" }
];

function run(args, allowFail = false) {
  try {
    return execFileSync("agent-browser", args, { encoding:"utf8", timeout:90000, stdio:["ignore","pipe","pipe"] });
  } catch (err) {
    if (allowFail) return (err.stdout || "") + (err.stderr || "");
    throw err;
  }
}

const report = [];
for (const target of targets) {
  const row = { ...target, ok:false, url:null, snapshot:null, screenshot:null, checks:[], error:null };
  try {
    run(["open", target.url]);
    run(["wait","2000"],true);
    row.url = run(["get","url"],true).trim();
    row.snapshot = run(["snapshot","-i","-c"],true);
    const shot = join(OUT,target.name+".png");
    run(["screenshot",shot],true);
    row.screenshot = shot;
    row.checks.push({name:"https",ok:/^https:\/\//.test(row.url)});
    row.checks.push({name:"nonempty-page",ok:row.snapshot.length>0});
    row.checks.push({name:"no-browser-error",ok:!/(ERR_|This site can’t be reached|Application error|Internal Server Error)/i.test(row.snapshot)});
    row.checks.push({name:"has-controls",ok:/button|input|link/i.test(row.snapshot)});
    if(target.name==="admin") row.checks.push({name:"admin-sign-in-gate",ok:/ADMIN SIGN IN|SIGN IN/i.test(row.snapshot)});
    if(target.name==="member") row.checks.push({name:"community-content",ok:/community|sign in|post|member/i.test(row.snapshot)});
    if(target.name==="main") row.checks.push({name:"vexaro-branding",ok:/VEXARO/i.test(row.snapshot)});
    row.ok=row.checks.every(x=>x.ok);
  } catch(e) { row.error=String(e?.message||e); }
  finally { run(["close"],true); }
  writeFileSync(join(OUT,target.name+".txt"),row.snapshot||row.error||"No snapshot");
  report.push(row);
}
const summary={generatedAt:new Date().toISOString(),passed:report.filter(x=>x.ok).length,failed:report.filter(x=>!x.ok).length,targets:report};
writeFileSync(join(OUT,"report.json"),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(summary.failed) process.exit(1);
