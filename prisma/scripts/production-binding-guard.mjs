// Read-only production deploy gate. The 55 names are an inventory, NOT secret values.
// Cloudflare Pages project settings are the sole source of runtime credentials.
// Never reconstruct env_vars from Cloudflare GET responses (secret_text values are redacted).
export const REQUIRED_PRODUCTION_BINDING_NAMES = Object.freeze([
  "AIHUBMIX_API_KEY",
  "AIHUBMIX_API_KEY_2",
  "AIHUBMIX_API_KEY_3",
  "AIHUBMIX_API_KEY_4",
  "AIHUBMIX_API_KEY_5",
  "GEMINI_API_KEYS_JSON",
  "GROQ_API_KEY",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GROQ_API_KEY_4",
  "GROQ_API_KEY_5",
  "JINA_API_KEY",
  "KILO_API_KEY",
  "KILO_API_KEY_2",
  "KILO_API_KEY_3",
  "KILO_API_KEY_4",
  "KILO_API_KEY_5",
  "KILO_API_KEY_6",
  "OPENROUTER_API_KEY",
  "OPENROUTER_API_KEY_2",
  "OPENROUTER_API_KEY_3",
  "OPENROUTER_API_KEY_4",
  "OPENROUTER_API_KEY_5",
  "OPENROUTER_API_KEY_6",
  "POLLINATIONS_API_KEY",
  "POLLINATIONS_API_KEY_2",
  "POLLINATIONS_API_KEY_3",
  "POLLINATIONS_API_KEY_4",
  "POLLINATIONS_API_KEY_5",
  "POLLINATIONS_API_KEY_6",
  "PRISMA_AUTH_GOOGLE_ENABLED",
  "PRISMA_SUPABASE_PUBLISHABLE_KEY",
  "PRISMA_SUPABASE_URL",
  "QUEEN_ACCESS_CLIENT_ID",
  "QUEEN_ACCESS_CLIENT_SECRET",
  "QUEEN_API_KEY",
  "QUEEN_BASE_URL",
  "QUEEN_ENABLED",
  "QUEEN_MODEL",
  "QUEEN_STAGE",
  "RESEND_API_KEY",
  "SENSENOVA_API_KEY",
  "SENSENOVA_API_KEY_2",
  "SENSENOVA_API_KEY_3",
  "SENSENOVA_API_KEY_4",
  "SENSENOVA_API_KEY_5",
  "SENSENOVA_API_KEY_6",
  "SUPABASE_SERVICE_ROLE_KEY_2",
  "TAVILY_API_KEYS_JSON",
  "ZAI_API_KEY",
  "ZAI_API_KEY_2",
  "ZAI_API_KEY_3",
  "ZAI_API_KEY_4",
  "ZAI_API_KEY_5",
  "ZAI_API_KEY_6"
]);
const masked = /^(?:\*{4,}|redacted|<redacted>|\[redacted\]|null|undefined)$/i;
export function productionBindingReport(env = {}) {
  // Preview intentionally has fewer secrets. Do NOT copy production secrets to previews.
  if (env.CF_PAGES_BRANCH !== 'main') return {active:false,expected:55,available:0,missing:[]};
  const missing = REQUIRED_PRODUCTION_BINDING_NAMES.filter(name => {
    const value = env[name];
    return typeof value !== 'string' || !value.trim() || masked.test(value.trim());
  });
  // This is a deployment configuration requirement, not an inference/authorization test.
  if (env.QUEEN_ENABLED !== '1' && !missing.includes('QUEEN_ENABLED')) missing.push('QUEEN_ENABLED');
  if (env.QUEEN_STAGE !== 'production' && !missing.includes('QUEEN_STAGE')) missing.push('QUEEN_STAGE');
  return {active:true,expected:REQUIRED_PRODUCTION_BINDING_NAMES.length,available:REQUIRED_PRODUCTION_BINDING_NAMES.length-missing.length,missing};
}
export function assertProductionBuildBindings(env = {}) {
  const report = productionBindingReport(env);
  if (report.active && report.missing.length) {
    throw new Error('PRODUCTION_BINDINGS_GUARD: '+report.available+'/'+report.expected+
      ' configured, unmasked values. Production build stopped before deployment. '+
      'Restore missing secrets in the Cloudflare dashboard; never PATCH secrets using redacted GET values.');
  }
  return report;
}
