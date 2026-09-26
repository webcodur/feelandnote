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

test('a voice and a music sound coexist; the voice ducks and restores the music', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerMusic(music);
  h.setBaseVolume(music, 0.6);
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
  h.registerMusic(music);
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

test('sfx plays over music without pausing it, at full volume under a voice', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const sfx = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerMusic(music);
  h.registerSfx(sfx);
  h.registerVoice(voice);
  h.setBaseVolume(music, 0.5);
  h.setBaseVolume(sfx, 0.8);
  await music.play();
  await voice.play();
  await sfx.play();
  assert.equal(music.paused, false);
  assert.equal(sfx.paused, false);
  near(music.volume, 0.15);
  near(sfx.volume, 0.8);
  sfx.finish();
  assert.equal(music.paused, false);
  near(music.volume, 0.15);
  voice.pause();
  assert.equal(music.volume, 0.5);
});

test('sfx sounds overlap each other and none of them touches the music', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const first = new h.FakeAudio();
  const second = new h.FakeAudio();
  h.registerMusic(music);
  h.registerSfx(first);
  h.registerSfx(second);
  await music.play();
  await first.play();
  await second.play();
  assert.equal(first.paused, false);
  assert.equal(second.paused, false);
  assert.equal(music.paused, false);
  first.finish();
  assert.equal(second.paused, false);
  assert.equal(music.paused, false);
});

test('a new music replaces the current one and it does not come back', async () => {
  const h = harness();
  const original = new h.FakeAudio();
  const replacement = new h.FakeAudio();
  h.registerMusic(original);
  h.registerMusic(replacement);
  await original.play();
  await replacement.play();
  assert.equal(original.paused, true);
  assert.equal(replacement.paused, false);
  replacement.finish();
  assert.equal(original.paused, true);
});

test('native audio elements join the music lane through the document bridge', async () => {
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

test('a registered sfx element is not claimed by the document bridge', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const sfx = new h.FakeAudio();
  h.registerMusic(music);
  h.registerSfx(sfx);
  h.installDomAudioBridge();
  await music.play();
  await sfx.play();
  h.emitDomPlay(sfx);
  assert.equal(music.paused, false);
  assert.equal(sfx.paused, false);
});

test('a delayed pause event cannot deactivate an element that is playing again', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerMusic(music);
  h.registerVoice(voice);
  await music.play();
  music.pause();
  await music.play();
  music.dispatchEvent(new Event('pause'));
  await voice.play();
  near(music.volume, 0.3);
});

test('a delayed play event from an already paused sound cannot replace the current music', async () => {
  const h = harness();
  const first = new h.FakeAudio();
  const second = new h.FakeAudio();
  h.registerMusic(first);
  h.registerMusic(second);
  await first.play();
  await second.play();
  first.dispatchEvent(new Event('play'));
  assert.equal(first.paused, true);
  assert.equal(second.paused, false);
});

test('a released music stays down when a later sound finishes', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const sfx = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerMusic(music);
  h.registerSfx(sfx);
  h.registerVoice(voice);
  await music.play();
  await voice.play();
  music.volume = 0.8;
  assert.equal(h.getBaseVolume(music), 0.8);
  near(music.volume, 0.24);
  await sfx.play();
  h.releaseAudio(music);
  sfx.finish();
  assert.equal(music.paused, true);
  voice.pause();
  assert.equal(sfx.volume, 1);
});

test('a generated music effect replaces music, receives voice ducking, and is stopped by the next effect', async () => {
  const h = harness();
  const music = new h.FakeAudio();
  const voice = new h.FakeAudio();
  h.registerMusic(music);
  h.registerVoice(voice);
  await music.play();
  await voice.play();
  let stopped = false;
  let duck = 1;
  const finish = h.beginMusicEffect(() => { stopped = true; }, (factor) => { duck = factor; });
  assert.equal(music.paused, true);
  assert.equal(duck, 0.3);
  voice.pause();
  assert.equal(duck, 1);
  const finishNext = h.beginMusicEffect(() => {}, () => {});
  assert.equal(stopped, true);
  finish();
  assert.equal(music.paused, true);
  finishNext();
  assert.equal(music.paused, true);
});
