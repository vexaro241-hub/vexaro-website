window.VEXARO_SUPABASE_URL = 'https://gyapnhfsbsnxkyfqlsxh.supabase.co';
window.VEXARO_SUPABASE_KEY = 'sb_publishable_dF6rhER_VnFcTtvBPQzZLA_4TEAbup3';


// One browser-scoped Supabase client for the public VEXARO site.
// Pages and telemetry share this singleton to avoid multiple GoTrueClient instances.
if (window.supabase && window.VEXARO_SUPABASE_URL && window.VEXARO_SUPABASE_KEY && !window.vexaroSupabase) {
  window.vexaroSupabase = window.supabase.createClient(window.VEXARO_SUPABASE_URL, window.VEXARO_SUPABASE_KEY);
}
