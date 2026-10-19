import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function harness(hostname = 'feelandnote.com', search = '') {
  const sent = [], ledger = [], stored = new Map();
  const window = { location: { hostname, protocol: 'https:', search }, gtag: (...args) => sent.push(args),
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) } };
  const load = (file, dependencies = {}) => {
    const exports = {};
    const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, { exports, window, URLSearchParams, process: { env: { NODE_ENV: 'production' } },
      fetch: (...args) => { ledger.push(args); return Promise.resolve(); },
      require: name => dependencies[name] ?? {},
    });
    return exports;
  };
  const policy = load('./policy.ts');
  const queue = load('./queue.ts', { './policy': policy });
  const track = load('./track.ts', { './policy': policy, './queue': queue });
  return { ...track, sent, ledger, window };
}

test('production localhost and preview builds send neither GA nor purchase ledger events', () => {
  for (const host of ['localhost', '127.0.0.1', 'preview.feelandnote.com']) {
    const app = harness(host); app.trackEvent('commerce_click', { screen: 'content-detail', target: 'test' });
    assert.equal(app.sent.length, 0); assert.equal(app.ledger.length, 0);
    assert.equal(app.window.clarity, undefined);
  }
});

test('resident browser exclusion survives query cleanup and on explicitly resumes collection', () => {
  const app = harness('feelandnote.com', '?analytics=off');
  app.trackEvent('commerce_click'); app.window.location.search = '';
  app.trackEvent('commerce_click'); app.trackEvent('dialogue_audio_failure', { kind: 'greeting', failure_reason: 'network' });
  assert.equal(app.sent.length, 0); assert.equal(app.ledger.length, 0);
  app.window.location.search = '?analytics=on'; app.trackEvent('commerce_click');
  assert.equal(app.sent.length, 1); assert.equal(app.ledger.length, 1);
});

test('operating-domain outcomes reach GA and Clarity but not the purchase ledger', () => {
  const app = harness();
  app.trackEvent('content_brief_failure', { kind: 'selected', failure_reason: 'request' });
  assert.equal(app.sent[0][1], 'content_brief_failure');
  assert.equal(app.window.clarity.q[0][1], 'content_brief_failure');
  assert.equal(app.window.clarity.q[1][1], 'failure_reason');
  assert.equal(app.ledger.length, 0);
});
