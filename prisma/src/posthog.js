const PROJECT_TOKEN = 'phc_otHyuh8NtQh2hzHgmHLCLuUStAvrG7ringjKZrUZwt6o';
const API_HOST = 'https://us.i.posthog.com';
const CONSENT_KEY = 'prisma-analytics-consent-v1';

const ALLOWED_EVENTS = new Set([
  '$pageview',
  '$pageleave',
  'prisma_analytics_consent_accepted',
  'prisma_section_opened',
  'prisma_core_opened',
  'prisma_core_turn_started',
  'prisma_core_turn_completed',
  'prisma_core_turn_failed',
  'prisma_core_model_selected',
  'prisma_core_model_used',
  'prisma_core_fallback_used',
  'prisma_tool_opened',
  'prisma_tool_started',
  'prisma_tool_completed',
  'prisma_tool_failed',
  'prisma_workflow_opened',
  'prisma_catalog_search',
  'prisma_signup_completed',
  'prisma_login_started',
  'prisma_login_completed'
]);

const SAFE_SDK_PROPERTIES = new Set([
  '$current_url', '$pathname', '$host', '$title', '$referrer',
  '$referring_domain', '$browser', '$browser_version', '$device_type',
  '$os', '$os_version', '$screen_height', '$screen_width',
  '$viewport_height', '$viewport_width', '$lib', '$lib_version',
  '$session_id', '$window_id', '$pageview_id', '$duration', '$time'
]);

const SAFE_CUSTOM_PROPERTIES = new Set([
  'page_language', 'page_type', 'section_id', 'entry_point',
  'tool_id', 'tool_category', 'tool_mode', 'tool_status',
  'workflow_id', 'duration_ms', 'file_count', 'has_attachments',
  'creative_mode', 'provider_id', 'model_id', 'selection_mode',
  'fallback_used', 'fallback_from', 'auth_method', 'source',
  'outcome', 'query_length', 'search_result_count'
]);

let client = null;
let clientLoading = null;
let consentHost = null;

function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) || '';
  } catch {
    return '';
  }
}

function writeConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // The current-page choice still applies if browser storage is unavailable.
  }
}

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value), location.origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.origin + url.pathname.slice(0, 240);
  } catch {
    return '';
  }
}

function safePath(value) {
  return String(value || '/').split(/[?#]/, 1)[0].slice(0, 240) || '/';
}

function cleanCustomProperties(properties = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(properties || {})) {
    if (!SAFE_CUSTOM_PROPERTIES.has(key)) continue;
    if (typeof value === 'boolean') {
      clean[key] = value;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = Math.max(0, Math.min(value, 1000000000));
    } else if (typeof value === 'string') {
      const text = value.trim().slice(0, 120);
      if (text && /^[A-Za-z0-9._:@/-]+$/.test(text)) clean[key] = text;
    }
  }
  return clean;
}

function sanitizeEvent(event) {
  if (!event || !ALLOWED_EVENTS.has(event.event)) return null;
  const original = event.properties || {};
  const safe = {};

  // The SDK uses this reserved property for the public project token.
  if (typeof original.token === 'string') safe.token = original.token;

  for (const key of SAFE_SDK_PROPERTIES) {
    if (!(key in original)) continue;
    const value = original[key];
    if (key === '$current_url' || key === '$referrer') {
      const url = safeUrl(value);
      if (url) safe[key] = url;
    } else if (key === '$pathname') {
      safe[key] = safePath(value);
    } else if (typeof value === 'string') {
      safe[key] = value.slice(0, 160);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      safe[key] = value;
    } else if (typeof value === 'boolean') {
      safe[key] = value;
    }
  }

  Object.assign(safe, cleanCustomProperties(original));
  event.properties = safe;
  return event;
}

function getPageType(path) {
  if (path === '/' || path === '/index.html') return 'app';
  if (/^\/(herramientas|en\/tools)\/[^/]+/.test(path)) return 'seo_tool';
  if (/^\/(herramientas|en\/tools|categorias|en\/categories|guias|en\/guides|soluciones|en\/solutions)/.test(path)) return 'seo_directory';
  if (/privacy|acerca|about/.test(path)) return 'legal';
  return 'content';
}

function capturePageview() {
  if (!client) return;
  const path = safePath(location.pathname);
  const language = String(document.documentElement.lang || 'es').slice(0, 5);
  client.capture('$pageview', {
    '$current_url': location.origin + path,
    '$pathname': path,
    '$host': location.host,
    '$title': String(document.title || '').slice(0, 160),
    '$referrer': safeUrl(document.referrer),
    'page_language': language,
    'page_type': getPageType(path)
  });
  if (path === '/' || path === '/index.html') {
    client.capture('prisma_core_opened', { 'entry_point': 'initial_load' });
  }
}

async function initializePostHog() {
  if (client) return client;
  if (clientLoading) return clientLoading;

  clientLoading = (async () => {
    const module = await import('https://esm.sh/posthog-js@1?bundle');
    const instance = module.default || module.posthog || module;
    if (!instance || typeof instance.init !== 'function') throw new Error('PostHog SDK unavailable');

    instance.init(PROJECT_TOKEN, {
      api_host: API_HOST,
      defaults: '2026-08-30',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: true,
      capture_heatmaps: false,
      capture_performance: false,
      capture_exceptions: false,
      logs: { captureConsoleLogs: false },
      person_profiles: 'identified_only',
      persistence: 'localStorage+cookie',
      disable_surveys: true,
      before_send: sanitizeEvent
    });

    client = instance;
    window.posthog = instance;
    capturePageview();
    return client;
  })().catch(() => {
    clientLoading = null;
    return null;
  });

  return clientLoading;
}

function track(event, properties = {}) {
  if (readConsent() !== 'accepted' || !client || !ALLOWED_EVENTS.has(event) || event.startsWith('$')) return false;
  client.capture(event, cleanCustomProperties(properties));
  return true;
}

function hideConsentBanner() {
  if (consentHost) consentHost.remove();
  consentHost = null;
}

function showConsentBanner() {
  if (!document.body) return;
  if (consentHost) return;

  const isEnglish = String(document.documentElement.lang || '').toLowerCase().startsWith('en');
  const host = document.createElement('div');
  host.id = 'prisma-analytics-consent';
  if (document.querySelector('#core-composer')) host.setAttribute('data-app', '');
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = [
    '<style>',
    ':host{all:initial;color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '.panel{position:fixed;z-index:2147483000;left:16px;bottom:max(16px,env(safe-area-inset-bottom));width:min(440px,calc(100vw - 32px));box-sizing:border-box;padding:17px 18px;border:1px solid rgba(163,145,255,.34);border-radius:16px;background:rgba(17,21,34,.97);color:#f4f5fb;box-shadow:0 18px 55px rgba(0,0,0,.34);backdrop-filter:blur(18px)}',
    ':host([data-app]) .panel{bottom:calc(104px + env(safe-area-inset-bottom))}',
    'h2{margin:0 0 7px;font-size:14px;line-height:1.35;font-weight:700;letter-spacing:.01em}',
    'p{margin:0;color:#c5c9d7;font-size:12px;line-height:1.55}',
    'a{color:#bcb0ff;text-decoration:underline;text-underline-offset:3px}',
    '.actions{display:flex;gap:9px;justify-content:flex-end;flex-wrap:wrap;margin-top:13px}',
    'button{font:600 12px/1.2 inherit;border-radius:10px;padding:10px 13px;cursor:pointer;border:1px solid rgba(173,180,204,.25)}',
    '.reject{background:rgba(255,255,255,.04);color:#e7e9f1}',
    '.accept{background:linear-gradient(120deg,#7c63e8,#5b9de8);border-color:transparent;color:#fff}',
    'button:focus-visible,a:focus-visible{outline:2px solid #a99aff;outline-offset:3px}',
    '@media(max-width:620px){.panel{left:12px;width:calc(100vw - 24px);bottom:max(12px,env(safe-area-inset-bottom));padding:15px 15px}.actions button{flex:1}}',
    '@media(max-width:620px){:host([data-app]) .panel{bottom:calc(112px + env(safe-area-inset-bottom))}}',
    '</style>',
    '<section class="panel" role="region" aria-labelledby="prisma-analytics-title">',
    '<h2 id="prisma-analytics-title"></h2>',
    '<p data-copy></p>',
    '<p style="margin-top:7px"><a data-policy></a></p>',
    '<div class="actions"><button class="reject" type="button" data-reject></button><button class="accept" type="button" data-accept></button></div>',
    '</section>'
  ].join('');

  root.querySelector('h2').textContent = isEnglish ? 'Help us improve Prisma Space' : 'Ayúdanos a mejorar Prisma Space';
  root.querySelector('[data-copy]').textContent = isEnglish
    ? 'With your permission, we measure visits and feature usage to improve the product. We do not collect prompts, conversations, files, credentials, or account details.'
    : 'Con tu permiso medimos visitas y uso de funciones para mejorar el producto. No recopilamos prompts, conversaciones, archivos, credenciales ni datos de cuenta.';
  const policy = root.querySelector('[data-policy]');
  policy.href = isEnglish ? '/en/privacy#analytics' : '/privacy#analitica';
  policy.textContent = isEnglish ? 'Read the analytics and privacy details' : 'Consulta los detalles de analítica y privacidad';
  const reject = root.querySelector('[data-reject]');
  const accept = root.querySelector('[data-accept]');
  reject.textContent = isEnglish ? 'Reject' : 'Rechazar';
  accept.textContent = isEnglish ? 'Accept analytics' : 'Aceptar analítica';

  reject.addEventListener('click', () => {
    writeConsent('rejected');
    if (client) {
      client.opt_out_capturing?.();
      client.reset?.();
    }
    hideConsentBanner();
  });

  accept.addEventListener('click', async () => {
    writeConsent('accepted');
    hideConsentBanner();
    if (client) {
      client.opt_in_capturing?.();
      capturePageview();
    } else {
      await initializePostHog();
    }
    track('prisma_analytics_consent_accepted', { source: 'banner' });
  });

  document.body.append(host);
  consentHost = host;
}

function addPreferencesControl() {
  const isEnglish = String(document.documentElement.lang || '').toLowerCase().startsWith('en');
  for (const footer of document.querySelectorAll('footer')) {
    if (footer.querySelector('[data-prisma-analytics-preferences]')) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.prismaAnalyticsPreferences = 'true';
    button.textContent = isEnglish ? 'Analytics preferences' : 'Preferencias de analítica';
    button.style.cssText = 'appearance:none;background:none;border:0;color:inherit;cursor:pointer;font:inherit;font-size:inherit;text-decoration:underline;text-underline-offset:3px;padding:4px 6px;margin:4px 0;';
    button.addEventListener('click', showConsentBanner);
    const nav = footer.querySelector('nav');
    (nav || footer).append(button);
  }
}

window.prismaAnalytics = Object.freeze({
  track,
  openPreferences: showConsentBanner
});

addPreferencesControl();

if (readConsent() === 'accepted') {
  void initializePostHog();
} else if (readConsent() !== 'rejected') {
  showConsentBanner();
}
