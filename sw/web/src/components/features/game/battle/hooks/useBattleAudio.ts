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

type Phase = "idle" | "loading" | "draft" | "captain" | "battle" | "result";

// SFX 프리로드 캐시 (모듈 레벨 싱글톤)
const sfxCache = new Map<string, HTMLAudioElement>();
const SFX_FILES = [
  "sfx-card-deselect.mp3", "sfx-card-select.mp3", "sfx-card-pick.mp3",
  "sfx-clash-slash.mp3", "sfx-clash-clang.mp3",
  "sfx-cmd-select.mp3", "sfx-confirm.mp3", "sfx-deploy.mp3",
  "sfx-draft-ai.mp3", "sfx-draft-complete.mp3", "sfx-draft-pick.mp3",
  "sfx-enter-gate.mp3", "sfx-mandate-match.mp3", "sfx-rebellion.mp3",
  "sfx-reshuffle.mp3", "sfx-reveal.mp3", "sfx-round-draw.mp3",
  "sfx-round-lose.mp3", "sfx-round-win.mp3", "sfx-start.mp3",
];

function preloadSfx() {
  if (sfxCache.size > 0) return;
  for (const name of SFX_FILES) {
    const audio = new Audio(`${BASE}/${name}`);
    audio.preload = "auto";
    audio.load();
    sfxCache.set(name, audio);
  }
}

export type BgmTrack = { src: string; label: string };

function getBgmTracks(phase: Phase, playerWins?: boolean): BgmTrack[] {
  switch (phase) {
    case "idle":
      return [{ src: `${BASE}/bgm-intro.mp3`, label: "Intro" }];
    case "draft":
      return [{ src: `${BASE}/bgm-draft.mp3`, label: "Draft" }];
    case "battle":
      return [{ src: `${BASE}/bgm-battle.mp3`, label: "Battle" }];
    case "result":
      return playerWins
        ? [{ src: `${BASE}/bgm-result-win.mp3`, label: "Victory" }]
        : [{ src: `${BASE}/bgm-result-lose.mp3`, label: "Defeat" }];
    default:
      return [];
  }
}

export function useBattleAudio() {
  // 마운트 시 SFX 프리로드
  useEffect(() => { preloadSfx(); }, []);

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
  const [volume, setVolumeState] = useState(BGM_VOLUME);
  const [duration, setDuration] = useState(0);
  const volumeRef = useRef(BGM_VOLUME);
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
    audio.load(); // 브라우저 리소스 해제
  }, []);

  // BGM 페이드아웃 후 콜백
  const fadeOut = useCallback((audio: HTMLAudioElement, onDone?: () => void) => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    const step = audio.volume / (FADE_MS / 50);
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
  }, [disposeAudio]);

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
        audio.loop = tracksRef.current.length <= 1; // 단일 트랙이면 루프
        audio.play().then(() => setIsPlaying(true)).catch(() => {
          console.warn("[BattleAudio] BGM 자동 재생 차단됨:", track.src);
        });
        audio.addEventListener("pause", () => setIsPlaying(false));
        audio.addEventListener("play", () => setIsPlaying(true));
        audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
        audio.addEventListener("timeupdate", () => { currentTimeRef.current = audio.currentTime; });
        // 다중 트랙: 곡 끝나면 다음 곡으로 자동 전환
        if (tracksRef.current.length > 1) {
          audio.addEventListener("ended", () => {
            const tracks = tracksRef.current;
            setTrackIndex((prev) => {
              const next = prev < tracks.length - 1 ? prev + 1 : 0;
              // 다음 곡 재생은 state 업데이트 후 effect에서 처리
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
      return; // 최초 마운트 스킵
    }
    const tracks = tracksRef.current;
    if (tracks.length > 1 && tracks[trackIndexForEffect]) {
      playTrack(tracks[trackIndexForEffect], false);
    }
  }, [trackIndexForEffect]); // eslint-disable-line react-hooks/exhaustive-deps

  // BGM 전환 (페이즈 변경 시)
  const setBgm = useCallback(
    (phase: Phase, playerWins?: boolean) => {
      const tracks = getBgmTracks(phase, playerWins);
      const firstSrc = tracks[0]?.src ?? null;
      if (firstSrc === currentSrcRef.current) return;

      tracksRef.current = tracks;
      setTrackIndex(0);
      setTrackCount(tracks.length);
      isAutoAdvanceRef.current = false; // effect 트리거 방지
      playTrack(tracks[0] ?? null, true);
    },
    [playTrack]
  );

  // SFX 재생 (프리로드 캐시에서 cloneNode로 즉시 재생)
  const playSfx = useCallback((name: string) => {
    if (sfxMutedRef.current) return;
    const cached = sfxCache.get(name);
    if (cached) {
      const clone = cached.cloneNode(true) as HTMLAudioElement;
      clone.volume = SFX_VOLUME;
      clone.play().catch(() => {});
    } else {
      // 캐시 미스 시 폴백 (새 파일)
      const audio = new Audio(`${BASE}/${name}`);
      audio.volume = SFX_VOLUME;
      audio.play().catch(() => {});
    }
  }, []);

  // 플레이어: 재생/일시정지 토글
  const togglePlay = useCallback(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {
        console.warn("[BattleAudio] 재생 재개 실패");
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
