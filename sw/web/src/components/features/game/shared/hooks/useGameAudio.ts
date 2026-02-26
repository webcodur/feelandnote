/*
  파일명: components/features/game/shared/hooks/useGameAudio.ts
  기능: 게임 오디오 엔진 (범용)
  책임: BGM 페이즈 전환, SFX 트리거, 플레이어 제어 상태를 처리한다.
        게임별 설정(경로, SFX 목록, BGM 매핑)은 config로 주입받는다.
*/
"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import type { GameAudioControls } from "@/components/shared/GameAudioPlayer";

export interface BgmTrack { src: string; label: string }

export interface GameAudioConfig {
  basePath: string;
  sfxFiles: string[];
  getBgmTracks: (state: string, context?: Record<string, unknown>) => BgmTrack[];
  bgmVolume?: number;
  sfxVolume?: number;
  fadeMs?: number;
}

// SFX 캐시를 basePath별로 격리 (모듈 레벨 싱글톤)
const sfxCacheByBase = new Map<string, Map<string, HTMLAudioElement>>();

function preloadSfx(basePath: string, sfxFiles: string[]) {
  if (sfxCacheByBase.has(basePath)) return;
  const cache = new Map<string, HTMLAudioElement>();
  for (const name of sfxFiles) {
    const audio = new Audio(`${basePath}/${name}`);
    audio.preload = "auto";
    audio.load();
    cache.set(name, audio);
  }
  sfxCacheByBase.set(basePath, cache);
}

export function useGameAudio(config: GameAudioConfig) {
  const {
    basePath,
    sfxFiles,
    getBgmTracks,
    bgmVolume = 0.35,
    sfxVolume = 0.6,
    fadeMs = 800,
  } = config;

  // 마운트 시 SFX 프리로드
  useEffect(() => { preloadSfx(basePath, sfxFiles); }, [basePath, sfxFiles]);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentSrcRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 플레이리스트 상태
  const tracksRef = useRef<BgmTrack[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [trackLabel, setTrackLabel] = useState("");
  const [trackCount, setTrackCount] = useState(0);

  // 플레이어 제어 상태 — currentTime은 ref로 관리 (rAF 리렌더 방지)
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(bgmVolume);
  const [duration, setDuration] = useState(0);
  const volumeRef = useRef(bgmVolume);
  const currentTimeRef = useRef(0);

  // 음소거 상태
  const [bgmMuted, setBgmMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const bgmMutedRef = useRef(false);
  const sfxMutedRef = useRef(false);

  // Audio 리소스 정리 헬퍼
  const disposeAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, []);

  // BGM 페이드아웃 후 콜백
  const fadeOut = useCallback((audio: HTMLAudioElement, onDone?: () => void) => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    const step = audio.volume / (fadeMs / 50);
    fadeTimerRef.current = setInterval(() => {
      const next = audio.volume - step;
      if (next <= 0) {
        audio.volume = 0;
        disposeAudio(audio);
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        onDone?.();
      } else {
        audio.volume = next;
      }
    }, 50);
  }, [disposeAudio, fadeMs]);

  // 단일 트랙 재생 (내부 헬퍼)
  const playTrack = useCallback(
    (track: BgmTrack | null, shouldFade: boolean) => {
      const prev = bgmRef.current;

      function startNew() {
        if (bgmRef.current) {
          disposeAudio(bgmRef.current);
          bgmRef.current = null;
        }
        currentTimeRef.current = 0;
        setDuration(0);

        if (!track) {
          currentSrcRef.current = null;
          setIsPlaying(false);
          setTrackLabel("");
          return;
        }
        const audio = new Audio(track.src);
        audio.volume = volumeRef.current;
        audio.muted = bgmMutedRef.current;
        audio.loop = tracksRef.current.length <= 1;
        audio.play().then(() => setIsPlaying(true)).catch(() => {
          console.warn("[GameAudio] BGM 자동 재생 차단됨:", track.src);
        });
        audio.addEventListener("pause", () => setIsPlaying(false));
        audio.addEventListener("play", () => setIsPlaying(true));
        audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
        audio.addEventListener("timeupdate", () => { currentTimeRef.current = audio.currentTime; });
        if (tracksRef.current.length > 1) {
          audio.addEventListener("ended", () => {
            const tracks = tracksRef.current;
            setTrackIndex((prev) => {
              const next = prev < tracks.length - 1 ? prev + 1 : 0;
              return next;
            });
          }, { once: true });
        }

        bgmRef.current = audio;
        currentSrcRef.current = track.src;
        setTrackLabel(track.label);
      }

      if (shouldFade && prev && !prev.paused) {
        fadeOut(prev, startNew);
      } else {
        startNew();
      }
    },
    [fadeOut, disposeAudio]
  );

  // trackIndex 변경 시 해당 트랙 재생 (자동 전환용)
  const trackIndexForEffect = trackIndex;
  const isAutoAdvanceRef = useRef(false);
  useEffect(() => {
    if (!isAutoAdvanceRef.current) {
      isAutoAdvanceRef.current = true;
      return;
    }
    const tracks = tracksRef.current;
    if (tracks.length > 1 && tracks[trackIndexForEffect]) {
      playTrack(tracks[trackIndexForEffect], false);
    }
  }, [trackIndexForEffect]); // eslint-disable-line react-hooks/exhaustive-deps

  // BGM 전환 (상태 변경 시)
  const setBgm = useCallback(
    (state: string, context?: Record<string, unknown>) => {
      const tracks = getBgmTracks(state, context);
      const firstSrc = tracks[0]?.src ?? null;
      if (firstSrc === currentSrcRef.current) return;

      tracksRef.current = tracks;
      setTrackIndex(0);
      setTrackCount(tracks.length);
      isAutoAdvanceRef.current = false;
      playTrack(tracks[0] ?? null, true);
    },
    [playTrack, getBgmTracks]
  );

  // SFX 재생 (프리로드 캐시에서 cloneNode로 즉시 재생)
  const playSfx = useCallback((name: string) => {
    if (sfxMutedRef.current) return;
    const cache = sfxCacheByBase.get(basePath);
    const cached = cache?.get(name);
    if (cached) {
      const clone = cached.cloneNode(true) as HTMLAudioElement;
      clone.volume = sfxVolume;
      clone.play().catch(() => {});
    } else {
      const audio = new Audio(`${basePath}/${name}`);
      audio.volume = sfxVolume;
      audio.play().catch(() => {});
    }
  }, [basePath, sfxVolume]);

  // 플레이어: 재생/일시정지 토글
  const togglePlay = useCallback(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {
        console.warn("[GameAudio] 재생 재개 실패");
      });
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
    disposeAudio(bgmRef.current);
    bgmRef.current = null;
    currentSrcRef.current = null;
    currentTimeRef.current = 0;
    tracksRef.current = [];
    setIsPlaying(false);
    setDuration(0);
    setTrackIndex(0);
    setTrackCount(0);
    setTrackLabel("");
  }, [disposeAudio]);

  // 트랙 전환
  const nextTrack = useCallback(() => {
    const tracks = tracksRef.current;
    if (tracks.length <= 1) return;
    setTrackIndex((prev) => {
      const next = Math.min(prev + 1, tracks.length - 1);
      if (next !== prev) playTrack(tracks[next], false);
      return next;
    });
  }, [playTrack]);

  const prevTrack = useCallback(() => {
    const tracks = tracksRef.current;
    if (tracks.length <= 1) return;
    setTrackIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next !== prev) playTrack(tracks[next], false);
      return next;
    });
  }, [playTrack]);

  // 플레이어 제어 객체
  const audioControls: GameAudioControls = useMemo(() => ({
    isPlaying,
    volume,
    get currentTime() { return currentTimeRef.current; },
    duration,
    togglePlay,
    setVolume,
    seek,
    bgmRef,
    trackLabel,
    trackIndex,
    trackCount,
    nextTrack,
    prevTrack,
  }), [isPlaying, volume, duration, togglePlay, setVolume, seek, trackLabel, trackIndex, trackCount, nextTrack, prevTrack]);

  // BGM 음소거 토글
  const toggleBgmMuted = useCallback(() => {
    const next = !bgmMutedRef.current;
    bgmMutedRef.current = next;
    setBgmMuted(next);
    if (bgmRef.current) bgmRef.current.muted = next;
  }, []);

  // SFX 음소거 토글
  const toggleSfxMuted = useCallback(() => {
    const next = !sfxMutedRef.current;
    sfxMutedRef.current = next;
    setSfxMuted(next);
  }, []);

  // 컴포넌트 언마운트 시 전체 정리
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.removeAttribute("src");
        bgmRef.current.load();
        bgmRef.current = null;
      }
      currentSrcRef.current = null;
    };
  }, []);

  return { setBgm, playSfx, stopAll, audioControls, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted };
}
