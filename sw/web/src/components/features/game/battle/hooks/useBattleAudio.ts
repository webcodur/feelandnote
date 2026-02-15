/*
  파일명: components/features/game/battle/hooks/useBattleAudio.ts
  기능: 패권 게임 오디오 관리
  책임: BGM 페이즈 전환, SFX 트리거, 플레이어 제어 상태를 처리한다.
*/
"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import type { GameAudioControls } from "@/components/shared/GameAudioPlayer";

const BASE = "/assets/suikoden/audio/battle";
const FADE_MS = 800;
const BGM_VOLUME = 0.35;
const SFX_VOLUME = 0.6;

type Phase = "idle" | "loading" | "draft" | "battle" | "revealing" | "result";

function getBgmSrc(phase: Phase, playerWins?: boolean): string | null {
  switch (phase) {
    case "idle":
      return `${BASE}/bgm-intro.mp3`;
    case "draft":
      return `${BASE}/bgm-draft.mp3`;
    case "battle":
    case "revealing":
      return `${BASE}/bgm-battle.mp3`;
    case "result":
      return playerWins ? `${BASE}/bgm-result-win.mp3` : `${BASE}/bgm-result-lose.mp3`;
    default:
      return null;
  }
}

export function useBattleAudio() {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentSrcRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 플레이어 제어 상태 — currentTime은 ref로 관리 (rAF 리렌더 방지)
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(BGM_VOLUME);
  const [duration, setDuration] = useState(0);
  const volumeRef = useRef(BGM_VOLUME);
  const currentTimeRef = useRef(0);

  // BGM 페이드아웃 후 콜백
  const fadeOut = useCallback((audio: HTMLAudioElement, onDone?: () => void) => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    const step = audio.volume / (FADE_MS / 50);
    fadeTimerRef.current = setInterval(() => {
      const next = audio.volume - step;
      if (next <= 0) {
        audio.volume = 0;
        audio.pause();
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        onDone?.();
      } else {
        audio.volume = next;
      }
    }, 50);
  }, []);

  // BGM 전환
  const setBgm = useCallback(
    (phase: Phase, playerWins?: boolean) => {
      const src = getBgmSrc(phase, playerWins);
      if (src === currentSrcRef.current) return;

      const prev = bgmRef.current;
      if (prev && !prev.paused) {
        fadeOut(prev, () => startNew(src));
      } else {
        startNew(src);
      }

      function startNew(newSrc: string | null) {
        currentTimeRef.current = 0;
        setDuration(0);

        if (!newSrc) {
          currentSrcRef.current = null;
          setIsPlaying(false);
          return;
        }
        const audio = new Audio(newSrc);
        audio.volume = volumeRef.current;
        audio.loop = true;
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
        audio.addEventListener("pause", () => setIsPlaying(false));
        audio.addEventListener("play", () => setIsPlaying(true));
        audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
        // timeupdate로 ref만 갱신 (리렌더 없음)
        audio.addEventListener("timeupdate", () => { currentTimeRef.current = audio.currentTime; });

        bgmRef.current = audio;
        currentSrcRef.current = newSrc;
      }
    },
    [fadeOut]
  );

  // SFX 재생 (fire-and-forget)
  const playSfx = useCallback((name: string) => {
    const audio = new Audio(`${BASE}/${name}`);
    audio.volume = SFX_VOLUME;
    audio.play().catch(() => {});
  }, []);

  // 플레이어: 재생/일시정지 토글
  const togglePlay = useCallback(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  // 플레이어: 시간 탐색
  const seek = useCallback((time: number) => {
    const audio = bgmRef.current;
    if (!audio) return;
    audio.currentTime = time;
    currentTimeRef.current = time;
  }, []);

  // 플레이어: 볼륨 변경
  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
    setVolumeState(v);
    if (bgmRef.current) {
      bgmRef.current.volume = v;
    }
  }, []);

  // 모든 오디오 즉시 정지
  const stopAll = useCallback(() => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    fadeTimerRef.current = null;
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current = null;
    }
    currentSrcRef.current = null;
    currentTimeRef.current = 0;
    setIsPlaying(false);
    setDuration(0);
  }, []);

  // 플레이어 제어 객체 — bgmRef를 통해 currentTime을 실시간 조회
  const audioControls: GameAudioControls = useMemo(() => ({
    isPlaying,
    volume,
    get currentTime() { return currentTimeRef.current; },
    duration,
    togglePlay,
    setVolume,
    seek,
    bgmRef,
  }), [isPlaying, volume, duration, togglePlay, setVolume, seek]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      bgmRef.current?.pause();
    };
  }, []);

  return { setBgm, playSfx, stopAll, audioControls };
}
