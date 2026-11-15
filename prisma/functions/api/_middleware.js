// Prisma Core credential-preserving bridge.
// API requests on newer Pages deployments use the immutable known-good Functions
// deployment. No credentials are copied, retrieved, or embedded in this file.
// Keep this explicit until a *new* production deployment passes a binding regression gate.
export const STABLE_CORE_ORIGIN = 'https://17a6c338.prismaspace.pages.dev';
// Dedicated, isolated Qwen inference service. It owns its Qwen credentials and D1;
// production Pages does not need to copy or expose any Qwen secrets.
export const QWEN_INTERPRETER_ORIGIN = 'https://prisma-queen-staging.pages.dev';

export function isPrismaSpaceHost(hostname) {
  return hostname === 'prismaspace.space' ||
    hostname === 'prismaspace.pages.dev' ||
    hostname.endsWith('.prismaspace.pages.dev');
}

export async function onRequest({ request, next }, { fetcher = fetch } = {}) {
  const incoming = new URL(request.url);
  // Never bridge a different Pages project (notably prisma-queen-staging).
  if (!isPrismaSpaceHost(incoming.hostname) || !incoming.pathname.startsWith('/api/')) {
    return next();
  }

  // Never turn an off-site browser request into a trusted same-origin POST.
  const origin = request.headers.get('Origin');
  if (origin && origin !== incoming.origin) {
    return Response.json({ ok: false, code: 'INVALID_ORIGIN' }, {
      status: 403, headers: { 'Cache-Control': 'no-store' }
    });
  }

  const qwenInterpreter = incoming.pathname === '/api/core/qwen-interpret';
  const targetOrigin = qwenInterpreter ? QWEN_INTERPRETER_ORIGIN : STABLE_CORE_ORIGIN;
  const target = new URL(incoming.pathname + incoming.search, targetOrigin);
  const headers = new Headers(request.headers);
  if (origin) headers.set('Origin', target.origin);
  const referer = headers.get('Referer');
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (parsed.origin === incoming.origin) {
        parsed.protocol = target.protocol;
        parsed.host = target.host;
        headers.set('Referer', parsed.href);
      }
    } catch {
      headers.delete('Referer');
    }
  }
  // These are supplied by the edge, not to be trusted from the browser.
  headers.delete('X-Forwarded-Host');
  headers.delete('X-Forwarded-Proto');
  const upstream = new Request(target, { method: request.method, headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual', signal: request.signal, duplex: 'half'
  });
  let response;
  try {
    response = await fetcher(upstream, { redirect: 'manual' });
  } catch {
    return Response.json({ ok: false, code: 'CORE_BACKEND_UNREACHABLE' }, {
      status: 502, headers: { 'Cache-Control': 'no-store' }
    });
  }

  // Preserve response cookies, HTTP status and auth headers. Do not redirect the
  // browser to an immutable internal deployment: rewrite only same-origin hops.
  const out = new Response(response.body, response);
  const location = out.headers.get('Location');
  if (location) {
    try {
      const destination = new URL(location, target);
      if (destination.origin === target.origin) {
        destination.protocol = incoming.protocol;
        destination.host = incoming.host;
        out.headers.set('Location', destination.href);
      }
    } catch { /* retain original invalid Location for upstream semantics */ }
  }
  out.headers.set('Cache-Control', 'no-store');
  out.headers.set('X-Prisma-Core-Backend', qwenInterpreter ? 'qwen-dedicated-service' : 'stable-17a6c338');
  return out;
}
