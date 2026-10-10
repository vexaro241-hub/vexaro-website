import { chromium } from "playwright";

const base = process.env.VEXARO_BASE_URL || "https://vexaroofficial.com";
const routes = [
  "/", "/about", "/app", "/community", "/find-your-squad", "/marketplace",
  "/membership", "/clips", "/loadouts", "/settings", "/live/",
  "/search", "/notifications", "/admin-app", "/controller-settings",
  "/graphics-settings", "/warzone-movement-settings", "/warzone-fov-settings",
  "/warzone-xbox-settings", "/warzone-playstation-settings", "/warzone-pc-settings"
];
const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 }
];
const results = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const route of routes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const pageErrors = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      let responseStatus = 0;
      let finalUrl = "";
      let title = "";
      let overflow = null;
      let mainMenu = null;
      let screenshot = null;
      let failure = null;
      try {
        const response = await page.goto(new URL(route, base).href, { waitUntil: "domcontentloaded", timeout: 45000 });
        responseStatus = response?.status() || 0;
        await page.waitForTimeout(1200);
        finalUrl = page.url();
        title = await page.title().catch(() => "");
        overflow = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body?.scrollWidth || 0,
          hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
        }));
        mainMenu = await page.locator("#vexaro-global-menu-btn, #hamb, button[aria-label*='menu' i], button[aria-label*='navigation' i]").count();
        if (route === "/" && viewport.name !== "desktop") {
          await page.screenshot({ path: `qa-results-home-${viewport.name}.png`, fullPage: true }).catch(() => {});
          screenshot = `qa-results-home-${viewport.name}.png`;
        }
        const failures = [];
        if (responseStatus >= 400 || responseStatus === 0) failures.push(`HTTP ${responseStatus}`);
        if (!title.trim()) failures.push("missing document title");
        if (overflow.hasHorizontalOverflow) failures.push("horizontal document overflow");
        if (pageErrors.length) failures.push(`uncaught page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
        failure = failures.length ? failures.join("; ") : null;
      } catch (error) {
        failure = String(error?.message || error);
      } finally {
        results.push({
          route, viewport: viewport.name, width: viewport.width, height: viewport.height,
          status: responseStatus, finalUrl, title, overflow, menuControlsFound: mainMenu,
          pageErrors, screenshot, passed: !failure, failure
        });
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const summary = {
  base, generatedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter(r => r.passed).length,
  failed: results.filter(r => !r.passed).length,
  results
};
await (await import("node:fs/promises")).mkdir("qa-results", { recursive: true });
await (await import("node:fs/promises")).writeFile("qa-results/report.json", JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, results: results.map(({route, viewport, status, title, overflow, passed, failure}) => ({route, viewport, status, title, overflow, passed, failure})) }, null, 2));
if (summary.failed) process.exitCode = 1;
