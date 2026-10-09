import { withSupabase } from "npm:@supabase/server@1";

const ALLOWED_ORIGINS = new Set([
  "https://vexaro-pwa2.vercel.app",
  "https://vexaro-website.vexaro241.workers.dev",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}
const json = (req: Request, data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method === "GET") {
      if (new URL(req.url).searchParams.get("status") !== "1") return json(req, { error: "Method not allowed" }, 405);
      const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
      const { data: plans, error } = await ctx.supabaseAdmin
        .from("membership_plans")
        .select("code,stripe_price_id,active")
        .eq("active", true);
      const testMode = secret.startsWith("sk_test_");
      const plansReady = !error && !!plans?.length && plans.every((p) => !!p.stripe_price_id);
      return json(req, {
        ready: testMode && plansReady,
        mode: testMode ? "test" : secret.startsWith("sk_live_") ? "live_blocked" : "not_configured",
        plans_ready: plansReady,
      });
    }
    if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

    const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    // Keep this integration test-only until the owner explicitly completes live launch checks.
    if (!secret.startsWith("sk_test_")) {
      return json(req, { error: "Stripe test mode is not configured yet. Live checkout is intentionally disabled." }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const planCode = typeof body?.plan_code === "string" ? body.plan_code : "";
    if (!planCode) return json(req, { error: "Missing plan_code" }, 400);

    const { data: plan, error: planError } = await ctx.supabaseAdmin
      .from("membership_plans")
      .select("code,name,stripe_price_id,active")
      .eq("code", planCode)
      .eq("active", true)
      .single();
    if (planError || !plan?.stripe_price_id) return json(req, { error: "Plan is not available" }, 404);

    const user = ctx.userClaims;
    if (!user?.sub) return json(req, { error: "Please sign in before choosing a membership." }, 401);

    const { data: membership } = await ctx.supabaseAdmin
      .from("memberships")
      .select("ends_at,status,is_trial")
      .eq("user_id", user.sub)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const origin = req.headers.get("origin") || "";
    if (!ALLOWED_ORIGINS.has(origin)) return json(req, { error: "This website origin is not enabled for checkout." }, 403);

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("ui_mode", "hosted");
    params.set("line_items[0][price]", plan.stripe_price_id);
    params.set("line_items[0][quantity]", "1");
    params.set("client_reference_id", user.sub);
    if (user.email) params.set("customer_email", user.email);
    params.set("success_url", origin + "/membership.html?checkout=success");
    params.set("cancel_url", origin + "/membership.html?checkout=cancelled");
    params.set("billing_address_collection", "auto");
    params.set("allow_promotion_codes", "false");
    params.set("metadata[user_id]", user.sub);
    params.set("metadata[plan_code]", plan.code);
    params.set("subscription_data[metadata][user_id]", user.sub);
    params.set("subscription_data[metadata][plan_code]", plan.code);
    if (membership?.is_trial && membership.ends_at && new Date(membership.ends_at) > new Date()) {
      params.set("subscription_data[trial_end]", String(Math.floor(new Date(membership.ends_at).getTime() / 1000)));
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: "Bearer " + secret, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(req, { error: data?.error?.message || "Stripe checkout could not be started." }, 502);
    }
    if (!data?.url) return json(req, { error: "Stripe did not return a hosted checkout URL." }, 502);
    return json(req, { url: data.url, id: data.id });
  }),
};
