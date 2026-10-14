import test from 'node:test';
import assert from 'node:assert/strict';
import { DeviceTranslation, TARGETS } from './engine.mjs';
import { TranslationCache } from './cache.mjs';
import { environment, fallback } from './fallback.mjs';
import { LANGUAGES } from './languages.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function fake({ wait = 5, prepareWait = 0, prepareError = false, translateError = false, empty = false } = {}) {
  const destroyed = [];
  return {
    destroyed,
    availability: async () => 'available',
    create: async options => {
      await delay(prepareWait);
      if (prepareError) throw new Error('simulated download rejection');
      return { translate: async text => {
        await delay(wait);
        if (translateError) throw new Error('simulated inference rejection');
        return empty ? '' : `MOCK-${options.targetLanguage}:${text}`;
      }, destroy: () => destroyed.push(options.targetLanguage) };
    },
  };
}
function memoryStorage() {
  const storage = {};
  Object.defineProperties(storage, {
    getItem: { value: key => storage[key] ?? null },
    setItem: { value: (key, value) => { storage[key] = value; } },
    removeItem: { value: key => { delete storage[key]; } },
  });
  return storage;
}
test('missing API is detectable and never silently returns English', async () => {
  const engine = new DeviceTranslation({ native: null });
  assert.equal(await engine.availability('zh'), 'missing-api');
  await assert.rejects(engine.activate('zh'), { code: 'missing-api' });
  await assert.rejects(engine.translate('Original English'), { code: 'not-ready' });
});
test('all eight target UI bundles have the same nonempty fields', () => {
  for (const target of TARGETS) {
    assert.deepEqual(Object.keys(LANGUAGES[target]).sort(), Object.keys(LANGUAGES.en).sort());
    assert(Object.values(LANGUAGES[target]).every(value => typeof value === 'string' ? value.trim() : value.length === 3));
  }
});
test('identical text in two views shares one native request', async () => {
  const engine = new DeviceTranslation({ native: fake({ wait: 20 }) });
  await engine.activate('es');
  const result = await Promise.all([engine.translate('Same review'), engine.translate('Same review')]);
  assert.equal(result[0], result[1]); assert.equal(engine.metrics.calls, 1); assert.equal(engine.metrics.shared, 1);
});
test('persisted browser cache survives a new session', async () => {
  const storage = memoryStorage();
  const first = new DeviceTranslation({ native: fake(), storage }); await first.activate('zh');
  await first.translate('Review'); first.original();
  const next = new DeviceTranslation({ native: fake(), storage }); await next.activate('zh');
  assert.equal(await next.translate('Review'), 'MOCK-zh:Review');
  assert.equal(next.metrics.calls, 0); assert.equal(next.metrics.hits, 1);
});
test('source changes and target changes cannot reuse the wrong translation', async () => {
  const engine = new DeviceTranslation({ native: fake(), storage: memoryStorage() }); await engine.activate('zh');
  await engine.translate('First revision'); await engine.translate('Second revision'); await engine.activate('es');
  assert.equal(await engine.translate('First revision'), 'MOCK-es:First revision'); assert.equal(engine.metrics.calls, 3);
});
test('paragraph breaks are preserved even when the model collapses whitespace', async () => {
  const engine = new DeviceTranslation({ native: fake() }); await engine.activate('zh');
  engine.instance.translate = async text => 'MOCK:' + text.replace(/\s+/g, ' ');
  assert.equal(await engine.translate('First\n\nSecond\r\n\r\nThird'), 'MOCK:First\n\nMOCK:Second\r\n\r\nMOCK:Third');
  assert.equal(engine.metrics.calls, 3);
});
test('switching to original rejects late translations', async () => {
  const engine = new DeviceTranslation({ native: fake({ wait: 25 }) }); await engine.activate('zh');
  const pending = engine.translate('Late result'); const rejected = assert.rejects(pending, { code: 'superseded' });
  await delay(5); engine.original(); await rejected;
  assert.equal(await engine.translate('English original'), 'English original'); assert.equal(engine.cache.memory.size, 0);
});
test('rapid language changes destroy late model instances', async () => {
  const native = fake({ prepareWait: 15 }); const engine = new DeviceTranslation({ native });
  const old = engine.activate('zh'); const rejected = assert.rejects(old, { code: 'superseded' });
  await engine.activate('es'); await rejected;
  assert.equal(engine.target, 'es'); assert(native.destroyed.includes('zh'));
});
test('preparation starts during click, without awaiting availability', async () => {
  let created = false;
  const engine = new DeviceTranslation({ native: { create: () => { created = true; return Promise.resolve({ destroy() {} }); } } });
  const pending = engine.activate('es'); assert(created); await pending;
});
test('model failure is explicit and original view stays available', async () => {
  const engine = new DeviceTranslation({ native: fake({ prepareError: true }) });
  await assert.rejects(engine.activate('zh'), { code: 'prepare-failed' });
  engine.original(); assert.equal(await engine.translate('Original'), 'Original');
});
test('failed text translation can be retried; failed jobs are not cached', async () => {
  const native = fake({ translateError: true }); const engine = new DeviceTranslation({ native }); await engine.activate('zh');
  await assert.rejects(engine.translate('Retry'), { code: 'translate-failed' });
  assert.equal(engine.pending.size, 0); assert.equal(engine.cache.memory.size, 0);
  engine.instance.translate = async () => 'MOCK-retry-success';
  assert.equal(await engine.translate('Retry'), 'MOCK-retry-success');
});
test('synchronous native exceptions preserve the meaningful error', async () => {
  const engine = new DeviceTranslation({ native: fake() }); await engine.activate('zh');
  engine.instance.translate = () => { throw new Error('native error'); };
  await assert.rejects(engine.translate('Text'), { code: 'translate-failed' }); assert.equal(engine.pending.size, 0);
});
test('empty translations and timeouts never leak English as a translation', async () => {
  const empty = new DeviceTranslation({ native: fake({ empty: true }) }); await empty.activate('zh');
  await assert.rejects(empty.translate('Text'), { code: 'empty-result' });
  const slow = new DeviceTranslation({ native: fake({ wait: 50 }), timeout: 10 }); await slow.activate('zh');
  await assert.rejects(slow.translate('Text'), { code: 'timeout' });
});
test('late preparation after timeout destroys its model', async () => {
  const native = fake({ prepareWait: 25 }); const engine = new DeviceTranslation({ native, timeout: 5 });
  await assert.rejects(engine.activate('zh'), { code: 'timeout' }); await delay(35); assert.deepEqual(native.destroyed, ['zh']);
});
test('storage denied or full does not stop translating', async () => {
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
  const engine = new DeviceTranslation({ native: fake(), storage: denied }); await engine.activate('zh');
  assert.equal(await engine.translate('Text'), 'MOCK-zh:Text'); assert.equal(await engine.translate('Text'), 'MOCK-zh:Text');
});
test('cache eviction is bounded and clearing leaves other app data intact', async () => {
  const storage = memoryStorage(); storage['unrelated-setting'] = 'keep'; const cache = new TranslationCache(storage);
  for (let i = 0; i < 260; i++) cache.set(await cache.key('zh', String(i)), String(i));
  assert.equal(cache.memory.size, 250); assert.equal(Object.keys(storage).length, 251);
  const otherTab = new TranslationCache(storage);
  for (let i = 300; i < 560; i++) otherTab.set(await cache.key('zh', String(i)), String(i));
  for (const key of Object.keys(storage).filter(key => key !== 'unrelated-setting')) cache.get(key);
  assert.equal(cache.memory.size, 250, 'Values saved by another tab must not overflow memory cache');
  cache.clear(); assert.deepEqual(Object.keys(storage), ['unrelated-setting']);
});
test('iOS Chrome and desktop-mode iPad get their own browser page-translation guidance', () => {
  for (const args of [{ ua: 'iPhone CriOS/154 Safari/604', platform: 'iPhone', touches: 5, api: false },
    { ua: 'Macintosh Safari/605', platform: 'MacIntel', touches: 5, api: false }]) {
    const env = environment(args); assert.equal(env.kind, 'ios');
    assert.equal(fallback(env).method, 'page-translation');
    assert(fallback(env).url.includes(env.browser === 'chrome' ? 'Platform%3DiOS' : 'support.apple.com'));
  }
});
test('Android and embedded browsers get native page-translation fallback', () => {
  const env = environment({ ua: 'Android; wv) MicroMessenger', platform: 'Linux', touches: 5, api: false });
  assert(env.embedded); assert.equal(fallback(env).key, 'androidApp'); assert(fallback(env).url.includes('Android'));
});
