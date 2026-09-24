import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('./audio-ducking.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness() {
  const documentListeners = new Map();
  class FakeAudio extends EventTarget {
    paused = true;
    ended = false;
    _volume = 1;
    get volume() { return this._volume; }
    set volume(next) {
      this._volume = next;
      this.dispatchEvent(new Event('volumechange'));
    }
    play() {
      if (this.paused) {
        this.paused = false;
        this.ended = false;
        this.dispatchEvent(new Event('play'));
      }
      return Promise.resolve();
    }
    pause() {
      if (!this.paused) {
        this.paused = true;
        this.dispatchEvent(new Event('pause'));
      }
    }
    finish() {
      this.paused = true;
      this.ended = true;
      this.dispatchEvent(new Event('ended'));
    }
  }
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    HTMLAudioElement: FakeAudio,
    document: {
      addEventListener(name, callback) { documentListeners.set(name, callback); },
      querySelectorAll() { return []; },
    },
  });
  return { ...exports, FakeAudio, emitDomPlay: (audio) => documentListeners.get('play')?.({ target: audio }) };
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.0001, `${actual} should be ${expected}`);
}

test('one voice and one other sound coexist; the voice ducks and restores the other sound', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerOther(music);
  h.setOtherBaseVolume(music, 0.6);
  h.registerVoice(voice);
  await music.play();
  await voice.play();
  assert.equal(music.paused, false);
  near(music.volume, 0.18);
  voice.finish();
  assert.equal(music.volume, 0.6);
});

test('a later voice interrupts the previous one without lifting the ducking', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const first = new h.FakeAudio();
  const second = new h.FakeAudio();
  h.registerOther(music);
  h.registerVoice(first);
  h.registerVoice(second);
  await music.play();
  await first.play();
  await second.play();
  assert.equal(first.paused, true);
  assert.equal(second.paused, false);
  near(music.volume, 0.3);
  second.pause();
  assert.equal(music.volume, 1);
});

test('an effect temporarily replaces music, then the music resumes under a continuing voice', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const effect = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerOther(music);
  h.registerOther(effect, { transient: true });
  h.registerVoice(voice);
  h.setOtherBaseVolume(music, 0.5);
  h.setOtherBaseVolume(effect, 0.8);
  await music.play();
  await voice.play();
  await effect.play();
  assert.equal(music.paused, true);
  near(effect.volume, 0.24);
  effect.finish();
  assert.equal(music.paused, false);
  near(music.volume, 0.15);
  voice.pause();
  assert.equal(music.volume, 0.5);
});

test('a changed volume becomes the restored baseline; released music does not resume', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const effect = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerOther(music);
  h.registerOther(effect, { transient: true });
  h.registerVoice(voice);
  await music.play();
  await voice.play();
  music.volume = 0.8;
  assert.equal(h.getOtherBaseVolume(music), 0.8);
  near(music.volume, 0.24);
  await effect.play();
  h.releaseAudio(music);
  effect.finish();
  assert.equal(music.paused, true);
  voice.pause();
  assert.equal(effect.volume, 1);
});

test('consecutive effects keep one music resume target and a new music choice replaces it', async () => {
  const h = harness();
  const original = new h.FakeAudio();
  const firstEffect = new h.FakeAudio();
  const secondEffect = new h.FakeAudio();
  const replacement = new h.FakeAudio();
  h.registerOther(original);
  h.registerOther(firstEffect, { transient: true });
  h.registerOther(secondEffect, { transient: true });
  h.registerOther(replacement);
  await original.play();
  await firstEffect.play();
  await secondEffect.play();
  assert.equal(firstEffect.paused, true);
  secondEffect.finish();
  assert.equal(original.paused, false);
  await firstEffect.play();
  await replacement.play();
  firstEffect.finish();
  assert.equal(original.paused, true);
  assert.equal(replacement.paused, false);
});

test('native audio elements join the other channel through the document bridge', async () => {
  const h = harness();
  const voice = new h.FakeAudio();
  const nativePreview = new h.FakeAudio();
  h.registerVoice(voice);
  h.installDomAudioBridge();
  await voice.play();
  await nativePreview.play();
  h.emitDomPlay(nativePreview);
  near(nativePreview.volume, 0.3);
  voice.pause();
  assert.equal(nativePreview.volume, 1);
});

test('a delayed pause event cannot deactivate an element that is playing again', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerOther(music);
  h.registerVoice(voice);
  await music.play();
  music.pause();
  await music.play();
  music.dispatchEvent(new Event('pause'));
  await voice.play();
  near(music.volume, 0.3);
});

test('a delayed play event from an already paused sound cannot replace the current sound', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const effect = new h.FakeAudio();
  h.registerOther(music);
  h.registerOther(effect, { transient: true });
  await music.play();
  await effect.play();
  music.dispatchEvent(new Event('play'));
  assert.equal(music.paused, true);
  assert.equal(effect.paused, false);
  effect.finish();
  assert.equal(music.paused, false);
});

test('generated effects share the other channel and receive voice ducking', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerOther(music);
  h.registerVoice(voice);
  await music.play();
  await voice.play();
  let stopped = false;
  let duck = 1;
  const finish = h.beginOtherEffect(() => { stopped = true; }, (factor) => { duck = factor; });
  assert.equal(music.paused, true);
  assert.equal(duck, 0.3);
  voice.pause();
  assert.equal(duck, 1);
  const finishNext = h.beginOtherEffect(() => {}, () => {});
  assert.equal(stopped, true);
  finish();
  assert.equal(music.paused, true);
  finishNext();
  assert.equal(music.paused, false);
});

test('a persistent generated preview replaces music and does not resume it when finished', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerOther(music);
  h.registerVoice(voice);
  await music.play();
  await voice.play();
  let duck = 1;
  const finish = h.beginOtherEffect(() => {}, (factor) => { duck = factor; }, { transient: false });
  assert.equal(music.paused, true);
  assert.equal(duck, 0.3);
  finish();
  assert.equal(music.paused, true);
});
