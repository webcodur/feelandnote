import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('./queue.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness() {
  let allowed = true;
  const window = {};
  const exports = {};
  vm.runInNewContext(compiled, { exports, window, require: () => ({ canTrackAnalytics: () => allowed }) });
  return { ...exports, window, disable: () => { allowed = false; } };
}

test('initial request outcomes wait for GA and enter the Clarity queue before its script loads', () => {
  const app = harness();
  const sent = [];
  app.sendAnalyticsEvent('content_brief_failure', { kind: 'selected', failure_reason: 'request' });
  assert.equal(app.window.clarity.q.length, 2);
  assert.equal(app.window.clarity.q[1][1], 'failure_reason');
  app.window.gtag = (...args) => sent.push(args);
  app.flushAnalyticsEvents(); app.flushAnalyticsEvents();
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], 'event');
  assert.equal(sent[0][1], 'content_brief_failure');
  app.sendAnalyticsEvent('dialogue_audio_started', { kind: 'greeting' });
  assert.equal(sent.length, 2);
  assert.equal(app.window.clarity.q.length, 3);
});

test('excluded traffic initializes no analytics queue and sends no events', () => {
  const app = harness();
  app.disable();
  app.sendAnalyticsEvent('dialogue_audio_failure', { kind: 'greeting' });
  app.flushAnalyticsEvents();
  assert.equal(app.window.clarity, undefined);
  assert.equal(app.window.gtag, undefined);
});

test('a late opt-out discards events waiting for initialization', () => {
  const app = harness();
  app.sendAnalyticsEvent('content_brief_attempt', { kind: 'selected' });
  const sent = [];
  app.window.gtag = (...args) => sent.push(args);
  app.disable(); app.flushAnalyticsEvents();
  assert.equal(sent.length, 0);
});
