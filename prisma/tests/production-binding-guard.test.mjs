import test from 'node:test';
import assert from 'node:assert/strict';
import {REQUIRED_PRODUCTION_BINDING_NAMES,productionBindingReport,assertProductionBuildBindings} from '../scripts/production-binding-guard.mjs';
const sample = () => ({CF_PAGES_BRANCH:'main',...Object.fromEntries(REQUIRED_PRODUCTION_BINDING_NAMES.map(n=>[n,'example-configured-value'])),QUEEN_ENABLED:'1',QUEEN_STAGE:'production'});
test('production baseline is 55 unique binding names, never secret values',()=>{
 assert.equal(REQUIRED_PRODUCTION_BINDING_NAMES.length,55);
 assert.equal(new Set(REQUIRED_PRODUCTION_BINDING_NAMES).size,55);
 assert.ok(REQUIRED_PRODUCTION_BINDING_NAMES.includes('QUEEN_API_KEY'));
 assert.ok(REQUIRED_PRODUCTION_BINDING_NAMES.includes('JINA_API_KEY'));
 assert.ok(REQUIRED_PRODUCTION_BINDING_NAMES.includes('TAVILY_API_KEYS_JSON'));
});
test('production build guard accepts complete synthetic environment',()=>{
 const result=assertProductionBuildBindings(sample());
 assert.equal(result.active,true);assert.equal(result.available,55);assert.deepEqual(result.missing,[]);
});
test('production build guard blocks absent and API-masked secret values',()=>{
 for(const value of [undefined,'','   ','********','REDACTED']){
  const env=sample();if(value===undefined)delete env.QUEEN_API_KEY;else env.QUEEN_API_KEY=value;
  assert.ok(productionBindingReport(env).missing.includes('QUEEN_API_KEY'));
  assert.throws(()=>assertProductionBuildBindings(env),/PRODUCTION_BINDINGS_GUARD/);
 }
});
test('Qwen is required enabled for production',()=>{
 for(const [key,value] of [['QUEEN_ENABLED','0'],['QUEEN_STAGE','preview']]){
  const env=sample();env[key]=value;
  assert.ok(productionBindingReport(env).missing.includes(key));
  assert.throws(()=>assertProductionBuildBindings(env),/PRODUCTION_BINDINGS_GUARD/);
 }
});
test('preview builds intentionally do not use the production credential inventory',()=>{
 const env={CF_PAGES_BRANCH:'recovery/known-good-17a6c338'};
 const result=assertProductionBuildBindings(env);
 assert.equal(result.active,false);assert.deepEqual(result.missing,[]);
});
