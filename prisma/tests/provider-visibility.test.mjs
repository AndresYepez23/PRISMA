import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const main = read('../src/main.js');
const core = read('../src/core.js');
const providerCards = read('../src/providers.js');
const toolFields = read('../src/tool-fields.js');
const registry = read('../src/registry.js');
const html = read('../index.html');
const routing = read('../src/provider-routing.js');

test('Lab IA connection cards and provider catalogue hide Requesty and Hugging Face', () => {
  const connections = main.slice(
    main.indexOf('function renderProviderConnections()'),
    main.indexOf('let openRouterUsageRequest')
  );
  assert.doesNotMatch(connections, /Requesty|Hugging Face|requesty|huggingface|hf-model-summary/i);
  assert.match(main, /hiddenProviders=new Set\(\['requesty','huggingface'\]\)/);
  assert.match(main, /visibleCredentials=Object\.entries\(central\.credentialSlots\|\|\{\}\)/);
  assert.doesNotMatch(providerCards, /Requesty|Hugging Face|requesty|huggingface/i);
  assert.doesNotMatch(html, /Hugging Face|Requesty/i);
});

test('Lab IA workflow and tool selectors no longer offer the removed providers', () => {
  const textStudio = main.slice(
    main.indexOf('function textStudioModelSettings()'),
    main.indexOf('function buildWorkflowFields')
  );
  const workflowFields = main.slice(
    main.indexOf('function buildWorkflowFields'),
    main.indexOf('function setupWorkflowAI')
  );
  assert.doesNotMatch(textStudio, /Requesty|Hugging Face|requesty|huggingface/i);
  assert.doesNotMatch(workflowFields, /Requesty|Hugging Face|requesty|huggingface/i);
  assert.doesNotMatch(toolFields, /Requesty|Hugging Face|requesty|huggingface/i);
  assert.doesNotMatch(registry, /Requesty|Hugging Face|requesty|huggingface/i);
});

test('Prisma Core manual model picker excludes hidden providers, including dynamic catalog entries', () => {
  const labels = core.slice(
    core.indexOf('const MODEL_PROVIDER_LABELS'),
    core.indexOf('const HIDDEN_MANUAL_MODEL_PROVIDERS')
  );
  const picker = core.slice(
    core.indexOf('function renderChatModelOptions'),
    core.indexOf('const CREATE_GROUPS')
  );
  assert.doesNotMatch(labels, /Requesty|Hugging Face|requesty|huggingface/i);
  assert.match(core, /HIDDEN_MANUAL_MODEL_PROVIDERS=new Set\(\['requesty','huggingface'\]\)/);
  assert.match(picker, /!HIDDEN_MANUAL_MODEL_PROVIDERS\.has\(p\)/);
  assert.match(picker, /if\(HIDDEN_MANUAL_MODEL_PROVIDERS\.has\(provider\)\)continue/);
});

test('old manual selections of removed providers safely return to automatic mode', () => {
  const choice = core.slice(
    core.indexOf('function chooseConversationModel'),
    core.indexOf('function chooseAutomaticConversationModel')
  );
  const picker = core.slice(
    core.indexOf('function renderModelPicker'),
    core.indexOf('function renderComposerMode')
  );
  assert.match(choice, /HIDDEN_MANUAL_MODEL_PROVIDERS\.has\(provider\)/);
  assert.match(picker, /previous\.mode==='manual'/);
  assert.match(picker, /selectAutomaticConversationModel\(previous,Date\.now\(\)\)/);
});

test('automatic backend fallback routing remains intact and is not exposed as a manual choice', () => {
  assert.match(routing, /MIDDLE_PROVIDER_ORDER=Object\.freeze\(\["sensenova","kilo","aihubmix","requesty","huggingface"\]\)/);
  assert.match(core, /const HIDDEN_MANUAL_MODEL_PROVIDERS/);
});
