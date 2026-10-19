import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compile = file => ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const component = compile(new URL('./DialogueSubtitle.tsx', import.meta.url));
const operation = compile(new URL('../../../../lib/analytics/operation.ts', import.meta.url));

function harness() {
  const events = [], effects = [], cleanups = [], audios = [], timers = new Map();
  let timerId = 0;
  const monitor = {};
  vm.runInNewContext(operation, { exports: monitor, Date, require: () => ({ trackEvent: (name, params) => events.push({ name, params }) }) });
  const react = {
    useState: value => [value, () => {}], useRef: value => ({ current: value }),
    useCallback: callback => callback, useEffectEvent: callback => callback,
    useEffect: callback => effects.push(callback),
  };
  class AudioMock {
    paused = true; ended = false; error = null; duration = 2; currentTime = 0; playbackRate = 1;
    listeners = new Map();
    constructor() { audios.push(this); }
    addEventListener(name, callback) {
      if (!this.listeners.has(name)) this.listeners.set(name, []);
      this.listeners.get(name).push(callback);
    }
    emit(name) { for (const callback of this.listeners.get(name) ?? []) callback(); }
    load() {} pause() { this.paused = true; this.emit('pause'); }
    play() { this.paused = false; return new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); }
  }
  const exports = {};
  vm.runInNewContext(component, {
    exports, Audio: AudioMock, DOMException,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; }, clearTimeout: id => timers.delete(id),
    requestAnimationFrame: () => ++timerId, cancelAnimationFrame: () => {},
    window: { addEventListener() {}, removeEventListener() {} },
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
      if (name === 'next-intl') return { useLocale: () => 'ko', useTranslations: () => key => key };
      if (name === 'framer-motion') return { motion: {}, AnimatePresence: () => null };
      if (name === '@/lib/analytics/operation') return monitor;
      if (name === '@/lib/audio-ducking') return { registerVoice() {}, releaseAudio() {} };
      if (name === '@/hooks/useDialoguePosition') return { DEFAULT_DIALOGUE_COORDS: { top: 50, left: 50 } };
      return {};
    },
  });
  exports.default({ subtitle: { key: 1, text: 'Test line', tone: 'composed', label: 'greeting', audioUrl: '/test.mp3' }, voiceMuted: false });
  for (const effect of effects) cleanups.push(effect());
  return { audio: audios[0], events, timers, names: () => events.map(e => e.name), unmount: () => cleanups.forEach(cleanup => cleanup?.()) };
}

test('actual dialogue player records started only after play resolves, then completion', async () => {
  const app = harness();
  assert.deepEqual(app.names(), ['dialogue_audio_attempt']);
  app.audio.oncanplay();
  assert.deepEqual(app.names(), ['dialogue_audio_attempt']);
  app.audio.resolve(); await Promise.resolve();
  app.audio.ended = true; app.audio.emit('ended'); app.unmount();
  assert.deepEqual(app.names(), ['dialogue_audio_attempt', 'dialogue_audio_started', 'dialogue_audio_success']);
});

test('repeated audio errors record one network failure', () => {
  const app = harness();
  app.audio.error = { code: 2 }; app.audio.emit('error'); app.audio.emit('error'); app.unmount();
  assert.deepEqual(app.names(), ['dialogue_audio_attempt', 'dialogue_audio_failure']);
  assert.equal(app.events.at(-1).params.failure_reason, 'network');
});

test('blocked playback remains distinct from broken media', async () => {
  const app = harness(); app.audio.oncanplay();
  app.audio.reject(new DOMException('Policy restriction', 'NotAllowedError'));
  await Promise.resolve(); await Promise.resolve(); app.unmount();
  assert.deepEqual(app.names(), ['dialogue_audio_attempt', 'dialogue_audio_blocked']);
});

test('navigation during a pending play records cancellation and ignores the late rejection', async () => {
  const app = harness(); app.audio.oncanplay(); app.unmount();
  app.audio.reject(new DOMException('Cancelled', 'AbortError'));
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(app.names(), ['dialogue_audio_attempt', 'dialogue_audio_cancelled']);
});

test('audio load timeout records a failure and releases the pending player', () => {
  const app = harness(); [...app.timers.values()][0](); app.unmount();
  assert.deepEqual(app.names(), ['dialogue_audio_attempt', 'dialogue_audio_failure']);
  assert.equal(app.events.at(-1).params.failure_reason, 'timeout');
});
