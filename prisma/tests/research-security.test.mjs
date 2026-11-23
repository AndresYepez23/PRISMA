import test from 'node:test';
import assert from 'node:assert/strict';
import { checkResearchLimits } from '../functions/_lib/research-limits.js';
import { onRequestPost } from '../functions/api/research/search.js';
import { onRequest } from '../functions/api/_middleware.js';
import { rateDB } from './helpers/rate-db.mjs';

const origin = 'https://prismaspace.space';
const request = (body = '{"query":"valid search"}', ip = '192.0.2.1') => new Request(origin + '/api/research/search', {
  method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': ip, 'Content-Type': 'application/json' }, body
});

test('atomic visitor cap admits six concurrent attempts and rejects the rest', async t => {
  const env = { PRISMA_RATE_DB: rateDB(t) };
  const results = await Promise.all(Array.from({ length: 20 }, () => checkResearchLimits(env, request())));
  assert.equal(results.filter(x => x === null).length, 6);
  assert.ok(results.filter(Boolean).every(x => x.status === 429 && x.retryAfter > 0));
  assert.equal(await checkResearchLimits(env, request(undefined, '192.0.2.2')), null);
});

test('global budget caps distinct visitors and both provider selections', async t => {
  const env = { PRISMA_RATE_DB: rateDB(t), PRISMA_RESEARCH_DAILY_LIMIT: '2' };
  for (let i = 1; i <= 2; i++) assert.equal(await checkResearchLimits(env, request(undefined, '192.0.2.' + i)), null);
  assert.equal((await checkResearchLimits(env, request(undefined, '192.0.2.3'))).status, 429);
});

test('visitor daily quota survives minute rollover', async t => {
  const original = Date.now;
  let now = Date.UTC(2026, 10, 23, 12);
  Date.now = () => now;
  t.after(() => { Date.now = original; });
  const env = { PRISMA_RATE_DB: rateDB(t) };
  for (let i = 0; i < 40; i++) {
    now += 60000;
    assert.equal(await checkResearchLimits(env, request()), null);
  }
  assert.equal((await checkResearchLimits(env, request())).status, 429);
});

test('encoded search route cannot bypass bridge protection', async () => {
  const req = new Request(origin + '/api/research/%73earch', { method: 'POST', headers: { Origin: origin }, body: '{}' });
  const response = await onRequest({ request: req, env: {} }, { fetcher() { throw Error('must not fetch'); } });
  assert.equal(response.status, 503);
});

test('missing or failed D1 denies both direct and bridged requests without provider calls', async () => {
  for (const env of [{}, { PRISMA_RATE_DB: { prepare() { throw Error('private diagnostic'); } } }]) {
    const direct = await onRequestPost({ request: request(), env });
    assert.equal(direct.status, 503);
    const bridge = await onRequest({ request: request(), env, next() { throw Error('unexpected local route'); } },
      { fetcher() { throw Error('upstream must not be called'); } });
    assert.equal(bridge.status, 503);
    assert.doesNotMatch(await bridge.text(), /private diagnostic/);
  }
});

test('bridge reserves before stable backend and returns Retry-After on exhaustion', async t => {
  const env = { PRISMA_RATE_DB: rateDB(t) }; let calls = 0;
  const options = { fetcher: async () => { calls++; return Response.json({ ok: true }); } };
  for (let i = 0; i < 6; i++) assert.equal((await onRequest({ request: request(), env }, options)).status, 200);
  const denied = await onRequest({ request: request(), env }, options);
  assert.equal(denied.status, 429); assert.ok(Number(denied.headers.get('Retry-After')) > 0);
  assert.equal(calls, 6);
});

test('null, arrays, non-string queries and oversized streamed UTF-8 are rejected', async () => {
  for (const body of ['null', '[]', '{"query":{}}', '{"query":7}']) {
    assert.equal((await onRequestPost({ request: request(body), env: {} })).status, 400);
  }
  let cancelled = false;
  const stream = new ReadableStream({ pull(c) { c.enqueue(new TextEncoder().encode('é'.repeat(7000))); }, cancel() { cancelled = true; } });
  const req = new Request(origin + '/api/research/search', { method: 'POST', headers: { Origin: origin }, body: stream, duplex: 'half' });
  assert.equal((await onRequestPost({ request: req, env: {} })).status, 413);
  assert.equal(cancelled, true);
});

test('failed providers consume quota and raw diagnostics never reach the client', async t => {
  const original = globalThis.fetch; let calls = 0;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => { calls++; return Response.json({ detail: 'sensitive-provider-test-value' }, { status: 500 }); };
  const env = { PRISMA_RATE_DB: rateDB(t), TAVILY_API_KEY: 'test', JINA_API_KEY: 'test' };
  for (let i = 0; i < 6; i++) {
    const result = await onRequestPost({ request: request(), env });
    assert.equal(result.status, 502); assert.doesNotMatch(await result.text(), /sensitive-provider-test-value/);
  }
  assert.equal((await onRequestPost({ request: request(), env })).status, 429);
  assert.equal(calls, 12);
});
