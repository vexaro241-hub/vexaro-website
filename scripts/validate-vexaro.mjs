import fs from "node:fs";
import path from "node:path";

const required = [
  "index.html",
  "community.html",
  "vexaro-nav-v2.js",
  "vexaro-session.js",
  "supabase-config.js",
  "manifest.webmanifest"
];

const failures = [];
for (const file of required) {
  if (!fs.existsSync(path.resolve(file))) failures.push(`Missing required file: ${file}`);
}
const index = fs.readFileSync("index.html","utf8");
const nav = fs.readFileSync("vexaro-nav-v2.js","utf8");
if (nav.includes("community.html?signin=1")) failures.push("Legacy sign-in route still present");
if (!index.includes("auth=signin")) failures.push("Main-site sign-in route missing");
if (!index.includes("vexaro-nav-v2.js?v=")) failures.push("Navigation cache-busting reference missing");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("VEXARO static validation passed.");
