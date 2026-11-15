import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const worker = read('../sw.js');
const experience = read('../src/prisma-experience.js');
const bridge = read('../src/developer-bridge.js');
const main = read('../src/main.js');
const html = read('../index.html');

test('service worker updates wait for current app clients to close', () => {
  assert.match(worker, /self\.addEventListener\("install"/);
  assert.doesNotMatch(worker, /skipWaiting\s*\(/,
    'a new worker must not take over an active session');
  assert.match(worker, /self\.clients\.claim\(\)/,
    'the activated worker should control newly opened clients');
  assert.match(worker, /keys\.filter\(key=>key\.startsWith\("prisma-shell-"\)&&key!==CACHE\)/,
    'old versioned shell caches should be cleaned after activation');
});

test('PWA registration never reloads the current page on controller change', () => {
  assert.match(experience, /registration\.update\(\)/,
    'automatic update discovery must remain enabled');
  assert.doesNotMatch(experience, /controllerchange|location\.reload/,
    'service-worker activation must not trigger a second startup screen');
});

test('a stale developer engine pauses remote jobs and offers a manual update', () => {
  assert.match(bridge, /updatePending\s*=\s*true/);
  assert.match(bridge, /prisma:runtime-update-available/,
    'the app must receive a visible update notification');
  assert.match(bridge, /if \(updatePending\) return;/,
    'stale code must not claim another remote job');
  assert.doesNotMatch(bridge, /location\.reload/,
    'engine version checks must not automatically reload the app');
});

test('runtime update reload is available only through an explicit user action', () => {
  const start = main.indexOf("document.addEventListener('prisma:runtime-update-available'");
  assert.notEqual(start, -1, 'the main app must handle the update event');
  const handler = main.slice(start - 650, start + 900);
  assert.match(handler, /textContent='Recargar'/);
  assert.match(handler, /action\.addEventListener\('click',\(\)=>window\.location\.reload\(\)/,
    'only the user clicking Recargar may trigger the update reload');
  assert.match(handler, /dataPrismaRuntimeUpdate/,
    'duplicate update notices must be suppressed');
});

test('the HTML shell contains exactly one startup overlay', () => {
  assert.equal((html.match(/id="app-startup"/g) || []).length, 1);
});
