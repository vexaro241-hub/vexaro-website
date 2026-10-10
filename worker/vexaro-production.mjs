// Production deployment trigger: keep asset bundle managed by Wrangler.
export default {
  async fetch(request, env) {
    // Normalise all supported Admin Hub entry points before static asset lookup.
    const incomingUrl = new URL(request.url);
    if (["/admin-hub", "/admin-hub/", "/admin-hub.html"].includes(incomingUrl.pathname)) {
      incomingUrl.pathname = "/admin-app.html";
      request = new Request(incomingUrl, request);
    }
    const asset = await env.ASSETS.fetch(request);
    const type = asset.headers.get("content-type") || "";
    let response = asset;

    if (type.includes("text/html")) {
      let html = await asset.text();
      const requestUrl = new URL(request.url);
      const path = requestUrl.pathname;
      // Keep the temporary Worker origin out of public absolute URLs when the real domain is attached.
      // This makes canonical/social/schema links, sitemap, and other generated URLs follow the host serving the request.
      html = html.replaceAll("https://vexaro-website.vexaro241.workers.dev", requestUrl.origin);

      const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "VEXARO";
      const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim() || "";
      const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1]?.trim() || new URL(request.url).href;
      const ogUrl = canonical.replace(/\.html$/i, "");
      const image = new URL("/hero.webp", request.url).href;
      const esc = value => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      html = html.replace(/<meta\s+(?:property|name)=["'](?:og:|twitter:)[^>]*>\s*/gi, "");
      const social = [
        ["property", "og:title", title],
        ["property", "og:description", description],
        ["property", "og:type", "website"],
        ["property", "og:url", ogUrl],
        ["property", "og:image", image],
        ["name", "twitter:card", "summary_large_image"],
        ["name", "twitter:title", title],
        ["name", "twitter:description", description],
        ["name", "twitter:image", image]
      ].map(([kind, name, value]) => '<meta ' + kind + '="' + esc(name) + '" content="' + esc(value) + '">').join("");
      html = html.replace(/<\/head>/i, social + "</head>");

      // Ensure every public VEXARO page has the shared top-right navigation unless it already includes it.
      if (!/vexaro-nav(?:-v2)?\.js/i.test(html) && !path.startsWith("/health/") && !/^\/google[0-9a-f]+\.html$/i.test(path)) {
        html = html.replace(/<\/head>/i, '<script src="/vexaro-nav.js" defer></script></head>');
      }

      // Fix the Community tab row on narrow screens without introducing horizontal scrolling.
      if (/^\/community(?:\.html|\/)?$/i.test(path)) {
        const communityMobileStyle = `<style id="vexaro-community-mobile-nav-fix">
@media(max-width:800px){
 .top .nav{height:auto!important;min-height:72px!important;max-height:none!important;display:flex!important;flex-wrap:wrap!important;align-items:center!important;overflow:visible!important;padding:12px 0!important}
 .navlinks{position:static!important;inset:auto!important;order:initial!important;display:grid!important;grid-template-columns:repeat(auto-fit,minmax(105px,1fr))!important;flex:1 1 100%!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;margin:0!important;padding:8px 0!important;gap:7px!important;overflow:visible!important;background:transparent!important;border:0!important;border-top:1px solid #25262c!important;box-shadow:none!important;backdrop-filter:none!important}
 .navlinks .tab{height:auto!important;min-height:36px!important;min-width:0!important;width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:9px 5px!important;font-size:9px!important;line-height:1.2!important;white-space:normal!important;text-align:center!important}
}
</style>`;
        html = html.replace(/<\/head>/i, communityMobileStyle + "</head>");
      }

      if (path === "/loadouts.html") {
        html = html.replace(
          /if\(!builds\.length\)\{[\s\S]*?\}\}catch\(e\)/,
          "if(!builds.length){grid.innerHTML='<article class=\"card\"><div class=\"num\">VEXARO / STARTER</div><h3>NO PUBLISHED BUILDS YET.</h3><p>The arsenal is ready. Sign in through the community to publish the first VEXARO loadout.</p><div class=\"card-actions\"><a class=\"ghost\" href=\"community.html\">OPEN COMMUNITY</a><a class=\"ghost\" href=\"controller-settings.html\">TUNE SETTINGS</a></div></article>';} }catch(e)"
        );
      }

      if (/^\/community(?:\.html|\/)?$/i.test(path)) {
        // Older Community assets had profile CSS after </html>; move that CSS back inside the document.
        const htmlClose = html.toLowerCase().lastIndexOf("</html>");
        if (htmlClose >= 0) {
          const trailing = html.slice(htmlClose + 7).trim();
          if (trailing.startsWith("/* VEXARO master release: profile and sign-in polish */")) {
            const documentPart = html.slice(0, htmlClose);
            const profileStyle = '<style id="vx-profile-polish">' + trailing + '</style>';
            html = documentPart.replace(/<\/body>/i, profileStyle + "</body>") + "</html>";
          }
        }
      }

      if (path === "/" || path === "/index.html") {
        // Repair a legacy nested homepage style tag only when the fit layer is not preceded by a close tag.
        const fitMarker = '<style id="vexaro-homepage-fit-v1">';
        const fitIndex = html.indexOf(fitMarker);
        if (fitIndex >= 0) {
          const previousStyleOpen = html.lastIndexOf("<style", fitIndex - 1);
          const previousStyleClose = html.lastIndexOf("</style>", fitIndex - 1);
          if (previousStyleOpen > previousStyleClose) {
            html = html.slice(0, fitIndex) + "</style>" + html.slice(fitIndex);
          }
        }
      }

      response = new Response(html, asset);
    } else if (type.includes("text/xml") || type.includes("application/xml") || type.includes("text/plain") || type.includes("application/manifest+json") || type.includes("application/json")) {
      const requestUrl = new URL(request.url);
      const body = await asset.text();
      response = new Response(body.replaceAll("https://vexaro-website.vexaro241.workers.dev", requestUrl.origin), asset);
    }

    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://eu-assets.i.posthog.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://gyapnhfsbsnxkyfqlsxh.supabase.co https://vexaro-password-check.vexaro241.workers.dev https://vexaro-members.vexaro241.workers.dev https://vexaro-admin.vexaro241.workers.dev https://vexaro-twitch-auth.vexaro241.workers.dev https://vexaro-youtube-auth.vexaro241.workers.dev https://www.googleapis.com https://api.twitch.tv https://eu.i.posthog.com https://static.cloudflareinsights.com; frame-src 'self' https://www.youtube.com https://www.twitch.tv https://player.twitch.tv; form-action 'self' https://id.twitch.tv https://accounts.google.com; manifest-src 'self'; worker-src 'self' blob:");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Cache-Control", "no-store");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
