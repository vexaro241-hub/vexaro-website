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
const files = ["index.html","app.html","about.html","clips.html","loadouts.html"];
for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  if (html.includes("http://localhost") || html.includes("https://localhost")) failures.push(`Localhost reference in ${file}`);
  if (html.includes('href="/live/"') || html.includes('href="live/"')) failures.push(`Legacy relative Live route in ${file}`);
}
if (!index.includes("https://vexaro-website.vexaro241.workers.dev/live/")) failures.push("Canonical Live route missing");
if (fs.existsSync("dist/index.html")) {
  const distIndex = fs.readFileSync("dist/index.html","utf8");
  if (!distIndex.includes("https://vexaro-website.vexaro241.workers.dev/live/")) failures.push("Dist canonical Live route missing");
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("VEXARO static validation passed.");
