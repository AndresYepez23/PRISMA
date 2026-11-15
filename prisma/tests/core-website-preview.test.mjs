import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const core = read('../src/core.js');
const styles = read('../styles.css');

test('Core website delivery preview provides a dedicated in-preview close button', () => {
  assert.match(core, /core-website-preview-close/);
  assert.match(core, /setAttribute\('aria-label','Cerrar vista previa'\)/);
  assert.match(core, /document\.body\.append\(panel\)/);
  assert.match(core, /closeButton\.addEventListener\('click',closePreview\)/);
  assert.match(core, /previewButton\.setAttribute\('aria-controls',panel\.id\)/);
  assert.match(core, /previewButton\.focus\(/);
});

test('Core website preview closes with Escape and restores page scrolling', () => {
  assert.match(core, /if\(event\.key==='Escape'\).*?closePreview\(\)/s);
  assert.match(core, /document\.removeEventListener\('keydown',handlePreviewKeydown,true\)/);
  assert.match(core, /document\.body\.classList\.remove\('core-website-preview-open'\)/);
});

test('preview is a full-viewport PWA-safe surface with a touch-sized close target', () => {
  assert.match(styles, /\.core-website-preview\{[\s\S]*?position:fixed;inset:0;z-index:1100/);
  assert.match(styles, /safe-area-inset-top/);
  assert.match(styles, /\.core-website-preview-close\{[\s\S]*?min-width:44px;min-height:44px/);
  assert.match(styles, /body\.core-website-preview-open\{overflow:hidden!important/);
  assert.match(styles, /\.core-website-frame\{[\s\S]*?flex:1 1 auto/);
});
