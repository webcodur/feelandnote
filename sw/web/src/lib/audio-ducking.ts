/** One voice and one other sound may play at a time. Voice lowers the other sound without changing its saved volume. */
const DUCK_FACTOR = 0.3;

type Channel = "voice" | "other";
type AudioState = {
  audio: HTMLAudioElement;
  channel: Channel;
  transient: boolean;
  baseVolume: number;
  appliedVolume: number;
  listeners: Array<[string, EventListener]>;
};
type OtherEffect = { stop: () => void; setDuck: (factor: number) => void };
type OtherSource = HTMLAudioElement | OtherEffect;

const states = new WeakMap<HTMLAudioElement, AudioState>();
let activeVoice: HTMLAudioElement | null = null;
let activeOther: OtherSource | null = null;
let suspendedOther: HTMLAudioElement | null = null;
let bridgeInstalled = false;

function isAudio(source: OtherSource): source is HTMLAudioElement {
  return states.has(source as HTMLAudioElement);
}

function stopOther(source: OtherSource) {
  if (isAudio(source)) source.pause();
  else source.stop();
}

function clamp(volume: number) {
  return Math.max(0, Math.min(1, volume));
}

function applyVolume(state: AudioState) {
  const factor = state.channel === "other" && activeOther === state.audio && activeVoice ? DUCK_FACTOR : 1;
  const next = clamp(state.baseVolume * factor);
  state.appliedVolume = next;
  if (Math.abs(state.audio.volume - next) > 0.001) state.audio.volume = next;
}

function refreshOther() {
  if (!activeOther) return;
  if (isAudio(activeOther)) applyVolume(states.get(activeOther)!);
  else activeOther.setDuck(activeVoice ? DUCK_FACTOR : 1);
}

function resumeSuspendedOther() {
  const resume = suspendedOther;
  suspendedOther = null;
  if (!resume || !states.has(resume)) return;
  activeOther = resume;
  refreshOther();
  void resume.play().catch(() => {
    const resumedState = states.get(resume);
    if (activeOther === resume && resumedState) deactivate(resumedState);
  });
}

function activate(state: AudioState) {
  const { audio, channel } = state;
  if (channel === "voice") {
    if (activeVoice !== audio) {
      const previous = activeVoice;
      activeVoice = audio;
      previous?.pause();
    }
    refreshOther();
    return;
  }
  if (activeOther !== audio) {
    const previous = activeOther;
    if (state.transient && previous && isAudio(previous) && !states.get(previous)?.transient) suspendedOther = previous;
    if (!state.transient) suspendedOther = null;
    activeOther = audio;
    if (previous) stopOther(previous);
  }
  refreshOther();
}

function deactivate(state: AudioState) {
  if (state.channel === "voice" && activeVoice === state.audio) {
    activeVoice = null;
    refreshOther();
  } else if (state.channel === "other" && activeOther === state.audio) {
    activeOther = null;
    applyVolume(state);
    if (state.transient) resumeSuspendedOther();
    else suspendedOther = null;
  }
}

function register(audio: HTMLAudioElement, channel: Channel, transient = false) {
  const existing = states.get(audio);
  if (existing) {
    if (existing.channel !== channel) throw new Error("An audio element cannot change channels");
    return;
  }
  const state: AudioState = {
    audio, channel, transient, baseVolume: audio.volume, appliedVolume: audio.volume, listeners: [],
  };
  states.set(audio, state);
  const listen = (event: string, handler: EventListener) => {
    audio.addEventListener(event, handler);
    state.listeners.push([event, handler]);
  };
  listen("play", () => { if (!audio.paused && !audio.ended) activate(state); });
  listen("pause", () => { if (audio.paused) deactivate(state); });
  for (const event of ["ended", "error"]) listen(event, () => deactivate(state));
  if (channel === "other") {
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

export function registerOther(audio: HTMLAudioElement, options: { transient?: boolean } = {}) {
  register(audio, "other", options.transient ?? false);
}

export function getOtherBaseVolume(audio: HTMLAudioElement) {
  return states.get(audio)?.baseVolume ?? audio.volume;
}

export function setOtherBaseVolume(audio: HTMLAudioElement, volume: number) {
  registerOther(audio);
  const state = states.get(audio)!;
  state.baseVolume = clamp(volume);
  applyVolume(state);
}

/** Register Web Audio output in the other channel. Transient effects resume the sound they interrupted. */
export function beginOtherEffect(stop: () => void, setDuck: (factor: number) => void, options: { transient?: boolean } = {}) {
  const effect: OtherEffect = { stop, setDuck };
  const previous = activeOther;
  if (options.transient !== false && previous && isAudio(previous) && !states.get(previous)?.transient) suspendedOther = previous;
  if (options.transient === false) suspendedOther = null;
  activeOther = effect;
  if (previous) stopOther(previous);
  refreshOther();
  return () => {
    if (activeOther !== effect) return;
    activeOther = null;
    effect.setDuck(1);
    if (options.transient === false) suspendedOther = null;
    else resumeSuspendedOther();
  };
}

export function releaseAudio(audio: HTMLAudioElement) {
  const state = states.get(audio);
  if (!state) return;
  audio.pause();
  deactivate(state);
  if (suspendedOther === audio) suspendedOther = null;
  for (const [event, handler] of state.listeners) audio.removeEventListener(event, handler);
  states.delete(audio);
}

/** Native audio controls and the floating player join the other-sound channel. */
export function installDomAudioBridge() {
  if (bridgeInstalled || typeof document === "undefined") return;
  bridgeInstalled = true;
  document.addEventListener("play", (event) => {
    const target = event.target;
    if (target instanceof HTMLAudioElement && !states.has(target)) registerOther(target);
  }, true);
  document.querySelectorAll("audio").forEach((audio) => {
    if (!audio.paused && !states.has(audio)) registerOther(audio);
  });
}
