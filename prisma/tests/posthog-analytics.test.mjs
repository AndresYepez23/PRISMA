import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const analytics = await readFile(new URL('src/posthog.js', root), 'utf8');

async function collectHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) files.push(...await collectHtml(target));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(target);
  }
  return files;
}

test('every generated public HTML page loads the shared PostHog bootstrap exactly once', async () => {
  const files = await collectHtml(dist);
  assert.ok(files.length > 0, 'the build should produce HTML pages');
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const count = (html.match(/<script type="module" src="\/src\/posthog\.js"><\/script>/g) || []).length;
    assert.equal(count, 1, 'PostHog bootstrap missing or duplicated in ' + file.pathname);
  }
  assert.ok(files.some(file => file.pathname.endsWith('/en/privacy/index.html')), 'English privacy route must be published');
});

test('PostHog capture is consent-gated and excludes sensitive content collection', () => {
  assert.match(analytics, /getConsent\(\) !== 'accepted'/);
  assert.match(analytics, /autocapture: false/);
  assert.match(analytics, /capture_pageview: false/);
  assert.match(analytics, /disable_session_recording: true/);
  assert.match(analytics, /capture_heatmaps: false/);
  assert.match(analytics, /capture_performance: false/);
  assert.match(analytics, /capture_exceptions: false/);
  assert.match(analytics, /logs: \{ captureConsoleLogs: false \}/);
  assert.match(analytics, /before_send: sanitizeEvent/);
  assert.match(analytics, /SAFE_CUSTOM_PROPERTIES/);
  assert.doesNotMatch(analytics, /posthog\.identify\s*\(/);
});
