import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "qa-results";
mkdirSync(OUT, { recursive: true });

const targets = [
  { name: "home", url: "https://vexaroofficial.com/", title: /VEXARO/i },
  { name: "community", url: "https://vexaroofficial.com/community.html", title: /Community/i, communityNav: true },
  { name: "members-space", url: "https://vexaroofficial.com/members-space.html", title: /Members Space/i, memberCopy: true, memberNav: true },
  { name: "find-your-squad", url: "https://vexaroofficial.com/find-your-squad.html", title: /Find Your Squad/i, squadErrors: true },
  { name: "notifications", url: "https://vexaroofficial.com/notifications.html", title: /Notifications/i, notificationHardening: true },
  { name: "admin-hub", url: "https://vexaroofficial.com/admin-hub", title: /ADMIN HUB/i }
];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1365, height: 900 }
];

const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), base: "https://vexaroofficial.com", targets: [], failures: [] };

try {
  for (const target of targets) {
    const page = await browser.newPage({ viewport: viewports[0] });
    const pageErrors = [];
    const consoleErrors = [];
    const sameOriginFailures = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("requestfailed", request => {
      try {
        const url = new URL(request.url());
        if (url.origin === new URL(target.url).origin && !/\/(favicon\.ico|robots\.txt)$/i.test(url.pathname)) {
          sameOriginFailures.push({ url: request.url(), reason: request.failure()?.errorText || "request failed" });
        }
      } catch {}
    });

    const result = {
      name: target.name, url: target.url, status: 0, title: "", layouts: [],
      menuOpened: null, pageErrors, consoleErrors, sameOriginFailures, failures: []
    };

    try {
      const visitUrl = target.url + (target.url.includes("?") ? "&" : "?") + "vexaro_live_qa=" + Date.now();
      const response = await page.goto(visitUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      result.status = response?.status() || 0;
      await page.waitForTimeout(1200);
      result.title = await page.title();

      if (result.status < 200 || result.status >= 400) result.failures.push("Route returned HTTP " + result.status);
      if (!target.title.test(result.title)) result.failures.push("Unexpected page title: " + result.title);

      const scriptChecks = await page.evaluate(() => {
        const scripts = Array.from(document.scripts).map(s => s.textContent || "").join("\n");
        return {
          profileSync: scripts.includes(".from('profiles')") && scripts.includes(".update(payload)"),
          notificationHardening: scripts.includes("const safeLink") && scripts.includes(".eq('id',a.dataset.id).eq('user_id',session.user.id)"),
          squadErrorHandling: scripts.includes("VEXARO squad post publish failed:"),
          communityMobileCss: Boolean(document.getElementById("vexaro-community-mobile-nav-fix")),
          membersMobileCss: Boolean(document.getElementById("vexaro-members-mobile-nav-fix")),
          memberCopy: document.body.innerText.includes("Save your gaming identity to sync these public links")
        };
      });
      result.scriptChecks = scriptChecks;
      if (target.memberCopy && (!scriptChecks.memberCopy || !scriptChecks.profileSync)) {
        result.failures.push("Members Space profile sync script or guidance is missing");
      }
      if (target.notificationHardening && !scriptChecks.notificationHardening) {
        result.failures.push("Hardened notification renderer is missing");
      }
      if (target.squadErrors && !scriptChecks.squadErrorHandling) {
        result.failures.push("Squad publishing error handling patch is missing");
      }

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(200);
        const layout = await page.evaluate(() => {
          const visible = element => {
            if (!element) return false;
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
          };
          const candidates = [
            document.getElementById("vexaro-global-menu-fallback-btn"),
            document.getElementById("vexaro-global-menu-btn"),
            document.getElementById("hamb"),
            document.querySelector(".site-menu"),
            ...Array.from(document.querySelectorAll("button[aria-label],button[title]")).filter(element =>
              /menu|navigation/i.test((element.getAttribute("aria-label") || "") + " " + (element.getAttribute("title") || ""))
            )
          ];
          const visibleMenus = [...new Set(candidates.filter(visible))];
          const menu = visibleMenus[0] || null;
          const nav = document.querySelector(".top .navlinks") || document.querySelector(".navlinks");
          const visibleTabs = Array.from(document.querySelectorAll(".top .navlinks .tab")).filter(visible).length;
          const rect = menu?.getBoundingClientRect();
          return {
            width: window.innerWidth,
            rootScrollWidth: document.documentElement.scrollWidth,
            bodyScrollWidth: document.body.scrollWidth,
            horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2 || document.body.scrollWidth > window.innerWidth + 2,
            visibleMenuCount: visibleMenus.length,
            menuVisible: Boolean(menu),
            menuId: menu?.id || "",
            menuClass: typeof menu?.className === "string" ? menu.className : "",
            menuTop: rect?.top ?? null,
            menuRight: rect?.right ?? null,
            navDisplay: nav ? getComputedStyle(nav).display : null,
            navClientWidth: nav?.clientWidth ?? null,
            navScrollWidth: nav?.scrollWidth ?? null,
            navOverflow: nav ? nav.scrollWidth > nav.clientWidth + 2 : false,
            visibleTabs
          };
        });
        result.layouts.push({ viewport: viewport.name, ...layout });

        if (layout.horizontalOverflow) result.failures.push("Horizontal page overflow at " + viewport.name + " (" + layout.rootScrollWidth + "px document width / " + viewport.width + "px viewport)");
        if (layout.visibleMenuCount > 1) result.failures.push("Duplicate visible menu controls at " + viewport.name);
        if (viewport.name === "mobile" && !layout.menuVisible) result.failures.push("No visible navigation control at mobile width");
        if ((target.communityNav || target.memberNav) && viewport.name !== "desktop" && layout.navOverflow) {
          result.failures.push("Navigation items overflow their container at " + viewport.name);
        }
        if (target.communityNav && viewport.name === "mobile") {
          if (!scriptChecks.communityMobileCss) result.failures.push("Community mobile navigation CSS is missing");
          if (layout.visibleTabs < 5) result.failures.push("Too few visible Community tabs at mobile width: " + layout.visibleTabs);
        }
        if (target.memberNav && viewport.name === "mobile" && !scriptChecks.membersMobileCss) {
          result.failures.push("Members Space mobile navigation CSS is missing");
        }

        if (viewport.name === "mobile" && target.name === "community" && layout.menuId === "vexaro-global-menu-fallback-btn") {
          await page.locator("#vexaro-global-menu-fallback-btn").click({ timeout: 5000 });
          await page.waitForTimeout(150);
          const opened = await page.locator("#vexaro-global-menu-fallback-panel").evaluate(element => {
            const style = getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
          }).catch(() => false);
          result.menuOpened = opened;
          if (!opened) result.failures.push("Community fallback menu did not open");
          await page.locator("#vexaro-global-menu-fallback-btn").click({ timeout: 5000 }).catch(() => {});
        }
      }

      if (["home", "community", "members-space"].includes(target.name)) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: join(OUT, target.name + "-mobile.png"), fullPage: true });
      }
    } catch (error) {
      result.failures.push("Browser test exception: " + String(error?.message || error));
    } finally {
      await page.close().catch(() => {});
    }

    if (pageErrors.length) result.failures.push("Browser page errors: " + pageErrors.join(" | "));
    if (sameOriginFailures.length) result.failures.push("Same-origin resource failures: " + JSON.stringify(sameOriginFailures));
    result.ok = result.failures.length === 0;
    report.targets.push(result);
    report.failures.push(...result.failures.map(failure => target.name + ": " + failure));
  }
} finally {
  await browser.close();
}

report.passed = report.targets.filter(target => target.ok).length;
report.failed = report.targets.filter(target => !target.ok).length;
writeFileSync(join(OUT, "responsive-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.failed) process.exitCode = 1;
