/** Voice, music, and sfx play in independent lanes. Voice lowers music; music replaces music; sfx overlaps freely. */
const DUCK_FACTOR = 0.3;

type Channel = "voice" | "music" | "sfx";
type AudioState = {
  audio: HTMLAudioElement;
  channel: Channel;
  baseVolume: number;
  appliedVolume: number;
  listeners: Array<[string, EventListener]>;
};
type MusicEffect = { stop: () => void; setDuck: (factor: number) => void };
type MusicSource = HTMLAudioElement | MusicEffect;

const states = new WeakMap<HTMLAudioElement, AudioState>();
let activeVoice: HTMLAudioElement | null = null;
let activeMusic: MusicSource | null = null;
let bridgeInstalled = false;

function isAudio(source: MusicSource): source is HTMLAudioElement {
  return states.has(source as HTMLAudioElement);
}

function stopMusic(source: MusicSource) {
  if (isAudio(source)) source.pause();
  else source.stop();
}

function clamp(volume: number) {
  return Math.max(0, Math.min(1, volume));
}

function applyVolume(state: AudioState) {
  const factor = state.channel === "music" && activeMusic === state.audio && activeVoice ? DUCK_FACTOR : 1;
  const next = clamp(state.baseVolume * factor);
  state.appliedVolume = next;
  if (Math.abs(state.audio.volume - next) > 0.001) state.audio.volume = next;
}

function refreshMusic() {
  if (!activeMusic) return;
  if (isAudio(activeMusic)) applyVolume(states.get(activeMusic)!);
  else activeMusic.setDuck(activeVoice ? DUCK_FACTOR : 1);
}

function activate(state: AudioState) {
  const { audio, channel } = state;
  if (channel === "voice") {
    if (activeVoice !== audio) {
      const previous = activeVoice;
      activeVoice = audio;
      previous?.pause();
    }
    refreshMusic();
    return;
  }
  if (channel === "sfx") return;
  if (activeMusic !== audio) {
    const previous = activeMusic;
    activeMusic = audio;
    if (previous) stopMusic(previous);
  }
  refreshMusic();
}

function deactivate(state: AudioState) {
  if (state.channel === "voice" && activeVoice === state.audio) {
    activeVoice = null;
    refreshMusic();
  } else if (state.channel === "music" && activeMusic === state.audio) {
    activeMusic = null;
    applyVolume(state);
  }
}

function register(audio: HTMLAudioElement, channel: Channel) {
  const existing = states.get(audio);
  if (existing) {
    if (existing.channel !== channel) throw new Error("An audio element cannot change channels");
    return;
  }
  const state: AudioState = {
    audio, channel, baseVolume: audio.volume, appliedVolume: audio.volume, listeners: [],
  };
  states.set(audio, state);
  const listen = (event: string, handler: EventListener) => {
    audio.addEventListener(event, handler);
    state.listeners.push([event, handler]);
  };
  listen("play", () => { if (!audio.paused && !audio.ended) activate(state); });
  listen("pause", () => { if (audio.paused) deactivate(state); });
  for (const event of ["ended", "error"]) listen(event, () => deactivate(state));
  if (channel !== "voice") {
    listen("volumechange", () => {
      if (Math.abs(audio.volume - state.appliedVolume) < 0.001) return;
      state.baseVolume = clamp(audio.volume);
      applyVolume(state);
    });
  }
  if (!audio.paused && !audio.ended) activate(state);
}

export function registerVoice(audio: HTMLAudioElement) {
  register(audio, "voice");
}

export function registerMusic(audio: HTMLAudioElement) {
  register(audio, "music");
}

export function registerSfx(audio: HTMLAudioElement) {
  register(audio, "sfx");
}

export function getBaseVolume(audio: HTMLAudioElement) {
  return states.get(audio)?.baseVolume ?? audio.volume;
}

export function setBaseVolume(audio: HTMLAudioElement, volume: number) {
  if (!states.has(audio)) registerMusic(audio);
  const state = states.get(audio)!;
  state.baseVolume = clamp(volume);
  applyVolume(state);
}

/** Register Web Audio output in the music lane. It replaces the current music and ends it when released. */
export function beginMusicEffect(stop: () => void, setDuck: (factor: number) => void) {
  const effect: MusicEffect = { stop, setDuck };
  const previous = activeMusic;
  activeMusic = effect;
  if (previous) stopMusic(previous);
  refreshMusic();
  return () => {
    if (activeMusic !== effect) return;
    activeMusic = null;
    effect.setDuck(1);
  };
}

export function releaseAudio(audio: HTMLAudioElement) {
  const state = states.get(audio);
  if (!state) return;
  audio.pause();
  deactivate(state);
  for (const [event, handler] of state.listeners) audio.removeEventListener(event, handler);
  states.delete(audio);
}

/** Native audio controls and the floating player join the music lane. */
export function installDomAudioBridge() {
  if (bridgeInstalled || typeof document === "undefined") return;
  bridgeInstalled = true;
  document.addEventListener("play", (event) => {
    const target = event.target;
    if (target instanceof HTMLAudioElement && !states.has(target)) registerMusic(target);
  }, true);
  document.querySelectorAll("audio").forEach((audio) => {
    if (!audio.paused && !states.has(audio)) registerMusic(audio);
  });
}
