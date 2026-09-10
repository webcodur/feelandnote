"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
};

const INITIAL_STATE: PlaybackState = {
  available: false,
  status: "idle",
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
};

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
    const session: PlaybackSession = { url: audioUrl, audio, wantsPlayback: false, request: 0 };
    sessionRef.current = session;
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
      update(session, { status: "paused" });
    };
    const ended = () => {
      session.wantsPlayback = false;
      session.request += 1;
      audio.currentTime = 0;
      update(session, { status: "idle", currentTime: 0 });
    };
    const failed = () => {
      session.wantsPlayback = false;
      session.request += 1;
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
      if (sessionRef.current === session) sessionRef.current = null;
      for (const [event, listener] of Object.entries(listeners)) audio.removeEventListener(event, listener);
      audio.pause();
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
    session.wantsPlayback = true;
    const request = ++session.request;
    update(session, { status: "loading" });
    void audio.play().then(() => {
      // Stop, unmount, or a source change may happen while play() is pending.
      if (sessionRef.current !== session || !session.wantsPlayback) audio.pause();
    }).catch(() => {
      if (sessionRef.current !== session || session.request !== request || !session.wantsPlayback) return;
      session.wantsPlayback = false;
      // A rejected user-gesture/autoplay request does not mean the file is missing.
      update(session, { status: "paused" });
    });
  }, [audioUrl, update]);

  const pause = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.url !== audioUrl) return;
    session.wantsPlayback = false;
    session.request += 1;
    session.audio.pause();
    update(session, { status: "paused" });
  }, [audioUrl, update]);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.url !== audioUrl) return;
    session.wantsPlayback = false;
    session.request += 1;
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
