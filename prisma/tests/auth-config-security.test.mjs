import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/auth/config.js';
const jwt = role => 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.test';
test('public auth configuration excludes private and malformed keys', async () => {
  for(const key of [jwt('service_role'), jwt('authenticated'), 'sb_secret_test', 'eyJbroken']) {
    const result = await onRequestGet({env:{PRISMA_SUPABASE_URL:'https://example.supabase.co',PRISMA_SUPABASE_PUBLISHABLE_KEY:key}});
    const data=await result.json();
    assert.equal(data.enabled,false); assert.equal(data.publishableKey,null);
  }
});
test('publishable and legacy anon keys preserve login configuration', async () => {
  for(const key of ['sb_publishable_test',jwt('anon')]) {
    const result=await onRequestGet({env:{PRISMA_SUPABASE_URL:'https://example.supabase.co',PRISMA_SUPABASE_PUBLISHABLE_KEY:key,PRISMA_AUTH_GOOGLE_ENABLED:'1'}});
    const data=await result.json();
    assert.equal(data.enabled,true);assert.equal(data.publishableKey,key);assert.equal(data.features.google,true);
  }
});
