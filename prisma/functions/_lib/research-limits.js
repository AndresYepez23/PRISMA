// Separate from inference quotas: a search may consume both Tavily and Jina.
// Counters are reserved before any provider call, including failed attempts.
export async function checkResearchLimits(env, request, namespace = 'research') {
  const db = env?.PRISMA_RATE_DB;
  const unavailable = () => ({ status: 503, code: 'LIMITS_UNAVAILABLE' });
  if (!db?.prepare) return unavailable();
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const key = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
  const minute = Math.floor(Date.now() / 60000), day = Math.floor(minute / 1440) * 1440;
  const configured = Number(env.PRISMA_RESEARCH_DAILY_LIMIT);
  const budget = Number.isInteger(configured) && configured > 0 ? Math.min(configured, 1000) : 200;
  const scopes = [
    [`${namespace}-ip-minute:${key}`, minute, 6, 1],
    [`${namespace}-ip-day:${key}`, day, 40, 1440],
    [`${namespace}-total-day`, day, budget, 1440]
  ];
  try {
    for (const [scope, start, limit, duration] of scopes) {
      const row = await db.prepare(`INSERT INTO ai_rate_limits(scope,window_start,request_count)
        VALUES(?,?,1) ON CONFLICT(scope,window_start) DO UPDATE
        SET request_count=request_count+1 WHERE request_count<? RETURNING request_count`)
        .bind(scope, start, limit).first();
      if (!row) return { status: 429, code: 'RESEARCH_LIMIT',
        retryAfter: Math.max(1, (start + duration) * 60 - Math.floor(Date.now() / 1000)) };
    }
    return null;
  } catch {
    return unavailable();
  }
}

export function researchLimitResponse(limit) {
  return Response.json({ ok: false, code: limit.code, error: 'Investigación temporalmente no disponible.',
    ...(limit.retryAfter ? { retryAfter: limit.retryAfter } : {}) }, {
    status: limit.status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      ...(limit.retryAfter ? { 'Retry-After': String(limit.retryAfter) } : {}) }
  });
}
