import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('./useReadingNarration.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
  };
}

function harness(initialUrl = '/ko.mp3', storage = memoryStorage()) {
  const slots = [];
  const effects = [];
  const audios = [];
  let cursor = 0;
  let url = initialUrl;
  let dirty = false;
  const changed = (before, after) => !before || after.some((value, index) => !Object.is(value, before[index]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: initial };
      return [slots[index].value, (next) => {
        slots[index].value = typeof next === 'function' ? next(slots[index].value) : next;
        dirty = true;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) slots[index] = { deps, callback };
      return slots[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) {
        const previous = slots[index];
        slots[index] = { deps, cleanup: previous?.cleanup };
        effects.push(() => {
          previous?.cleanup?.();
          slots[index].cleanup = callback();
        });
      }
    },
  };
  class AudioMock {
    duration = NaN;
    currentTime = 0;
    playbackRate = 1;
    defaultPlaybackRate = 1;
    paused = true;
    ended = false;
    error = null;
    listeners = new Map();
    requests = [];
    constructor() { audios.push(this); }
    addEventListener(name, callback) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(callback);
    }
    removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
    emit(name) { for (const callback of this.listeners.get(name) ?? []) callback(); }
    load() { this.playbackRate = this.defaultPlaybackRate; this.emit('ratechange'); }
    removeAttribute(name) { delete this[name]; }
    pause() { this.paused = true; this.emit('pause'); }
    play() {
      this.paused = false;
      return new Promise((resolve, reject) => { this.requests.push({ resolve, reject }); });
    }
    metadata(duration = 100) { this.duration = duration; this.emit('loadedmetadata'); }
  }
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: () => react, Audio: AudioMock, window: { localStorage: storage } });
  function render(nextUrl = url) {
    url = nextUrl;
    let result;
    do {
      cursor = 0;
      dirty = false;
      result = exports.useReadingNarration(url);
    } while (dirty);
    while (effects.length) effects.shift()();
    return result;
  }
  function unmount() { for (const slot of slots) slot?.cleanup?.(); }
  render();
  return {
    render,
    audios,
    unmount,
    remount(nextUrl = url) {
      unmount();
      slots.length = 0;
      return render(nextUrl);
    },
  };
}

const flushPromises = async () => { await Promise.resolve(); await Promise.resolve(); };

test('metadata makes valid recordings available; missing recordings stay hidden', () => {
  const run = harness();
  const audio = run.audios[0];
  assert.equal(run.render().available, false);
  assert.equal(audio.preload, 'metadata');
  assert.equal(audio.preservesPitch, true);
  audio.metadata();
  assert.equal(run.render().available, true);
  assert.equal(run.render().duration, 100);
  audio.error = { code: 4 };
  audio.emit('error');
  audio.emit('durationchange');
  assert.equal(run.render().available, false);
  assert.equal(run.render().status, 'idle');
});

test('pause, seek, rate and stop retain the loaded recording', async () => {
  const run = harness();
  const audio = run.audios[0];
  audio.metadata();
  run.render().play();
  audio.emit('playing');
  assert.equal(run.render().status, 'playing');
  run.render().seek(150);
  assert.equal(audio.currentTime, 100);
  run.render().seek(-10);
  assert.equal(audio.currentTime, 0);
  run.render().seek(25);
  run.render().setPlaybackRate(1.5);
  assert.equal(audio.playbackRate, 1.5);
  run.render().pause();
  assert.equal(run.render().status, 'paused');
  assert.equal(run.render().currentTime, 25);
  run.render().resume();
  audio.emit('playing');
  run.render().stop();
  for (const request of audio.requests) request.resolve();
  await flushPromises();
  assert.equal(audio.paused, true);
  assert.equal(run.render().status, 'idle');
  assert.equal(run.render().currentTime, 0);
  assert.equal(run.render().available, true);
  assert.equal(run.render().duration, 100);
  assert.equal(run.render().playbackRate, 1.5);
});

test('rejected playback leaves a valid file available for retry', async () => {
  const run = harness();
  const audio = run.audios[0];
  audio.metadata();
  run.render().play();
  audio.requests[0].reject(new Error('NotAllowedError'));
  await flushPromises();
  assert.equal(run.render().status, 'paused');
  assert.equal(run.render().available, true);
  run.render().resume();
  audio.emit('playing');
  assert.equal(run.render().status, 'playing');
});

test('source changes discard metadata and late playback events, including a rapid round trip', async () => {
  const run = harness();
  const previous = run.audios[0];
  previous.metadata();
  run.render().play();
  const stalePlaying = [...previous.listeners.get('playing')][0];
  assert.equal(run.render('/en.mp3').available, false);
  assert.equal(previous.paused, true);
  assert.equal(previous.src, undefined);
  assert.equal(run.render('/ko.mp3').available, false);
  const current = run.audios[2];
  current.metadata(80);
  previous.requests[0].resolve();
  stalePlaying();
  previous.emit('error');
  await flushPromises();
  assert.equal(run.render().duration, 80);
  assert.equal(run.render().available, true);
  assert.equal(run.render().status, 'idle');
});

test('an older rejected play cannot override a newer request; unmount cancels it', async () => {
  const run = harness();
  const audio = run.audios[0];
  audio.metadata();
  run.render().play();
  run.render().pause();
  run.render().resume();
  audio.emit('playing');
  audio.requests[0].reject(new Error('AbortError'));
  await flushPromises();
  assert.equal(run.render().status, 'playing');
  run.unmount();
  audio.requests[1].resolve();
  await flushPromises();
  assert.equal(audio.paused, true);
  assert.equal(audio.src, undefined);
  assert.equal([...audio.listeners.values()].flatMap((listeners) => [...listeners]).length, 0);
});

test('selected rate persists across languages, people, remounts and a fresh page runtime', () => {
  const storage = memoryStorage();
  const run = harness('/person-one/ko.mp3', storage);
  run.audios[0].metadata();
  run.render().setPlaybackRate(1.25);
  assert.equal(storage.getItem(), '1.25');
  run.render('/person-one/en.mp3');
  run.audios[1].metadata();
  assert.equal(run.render().playbackRate, 1.25);
  run.remount('/person-two/ko.mp3');
  run.audios[2].metadata();
  assert.equal(run.render().playbackRate, 1.25);
  const reloaded = harness('/person-two/en.mp3', storage);
  reloaded.audios[0].metadata();
  assert.equal(reloaded.render().playbackRate, 1.25);
  assert.equal(reloaded.audios[0].playbackRate, 1.25);
});

test('invalid saved rates and unsupported selection never reach the player', () => {
  for (const value of ['broken', 'null', '"1.5"', '0', '3', '1.1', '1e400']) {
    const run = harness('/ko.mp3', memoryStorage(value));
    run.audios[0].metadata();
    assert.equal(run.render().playbackRate, 1, value);
    for (const invalid of [NaN, Infinity, -1, 0.5, 1.1, 3]) run.render().setPlaybackRate(invalid);
    assert.equal(run.audios[0].playbackRate, 1);
  }
});

test('blocked storage keeps playback usable and remembers the rate during navigation', () => {
  const storage = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
  };
  const run = harness('/ko.mp3', storage);
  run.audios[0].metadata();
  run.render().setPlaybackRate(1.5);
  run.remount('/en.mp3');
  run.audios[1].metadata();
  assert.equal(run.render().playbackRate, 1.5);
  run.render().play();
  run.audios[1].emit('playing');
  assert.equal(run.render().status, 'playing');
});

test('a failed preference write cannot restore an older saved rate on navigation', () => {
  const storage = {
    getItem() { return '0.75'; },
    setItem() { throw new Error('QuotaExceededError'); },
  };
  const run = harness('/ko.mp3', storage);
  run.audios[0].metadata();
  assert.equal(run.render().playbackRate, 0.75);
  run.render().setPlaybackRate(2);
  run.remount('/en.mp3');
  run.audios[1].metadata();
  assert.equal(run.render().playbackRate, 2);
});
