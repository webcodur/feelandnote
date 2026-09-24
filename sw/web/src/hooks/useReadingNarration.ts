"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { registerVoice, releaseAudio } from "@/lib/audio-ducking";

export const READING_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
export const READING_PLAYBACK_RATE_STORAGE_KEY = "feelandnote:reading-narration:playback-rate:v1";

let rememberedPlaybackRate = 1;
let playbackRateLoaded = false;

function isPlaybackRate(value: unknown): value is number {
  return typeof value === "number" && READING_PLAYBACK_RATES.some((rate) => rate === value);
}

function readPlaybackRate() {
  if (playbackRateLoaded) return rememberedPlaybackRate;
  playbackRateLoaded = true;
  try {
    const stored = window.localStorage.getItem(READING_PLAYBACK_RATE_STORAGE_KEY);
    const value: unknown = stored === null ? null : JSON.parse(stored);
    if (isPlaybackRate(value)) rememberedPlaybackRate = value;
  } catch {
    // Private browsing or blocked storage still keeps the choice during navigation.
  }
  return rememberedPlaybackRate;
}

function rememberPlaybackRate(rate: number) {
  rememberedPlaybackRate = rate;
  playbackRateLoaded = true;
  try {
    window.localStorage.setItem(READING_PLAYBACK_RATE_STORAGE_KEY, JSON.stringify(rate));
  } catch {
    // Playback remains usable when the browser cannot save preferences.
  }
}

type Status = "idle" | "loading" | "playing" | "paused";
type PlaybackState = {
  available: boolean;
  status: Status;
  currentTime: number;
  duration: number;
  playbackRate: number;
};
type PlaybackSession = {
  url: string;
  audio: HTMLAudioElement;
  wantsPlayback: boolean;
  request: number;
  interrupt: () => void;
};

let activeSession: PlaybackSession | null = null;

const INITIAL_STATE: PlaybackState = {
  available: false,
  status: "idle",
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
};

/** 음원 파일의 메타데이터가 열리는지만 본다. 재생 장치 없이 존재 여부가 필요한 자리(탭 표시 등)용.
    null = 아직 확인 중, true = 재생 가능, false = 파일이 없거나 비어 있다. */
export function useAudioAvailable(audioUrl: string): boolean | null {
  const [state, setState] = useState<{ url: string; available: boolean | null }>({
    url: audioUrl,
    available: audioUrl ? null : false,
  });
  const available = state.url === audioUrl ? state.available : audioUrl ? null : false;
  if (state.url !== audioUrl) setState({ url: audioUrl, available: audioUrl ? null : false });

  useEffect(() => {
    if (!audioUrl || typeof Audio === "undefined") return;
    const audio = new Audio();
    audio.preload = "metadata";
    let done = false;
    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      setState({ url: audioUrl, available: value });
    };
    const loaded = () =>
      finish(!audio.error && Number.isFinite(audio.duration) && audio.duration > 0);
    const failed = () => finish(false);
    audio.addEventListener("loadedmetadata", loaded);
    audio.addEventListener("error", failed);
    audio.src = audioUrl;
    audio.load();
    return () => {
      done = true;
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("error", failed);
      audio.removeAttribute("src");
      audio.load();
    };
  }, [audioUrl]);

  return available;
}

/** Only expose playback after the recorded file's metadata has loaded. */
export function useReadingNarration(audioUrl: string) {
  const [snapshot, setSnapshot] = useState({ url: audioUrl, ...INITIAL_STATE });
  const sessionRef = useRef<PlaybackSession | null>(null);
  const state = snapshot.url === audioUrl ? snapshot : INITIAL_STATE;
  if (snapshot.url !== audioUrl) setSnapshot({ url: audioUrl, ...INITIAL_STATE });

  const update = useCallback((session: PlaybackSession, patch: Partial<PlaybackState>) => {
    if (sessionRef.current !== session) return;
    setSnapshot((previous) => ({
      ...(previous.url === session.url ? previous : INITIAL_STATE),
      url: session.url,
      ...patch,
    }));
  }, []);

  useEffect(() => {
    if (!audioUrl || typeof Audio === "undefined") return;
    const audio = new Audio();
    const session: PlaybackSession = { url: audioUrl, audio, wantsPlayback: false, request: 0, interrupt: () => {} };
    sessionRef.current = session;
    registerVoice(audio);
    session.interrupt = () => {
      session.wantsPlayback = false;
      session.request += 1;
      audio.pause();
      update(session, { status: "paused" });
    };
    audio.preload = "metadata";
    audio.preservesPitch = true;

    const metadata = () => {
      const duration = !audio.error && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      update(session, { available: duration > 0, duration, playbackRate: audio.playbackRate });
    };
    const time = () => update(session, { currentTime: audio.currentTime });
    const playing = () => {
      if (sessionRef.current !== session || !session.wantsPlayback) {
        audio.pause();
        return;
      }
      update(session, { status: "playing" });
    };
    const waiting = () => {
      if (session.wantsPlayback) update(session, { status: "loading" });
    };
    const paused = () => {
      // Ignore queued pause events after a newer play request or an explicit stop.
      if (!audio.paused || !session.wantsPlayback || audio.ended) return;
      session.wantsPlayback = false;
      session.request += 1;
      if (activeSession === session) activeSession = null;
      update(session, { status: "paused" });
    };
    const ended = () => {
      session.wantsPlayback = false;
      session.request += 1;
      if (activeSession === session) activeSession = null;
      audio.currentTime = 0;
      update(session, { status: "idle", currentTime: 0 });
    };
    const failed = () => {
      session.wantsPlayback = false;
      session.request += 1;
      if (activeSession === session) activeSession = null;
      audio.pause();
      update(session, { ...INITIAL_STATE, playbackRate: audio.playbackRate });
    };
    const rateChanged = () => update(session, { playbackRate: audio.playbackRate });
    const listeners = {
      loadedmetadata: metadata,
      durationchange: metadata,
      timeupdate: time,
      seeking: time,
      seeked: time,
      playing,
      waiting,
      pause: paused,
      ended,
      error: failed,
      ratechange: rateChanged,
    };
    for (const [event, listener] of Object.entries(listeners)) audio.addEventListener(event, listener);
    // Loading a new resource resets playbackRate to defaultPlaybackRate.
    audio.defaultPlaybackRate = readPlaybackRate();
    audio.playbackRate = audio.defaultPlaybackRate;
    audio.src = audioUrl;
    audio.load();

    return () => {
      session.wantsPlayback = false;
      session.request += 1;
      if (activeSession === session) activeSession = null;
      if (sessionRef.current === session) sessionRef.current = null;
      for (const [event, listener] of Object.entries(listeners)) audio.removeEventListener(event, listener);
      audio.pause();
      releaseAudio(audio);
      audio.removeAttribute("src");
      audio.load();
    };
  }, [audioUrl, update]);

  const play = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.url !== audioUrl) return;
    const { audio } = session;
    if (audio.error || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    if (audio.ended || audio.currentTime >= audio.duration) audio.currentTime = 0;
    if (activeSession && activeSession !== session) activeSession.interrupt();
    activeSession = session;
    session.wantsPlayback = true;
    const request = ++session.request;
    update(session, { status: "loading" });
    void audio.play().then(() => {
      // Stop, unmount, or a source change may happen while play() is pending.
      if (sessionRef.current !== session || !session.wantsPlayback) audio.pause();
    }).catch(() => {
      if (sessionRef.current !== session || session.request !== request || !session.wantsPlayback) return;
      session.wantsPlayback = false;
      if (activeSession === session) activeSession = null;
      // A rejected user-gesture/autoplay request does not mean the file is missing.
      update(session, { status: "paused" });
    });
  }, [audioUrl, update]);

  const pause = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.url !== audioUrl) return;
    session.wantsPlayback = false;
    session.request += 1;
    if (activeSession === session) activeSession = null;
    session.audio.pause();
    update(session, { status: "paused" });
  }, [audioUrl, update]);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.url !== audioUrl) return;
    session.wantsPlayback = false;
    session.request += 1;
    if (activeSession === session) activeSession = null;
    session.audio.pause();
    session.audio.currentTime = 0;
    update(session, { status: "idle", currentTime: 0 });
  }, [audioUrl, update]);

  const seek = useCallback((seconds: number) => {
    const session = sessionRef.current;
    if (!session || session.url !== audioUrl || !Number.isFinite(seconds)) return;
    const { audio } = session;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const currentTime = Math.max(0, Math.min(seconds, audio.duration));
    audio.currentTime = currentTime;
    update(session, { currentTime });
  }, [audioUrl, update]);

  const setPlaybackRate = useCallback((rate: number) => {
    const session = sessionRef.current;
    if (!session || session.url !== audioUrl || !isPlaybackRate(rate)) return;
    session.audio.defaultPlaybackRate = rate;
    session.audio.playbackRate = rate;
    rememberPlaybackRate(rate);
    update(session, { playbackRate: rate });
  }, [audioUrl, update]);

  return { ...state, play, pause, resume: play, stop, seek, setPlaybackRate };
}
