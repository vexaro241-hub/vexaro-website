// Production deployment trigger: keep asset bundle managed by Wrangler.
export default {
  async fetch(request, env) {
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

      if (path === "/loadouts.html") {
        html = html.replace(
          /if\(!builds\.length\)\{[\s\S]*?\}\}catch\(e\)/,
          "if(!builds.length){grid.innerHTML='<article class=\"card\"><div class=\"num\">VEXARO / STARTER</div><h3>NO PUBLISHED BUILDS YET.</h3><p>The arsenal is ready. Sign in through the community to publish the first VEXARO loadout.</p><div class=\"card-actions\"><a class=\"ghost\" href=\"community.html\">OPEN COMMUNITY</a><a class=\"ghost\" href=\"controller-settings.html\">TUNE SETTINGS</a></div></article>';} }catch(e)"
        );
      }

      response = new Response(html, asset);
    } else if (type.includes("text/xml") || type.includes("application/xml") || type.includes("text/plain") || type.includes("application/manifest+json") || type.includes("application/json")) {
      const requestUrl = new URL(request.url);
      const body = await asset.text();
      response = new Response(body.replaceAll("https://vexaro-website.vexaro241.workers.dev", requestUrl.origin), asset);
    }

    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://eu-assets.i.posthog.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://gyapnhfsbsnxkyfqlsxh.supabase.co https://vexaro-password-check.vexaro241.workers.dev https://vexaro-members.vexaro241.workers.dev https://vexaro-admin.vexaro241.workers.dev https://vexaro-twitch-auth.vexaro241.workers.dev https://vexaro-youtube-auth.vexaro241.workers.dev https://www.googleapis.com https://api.twitch.tv https://eu.i.posthog.com https://cloudflareinsights.com; frame-src 'self' https://www.youtube.com https://www.twitch.tv https://player.twitch.tv; form-action 'self' https://id.twitch.tv https://accounts.google.com; manifest-src 'self'; worker-src 'self' blob:");
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
