import https from "node:https";

const targets = [
  ["website", process.env.VEXARO_WEBSITE_URL || "https://vexaro-website.vexaro241.workers.dev"],
  ["members", process.env.VEXARO_MEMBERS_URL || "https://vexaro-members.vexaro241.workers.dev"],
  ["admin", process.env.VEXARO_ADMIN_URL || "https://vexaro-admin.vexaro241.workers.dev"]
];

const websitePaths = ["/", "/health", "/community.html", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml"];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { "user-agent": "VEXARO-platform-audit/1.0" }
    }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => body += chunk);
      res.on("end", () => resolve({
        status: res.statusCode || 0,
        headers: res.headers,
        body
      }));
    });
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

async function checkTarget(name, base) {
  const result = { name, base, ok: true, checks: [], errors: [] };
  const root = await get(new URL("/", base));
  result.checks.push({ path: "/", status: root.status });
  if (root.status < 200 || root.status >= 400) {
    result.errors.push(`${name} /: HTTP ${root.status}`);
  }
  if (root.status >= 500) result.errors.push(`${name} /: server error`);

  for (const path of ["/health", "/api/health"]) {
    try {
      const r = await get(new URL(path, base));
      result.checks.push({ path, status: r.status });
      if (r.status >= 500) result.errors.push(`${name} ${path}: HTTP ${r.status}`);
    } catch (error) {
      result.checks.push({ path, status: "unreachable", error: error.message });
    }
  }

  if (name === "website") {
    for (const path of websitePaths.slice(1)) {
      try {
        const r = await get(new URL(path, base));
        result.checks.push({ path, status: r.status });
        if (r.status !== 200) result.errors.push(`website ${path}: HTTP ${r.status}`);
        if (path === "/" && !/VEXARO/i.test(r.body)) result.errors.push("website /: VEXARO marker missing");
      } catch (error) {
        result.errors.push(`website ${path}: ${error.message}`);
      }
    }
    if (!/VEXARO/i.test(root.body)) result.errors.push("website /: VEXARO marker missing");
  }

  result.ok = result.errors.length === 0;
  return result;
}

const started = Date.now();
const results = [];
for (const [name, base] of targets) {
  try {
    results.push(await checkTarget(name, base));
  } catch (error) {
    results.push({ name, base, ok: false, checks: [], errors: [error.message] });
  }
}

const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({
  ok: failed.length === 0,
  durationMs: Date.now() - started,
  checkedAt: new Date().toISOString(),
  results
}, null, 2));

if (failed.length) process.exit(1);
