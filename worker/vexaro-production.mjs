// Production deployment trigger: keep asset bundle managed by Wrangler.
export default {
  async fetch(request, env) {
    // Normalise all supported Admin Hub entry points before static asset lookup.
    const incomingUrl = new URL(request.url);
    if (["/admin-hub", "/admin-hub/", "/admin-hub.html"].includes(incomingUrl.pathname)) {
      incomingUrl.pathname = "/admin-app.html";
      request = new Request(incomingUrl, request);
    }
    // Fetch the underlying extensionless asset internally so Worker fixes still apply to clean .html URLs.
    const requestUrl = new URL(request.url);
    const path = requestUrl.pathname;
    if (/^\/[^/]+\.html$/i.test(path)) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = path.toLowerCase() === "/index.html" ? "/" : path.replace(/\.html$/i, "");
      request = new Request(assetUrl, request);
    }
    const asset = await env.ASSETS.fetch(request);
    const type = asset.headers.get("content-type") || "";
    let response = asset;

    if (type.includes("text/html")) {
      let html = await asset.text();
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

      // Keep Members Space guidance aligned with the profile fields that sync to Supabase when signed in.
      html = html.replace(
        "These fields simply store links on this device for now.",
        "Save your gaming identity to sync these public links to your VEXARO profile. YouTube authorisation is a separate step."
      );

      // Give squad-post publishing failures a useful permission/setup/connection explanation.
      const oldSquadPublishCatch = "catch(err){$('formStatus').textContent='Could not publish yet. Check that the squad database migration has been applied.';console.error(err.message||err);}";
      const newSquadPublishCatch = "catch(err){const message=String(err?.message||'');const code=String(err?.code||'');if(code==='42501'||/row-level security|active member|permission denied|not allowed/i.test(message)){$('formStatus').textContent='Your account is signed in, but it does not currently have permission to publish squad posts. If your membership should be active, contact VEXARO support.';}else if(/relation .* does not exist|schema cache|column .* does not exist/i.test(message)){$('formStatus').textContent='The squad board database setup is incomplete. Please try again later.';}else{$('formStatus').textContent='Could not publish your squad post. Please check your connection and try again.';}console.error('VEXARO squad post publish failed:',code,message);}";
      if (html.includes('id="createForm"') && html.includes(oldSquadPublishCatch)) {
        html = html.replace(oldSquadPublishCatch, newSquadPublishCatch);
      }

      // Ensure every public VEXARO page has the shared top-right navigation unless it already includes it.
      if (!/vexaro-nav(?:-v2)?\.js/i.test(html) && !/<button\b[^>]*aria-label=["\'][^"\']*(?:menu|navigation)[^"\']*["\']/i.test(html) && !path.startsWith("/health/") && !/^\/google[0-9a-f]+\.html$/i.test(path)) {
        html = html.replace(/<\/head>/i, '<script src="/vexaro-nav.js" defer></script></head>');
      }

      if (path === "/loadouts.html") {
        html = html.replace(
          /if\(!builds\.length\)\{[\s\S]*?\}\}catch\(e\)/,
          "if(!builds.length){grid.innerHTML='<article class=\"card\"><div class=\"num\">VEXARO / STARTER</div><h3>NO PUBLISHED BUILDS YET.</h3><p>The arsenal is ready. Sign in through the community to publish the first VEXARO loadout.</p><div class=\"card-actions\"><a class=\"ghost\" href=\"community.html\">OPEN COMMUNITY</a><a class=\"ghost\" href=\"controller-settings.html\">TUNE SETTINGS</a></div></article>';} }catch(e)"
        );
      }

      // Repair legacy Community assets whose profile CSS was appended after the closing HTML tag.
      if (html.includes("/* VEXARO master release: profile and sign-in polish */")) {
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

      // Apply the mobile Community tab fix after page styles so it wins the cascade.
      if (html.includes('id="memberHomeBtn"') && !html.includes("vexaro-community-mobile-nav-fix")) {
        const communityMobileStyle = `<style id="vexaro-community-mobile-nav-fix">
@media(max-width:800px){
 .top .nav{height:auto!important;min-height:72px!important;max-height:none!important;display:flex!important;flex-wrap:wrap!important;align-items:center!important;overflow:visible!important;padding:12px 0!important}
 .navlinks{position:static!important;inset:auto!important;order:initial!important;display:grid!important;grid-template-columns:repeat(auto-fit,minmax(105px,1fr))!important;flex:1 1 100%!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;margin:0!important;padding:8px 0!important;gap:7px!important;overflow:visible!important;background:transparent!important;border:0!important;border-top:1px solid #25262c!important;box-shadow:none!important;backdrop-filter:none!important}
 .navlinks .tab{height:auto!important;min-height:36px!important;min-width:0!important;width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:9px 5px!important;font-size:9px!important;line-height:1.2!important;white-space:normal!important;text-align:center!important}
}
</style>`;
        html = html.replace(/<\/body>/i, communityMobileStyle + "</body>");
      }

      // Wrap Members Space navigation on small screens rather than requiring horizontal scrolling.
      if (html.includes("YOUR SPACE. YOUR GAME.") && !html.includes("vexaro-members-mobile-nav-fix")) {
        const membersMobileStyle = `<style id="vexaro-members-mobile-nav-fix">
@media(max-width:760px){
 .bar .nav{overflow:visible!important;max-width:100%!important}
 .navlinks{display:flex!important;flex-wrap:wrap!important;gap:10px!important;max-width:100%!important;overflow:visible!important;white-space:normal!important;padding-bottom:3px!important}
 .navlinks a{min-height:36px!important;display:inline-flex!important;align-items:center!important;white-space:normal!important}
}
</style>`;
        html = html.replace(/<\/body>/i, membersMobileStyle + "</body>");
      }

      if (html.includes('<style id="vexaro-homepage-fit-v1">')) {
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

      // Final fallback: ensure a usable top-right menu even if an older page's nav script does not create one.
      const menuFallback = `<script id="vexaro-global-menu-fallback">
document.addEventListener("DOMContentLoaded", function () {
  const hasButton = document.getElementById("vexaro-global-menu-btn") ||
    document.getElementById("vexaro-global-menu") ||
    document.querySelector(".site-menu") ||
    (document.getElementById("hamb") && document.getElementById("mobilemenu")) ||
    Array.from(document.querySelectorAll("button[aria-label],button[title]")).some(function (el) {
      return /menu|navigation/i.test((el.getAttribute("aria-label") || "") + " " + (el.getAttribute("title") || ""));
    });
  if (hasButton) return;
  const links = [
    ["HOME","/"],["HQ","/#hq"],["CLIPS","/clips.html"],["LOADOUTS","/loadouts.html"],
    ["SETTINGS","/settings.html"],["LIVE","/live/"],["FIND SQUAD","/find-your-squad.html"],
    ["COMMUNITY","/community.html"],["MARKETPLACE","/marketplace.html"],["PRO","/membership.html"],
    ["ABOUT","/about.html"],["APP","/app.html"],["SEARCH","/search.html"]
  ];
  const button = document.createElement("button");
  button.id = "vexaro-global-menu-fallback-btn";
  button.type = "button";
  button.textContent = "☰";
  button.setAttribute("aria-label", "Open VEXARO navigation");
  button.setAttribute("aria-expanded", "false");
  button.title = "Open VEXARO navigation";
  Object.assign(button.style, {position:"fixed",top:"15px",right:"16px",zIndex:"10001",width:"46px",height:"46px",border:"1px solid rgba(255,255,255,.16)",borderRadius:"10px",background:"rgba(8,8,10,.96)",color:"#fff",fontSize:"25px",cursor:"pointer"});
  const panel = document.createElement("nav");
  panel.id = "vexaro-global-menu-fallback-panel";
  panel.setAttribute("aria-label", "VEXARO navigation");
  Object.assign(panel.style, {position:"fixed",top:"0",right:"0",bottom:"0",width:"min(390px,88vw)",zIndex:"10000",background:"#08080a",padding:"82px 22px 28px",overflow:"auto",display:"none",borderLeft:"1px solid rgba(255,255,255,.12)",boxShadow:"-25px 0 70px rgba(0,0,0,.6)"});
  const heading = document.createElement("div");
  heading.textContent = "VEXARO / NAVIGATION";
  Object.assign(heading.style,{color:"#e10600",fontSize:"10px",fontWeight:"900",letterSpacing:".2em",marginBottom:"18px"});
  panel.appendChild(heading);
  links.forEach(function (item) {
    const a = document.createElement("a");
    a.href = item[1]; a.textContent = item[0];
    Object.assign(a.style,{display:"block",padding:"14px 12px",borderBottom:"1px solid rgba(255,255,255,.07)",color:"#ddd",textDecoration:"none",fontSize:"11px",fontWeight:"900",letterSpacing:".12em"});
    a.addEventListener("click", closeMenu);
    panel.appendChild(a);
  });
  const signIn = document.createElement("a");
  signIn.href = "/?auth=signin"; signIn.textContent = "SIGN IN / JOIN VEXARO";
  Object.assign(signIn.style,{display:"block",padding:"14px 12px",color:"#e10600",textDecoration:"none"});
  signIn.addEventListener("click", closeMenu);
  panel.appendChild(signIn);
  function closeMenu(){panel.style.display="none";button.textContent="☰";button.setAttribute("aria-expanded","false");}
  button.addEventListener("click",function(){const open=panel.style.display!=="block";panel.style.display=open?"block":"none";button.textContent=open?"×":"☰";button.setAttribute("aria-expanded",String(open));});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeMenu();});
  document.body.append(button,panel);
});
</script>`;
      if (!html.includes('id="vexaro-global-menu-fallback"')) {
        html = html.replace(/<\/body>/i, menuFallback + "</body>");
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
