import translations from './locales/en.js';
import fieldTranslations from './locales/tool-fields.en.js';

const STORAGE_KEY = 'prisma-language';
const root = document.documentElement;
const defaultMeta = document.querySelector('meta[name="prisma-default-language"]')?.content;
const savedLanguage = (() => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'en' || value === 'es' ? value : '';
  } catch { return ''; }
})();
const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length
  ? navigator.languages : [navigator.language || 'es'];
// Browser language order is preference order. A secondary Spanish fallback
// must not override a visitor whose primary language is English.
const preferredBrowserLanguage = String(browserLanguages[0] || navigator.language || 'es');
const browserSpanish = /^es(?:-|$)/i.test(preferredBrowserLanguage);
const routeLanguage = /^\/en(?:\/|$)/i.test(location.pathname) ? 'en' :
  (location.pathname === '/' || /^\/(?:herramientas|categorias|soluciones|guias)(?:\/|$)|^\/(?:privacy|acerca)(?:\.html)?$/i.test(location.pathname)) ? 'es' : '';
const requestedLanguage = new URLSearchParams(location.search).get('lang');
const explicitLanguage = ['es','en'].includes(requestedLanguage) ? requestedLanguage : '';
const initialLanguage = (location.pathname === '/' ? explicitLanguage : '') || routeLanguage || explicitLanguage || savedLanguage ||
  (defaultMeta === 'en' ? 'en' : defaultMeta === 'es' ? 'es' : browserSpanish ? 'es' : 'en');
// Public language URLs keep the same language before and after JavaScript.
// Saved/browser preferences must not turn the Spanish canonical into English.
// Only an explicit language choice may change the app URL.

const manualTranslations = {
  'Prisma Space — Crea, convierte y experimenta': 'Prisma Space — Create, Convert, and Experiment',
  'Convierte PDF, imágenes y datos en tu navegador. Prisma Core te ayuda a elegir pasos y distingue herramientas locales de motores de IA conectados.': 'Convert and review PDFs, images and data with browser tools. Prisma Core helps choose steps and distinguishes local features from connected AI engines.',
  'Herramientas prácticas para PDF, imágenes y datos, con procesamiento local y un asistente para tareas que necesitan IA.': 'Practical tools for PDFs, images and data, with local processing and an assistant for tasks that need AI.',
  'Restaurando tu espacio de trabajo…': 'Restoring your workspace…',
  'TÚ': 'YOU',
  'PRISMA CORE': 'PRISMA CORE',
  'CONFIGURACIÓN': 'SETTINGS',
  'Ecosistema digital': 'Digital ecosystem',
  'Gemini, Groq, Cloudflare y Pollinations central pueden estar disponibles para todos sin cuenta personal, según saldo y cuotas. Pollinations Connect es una conexión individual opcional; su estado no indica si el motor compartido está disponible.': 'Gemini, Groq, Cloudflare, and Pollinations Central may be available to everyone without a personal account, subject to balance and usage limits. Pollinations Connect is an optional personal connection; its status does not indicate whether the shared engine is available.',
  'Las claves maestras se guardan como secretos en Cloudflare. Los visitantes usan los motores de Prisma sin introducir sus propias credenciales.': 'Master keys are stored as Cloudflare secrets. Visitors can use Prisma engines without entering their own credentials.',
  'Consumo de IA de esta sesión: sin solicitudes registradas.': 'AI usage for this session: no requests recorded.'
};
const dictionary = { ...translations, ...fieldTranslations, ...manualTranslations };
const phraseTranslations = Object.entries(dictionary)
  .filter(([source]) => source.length >= 7 && /\s/.test(source) &&
    !/[<>\\{};]/.test(source) && !/[&|]{2}|=>|\/\\|\\b/.test(source) &&
    !/^\s*[,.:;)\]]/.test(source) &&
    !/\b(?:return|const|function|document|window|localStorage|undefined|null)\b/.test(source))
  .sort((a,b) => b[0].length - a[0].length);

const originalText = new WeakMap();
const lastText = new WeakMap();
const originalAttributes = new WeakMap();
const lastAttributes = new WeakMap();
let language = initialLanguage;
let applying = false;

const SKIP_TEXT = [
  'script', 'style', 'title', 'code', 'pre', 'textarea', 'input', 'svg',
  '[contenteditable="true"]', '[data-no-translate]', '[data-user-content]',
  '.core-message-files',
  '.tool-output', '#tool-output',
  '.workflow-result', '.artifact-content', '.artifact-preview',
  '.conversation-title', '.conversation-name', '.conversation-item-title',
  '.chat-title', '.history-item-title', '.conversation-search-result-title',
  '.message-content', '.message-bubble', '.markdown-body',
  '.user-content', '.assistant-content', '.user-generated'
].join(',');

const SKIP_ATTRIBUTES = [
  'script', 'style', 'code', 'pre', '[data-no-translate]', '[data-user-content]',
  '.tool-output', '#tool-output',
  '.conversation-title', '.conversation-name', '.conversation-item-title',
  '.chat-title', '.history-item-title', '.message-content',
  '.markdown-body', '.user-content', '.assistant-content'
].join(',');

function preserveWhitespace(source, translated) {
  const leading = source.match(/^\s*/)?.[0] || '';
  const trailing = source.match(/\s*$/)?.[0] || '';
  return leading + translated + trailing;
}

function translateValue(source) {
  const value = String(source ?? '');
  const trimmed = value.trim();
  if (!trimmed || language !== 'en') return value;
  if (dictionary[trimmed]) return preserveWhitespace(value, dictionary[trimmed]);

  let match = trimmed.match(/^(\d+)\s+(herramientas?)$/i);
  if (match) return preserveWhitespace(value, match[1] + ' tools');
  match = trimmed.match(/^(\d+)\s+(archivos?)$/i);
  if (match) return preserveWhitespace(value, match[1] + ' files');
  match = trimmed.match(/^(\d+)\s+(páginas?)$/i);
  if (match) return preserveWhitespace(value, match[1] + ' pages');
  match = trimmed.match(/^(\d+)\s+(modelos?)\s+disponibles$/i);
  if (match) return preserveWhitespace(value, match[1] + ' models available');
  match = trimmed.match(/^(\d+)\s+(motores?)\s+disponibles$/i);
  if (match) return preserveWhitespace(value, match[1] + ' engines available');
  match = trimmed.match(/^(\d+)\s+credenciales$/i);
  if (match) return preserveWhitespace(value, match[1] + ' credentials');
  match = trimmed.match(/^(\d+)\s+resultados?$/i);
  if (match) return preserveWhitespace(value, match[1] + ' results');
  match = trimmed.match(/^(\d+)\s+palabras?$/i);
  if (match) return preserveWhitespace(value, match[1] + ' words');

  let translated = trimmed;
  for (const [original, english] of phraseTranslations) {
    if (translated.includes(original)) translated = translated.split(original).join(english);
  }
  const prefixes = [
    ['¡Bienvenido a Prisma,', 'Welcome to Prisma,'],
    ['Conectando con', 'Connecting to'],
    ['No fue posible continuar con', 'Could not continue with'],
    ['No se pudo completar la solicitud:', 'The request could not be completed:'],
    ['No se pudo completar el flujo:', 'The workflow could not be completed:'],
    ['Texto extraído ·', 'Extracted text ·'],
    ['Imagen de', 'Image of'],
    ['Canción original compuesta con', 'Original song composed with'],
    ['Se cambió a otro motor conectado después de un fallo.', 'Switched to another connected engine after a failure.']
  ];
  for (const [prefix, replacement] of prefixes) {
    if (translated.startsWith(prefix)) translated = replacement + translated.slice(prefix.length);
  }
  return preserveWhitespace(value, translated);
}

function isSkippedText(node) {
  const parent = node.parentElement;
  return !parent || Boolean(parent.closest(SKIP_TEXT));
}

function translateTextNode(node) {
  if (!node?.isConnected || isSkippedText(node)) return;
  const current = node.data;
  const last = lastText.get(node);
  if (last !== undefined && current !== last) {
    originalText.set(node, current);
    lastText.delete(node);
  }
  if (!originalText.has(node)) originalText.set(node, current);
  const original = originalText.get(node);
  const next = language === 'en' ? translateValue(original) : original;
  if (node.data !== next) {
    applying = true;
    node.data = next;
    lastText.set(node, next);
    applying = false;
  } else if (lastText.has(node)) {
    lastText.set(node, next);
  }
}

const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt', 'content'];

// Links inside the application must follow the selected language as well.
// These are public index/legal routes; explicit SEO landing URLs keep their own locale.
const localizedPaths = new Map([
  ['/herramientas/pdf-a-word/', '/en/tools/free-pdf-to-word-converter/'],
  ['/herramientas/word-a-pdf/', '/en/tools/convert-word-to-pdf-from-your-browser/'],
  ['/herramientas/dividir-pdf/', '/en/tools/split-pdf-into-separate-files/'],
  ['/herramientas/unir-pdf/', '/en/tools/merge-pdf-files-into-one-document/'],
  ['/herramientas/imagen-a-texto/', '/en/tools/convert-image-to-text-with-ocr/'],
  ['/herramientas/eliminar-metadatos-imagen/', '/en/tools/remove-exif-metadata-from-an-image/'],
  ['/herramientas/collage-de-fotos/', '/en/tools/create-a-photo-collage-online/'],
  ['/herramientas/', '/en/tools/'],
  ['/categorias/', '/en/categories/'],
  ['/soluciones/', '/en/solutions/'],
  ['/guias/', '/en/guides/'],
  ['/privacy', '/en/privacy'],
  ['/acerca', '/en/about']
]);
const spanishPaths = new Map([...localizedPaths].map(([es, en]) => [en, es]));
const publicAliases = new Map([
  ['/privacy.html','/privacy'], ['/en/privacy.html','/en/privacy'],
  ['/acerca.html','/acerca'], ['/en/about.html','/en/about']
]);

function translateInternalLink(anchor) {
  if (anchor?.hasAttribute?.('data-app-language-switch')) return;
  const href = anchor?.getAttribute?.('href');
  if (!href || href.startsWith('#')) return;
  let url;
  try { url = new URL(href, document.baseURI); } catch { return; }
  if (url.origin !== location.origin) return;
  const pathname = publicAliases.get(url.pathname) || url.pathname;
  const target = (language === 'en' ? localizedPaths.get(pathname) : spanishPaths.get(pathname)) ||
    (pathname !== url.pathname ? pathname : '');
  if (!target) return;
  const next = target + url.search + url.hash;
  if (href !== next) anchor.setAttribute('href', next);
}

function translateInternalLinks(container) {
  if (container?.matches?.('a[href]')) translateInternalLink(container);
  container?.querySelectorAll?.('a[href]').forEach(translateInternalLink);
}

// Metadata must match the active SPA language even when the original HTML
// was served from /en/ and the visitor switches back to Spanish.
const appMetadata = {
  es: {
    title: 'Prisma Space — Crea, convierte y experimenta',
    description: 'Convierte PDF, imágenes y datos en tu navegador. Prisma Core te ayuda a elegir pasos y distingue herramientas locales de motores de IA conectados.',
    socialDescription: 'Herramientas prácticas para PDF, imágenes y datos, con procesamiento local y un asistente para tareas que necesitan IA.'
  },
  en: {
    title: 'Prisma Space — Create, Convert, and Experiment',
    description: 'Convert and review PDFs, images and data with browser tools. Prisma Core helps choose steps and distinguishes local features from connected AI engines.',
    socialDescription: 'Practical tools for PDFs, images and data, with local processing and an assistant for tasks that need AI.'
  }
};
function syncAppMetadata() {
  if (!['/', '/en', '/en/'].includes(location.pathname)) return;
  const metadata = appMetadata[language];
  document.title = metadata.title;
  for (const [selector, content] of [
    ['meta[name="description"]', metadata.description],
    ['meta[property="og:title"]', metadata.title],
    ['meta[property="og:description"]', metadata.socialDescription]
  ]) {
    const element = document.querySelector(selector);
    if (element && element.content !== content) element.content = content;
  }
}
function translateAttribute(element, attribute) {
  // Meta content is managed explicitly by applyAll/syncAppMetadata.
  if (attribute === 'content' && element?.tagName === 'META') return;
  if (!element?.isConnected || element.closest(SKIP_ATTRIBUTES)) return;
  const current = element.getAttribute(attribute);
  if (current === null) return;
  let originals = originalAttributes.get(element);
  if (!originals) { originals = new Map(); originalAttributes.set(element, originals); }
  let lasts = lastAttributes.get(element);
  if (!lasts) { lasts = new Map(); lastAttributes.set(element, lasts); }
  const last = lasts.get(attribute);
  if (last !== undefined && current !== last) {
    originals.set(attribute, current);
    lasts.delete(attribute);
  }
  if (!originals.has(attribute)) originals.set(attribute, current);
  const original = originals.get(attribute);
  const next = language === 'en' ? translateValue(original) : original;
  if (current !== next) {
    applying = true;
    element.setAttribute(attribute, next);
    lasts.set(attribute, next);
    applying = false;
  } else if (lasts.has(attribute)) {
    lasts.set(attribute, next);
  }
}

function applyAll() {
  root.lang = language;
  root.dataset.language = language;
  for (const languageSwitch of document.querySelectorAll('[data-app-language-switch]')) {
    languageSwitch.setAttribute('href', language === 'en' ? '/' : '/en/');
    languageSwitch.setAttribute('lang', language === 'en' ? 'es' : 'en');
    languageSwitch.setAttribute('hreflang', language === 'en' ? 'es' : 'en');
    languageSwitch.textContent = language === 'en' ? 'Español' : 'English';
  }
  // Keep the installable PWA language aligned after an explicit language switch.
  const manifest = document.querySelector('link[rel="manifest"]');
  if (manifest) {
    const target = language === 'en' ? '/manifest.en.webmanifest' : '/manifest.webmanifest';
    if (manifest.getAttribute('href') !== target) manifest.setAttribute('href', target);
  }
  const locale = document.querySelector('meta[property="og:locale"]');
  if (locale) locale.content = language === 'en' ? 'en_US' : 'es_ES';
  const languageMeta = document.querySelector('meta[name="prisma-default-language"]');
  if (languageMeta) languageMeta.content = language;
  // The SPA switches / and /en/ without reloading. Keep its canonical and
  // Open Graph URL aligned with the selected language after every switch.
  if (location.pathname === '/' || /^\/en\/?$/i.test(location.pathname)) {
    const appUrl = 'https://prismaspace.space' + (/^\/en\/?$/i.test(location.pathname) ? '/en/' : '/');
    const canonical = document.querySelector('link[rel="canonical"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (canonical) canonical.href = appUrl;
    if (ogUrl) ogUrl.content = appUrl;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) translateTextNode(node);
  root.querySelectorAll('*').forEach(element => ATTRIBUTES.forEach(attribute => translateAttribute(element, attribute)));
  translateInternalLinks(root);
  syncAppMetadata();
}

function setLanguage(next, { persist = true } = {}) {
  if (next !== 'en' && next !== 'es') return;
  language = next;
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }
  if (location.pathname === '/' || location.pathname === '/en/') {
    const target = next === 'en' ? '/en/' : '/';
    const search = new URLSearchParams(location.search);
    search.delete('lang');
    const query = search.size ? '?' + search.toString() : '';
    if (location.pathname !== target || query !== location.search) history.replaceState(history.state, '', target + query + location.hash);
  }
  applyAll();
  document.dispatchEvent(new CustomEvent('prisma:language-change', { detail: { language } }));
}

// /en/ is translated at build time too. Seed the original Spanish values once
// so switching back still works without reloading or translating user content.
if (root.lang === 'en') {
  const originals = new Map(Object.entries(dictionary).map(([es, en]) => [en, es]));
  const sourceValue = value => preserveWhitespace(value, originals.get(value.trim()) || value.trim());
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (isSkippedText(node)) continue;
    originalText.set(node, sourceValue(node.data));
    lastText.set(node, node.data);
  }
  root.querySelectorAll('*').forEach(element => {
    if (element.closest(SKIP_ATTRIBUTES)) return;
    const values = new Map();
    for (const attribute of ATTRIBUTES) {
      if (attribute === 'content' || !element.hasAttribute(attribute)) continue;
      values.set(attribute, sourceValue(element.getAttribute(attribute)));
    }
    originalAttributes.set(element, values);
    lastAttributes.set(element, new Map([...values.keys()].map(attribute => [attribute, element.getAttribute(attribute)])));
  });
}
// Preserve old explicit ?lang=en links without serving English at the Spanish
// canonical. Keep tool parameters, fragments and the stored preference intact.
if (location.pathname === '/' && explicitLanguage === 'en') setLanguage('en', { persist: false });
else applyAll();

const observer = new MutationObserver(records => {
  if (applying) return;
  for (const record of records) {
    if (record.type === 'characterData') translateTextNode(record.target);
    if (record.type === 'attributes') {
      if (record.attributeName === 'href') translateInternalLink(record.target);
      else translateAttribute(record.target, record.attributeName);
    }
    if (record.type === 'childList') {
      record.addedNodes.forEach(added => {
        if (added.nodeType === Node.TEXT_NODE) translateTextNode(added);
        else if (added.nodeType === Node.ELEMENT_NODE) {
          const walker = document.createTreeWalker(added, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) translateTextNode(node);
          ATTRIBUTES.forEach(attribute => {
            if (added.hasAttribute?.(attribute)) translateAttribute(added, attribute);
          });
          added.querySelectorAll?.('*').forEach(element => ATTRIBUTES.forEach(attribute => translateAttribute(element, attribute)));
          translateInternalLinks(added);
        }
      });
    }
  }
});
observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTES, 'href'] });

window.prismaI18n = Object.freeze({
  get language() { return language; },
  setLanguage,
  t(value) { return language === 'en' ? translateValue(value) : value; }
});
