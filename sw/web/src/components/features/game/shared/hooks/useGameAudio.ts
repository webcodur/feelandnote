/*
  파일명: components/features/game/shared/hooks/useGameAudio.ts
  기능: 게임 오디오 엔진 (범용)
  책임: BGM 페이즈 전환, SFX 트리거, 플레이어 제어 상태를 처리한다.
        게임별 설정(경로, SFX 목록, BGM 매핑)은 config로 주입받는다.
*/
"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { useLocale } from "next-intl";
import type { GameAudioControls } from "@/components/shared/GameAudioPlayer";
import { getOtherBaseVolume, registerOther, releaseAudio, setOtherBaseVolume } from "@/lib/audio-ducking";

export interface BgmTrack { src: string; label: string; labelEn?: string }

/** 게임 공용 결과 음악. 게임별 설정이 같은 파일을 가리키게 하고 목록 카탈로그도 여기서 가져간다 */
export const RESULT_MUSIC = {
  win: { src: "/assets/common/bgm-result-win.mp3", label: "승리의 메아리", labelEn: "Echoes of Victory" },
  lose: { src: "/assets/common/bgm-result-lose.mp3", label: "꺾인 깃발", labelEn: "A Fallen Banner" },
} satisfies Record<string, BgmTrack>;

export interface GameAudioConfig {
  basePath: string;
  /** SFX 파일 경로 기준. 미지정 시 basePath 사용 */
  sfxBasePath?: string;
  sfxFiles: string[];
  getBgmTracks: (state: string, context?: Record<string, unknown>) => BgmTrack[];
  bgmVolume?: number;
  sfxVolume?: number;
  fadeMs?: number;
}

// SFX 캐시를 basePath별로 격리 (모듈 레벨 싱글톤)
const sfxCacheByBase = new Map<string, Map<string, HTMLAudioElement>>();

function preloadSfx(basePath: string, sfxFiles: string[]) {
  const cache = sfxCacheByBase.get(basePath) ?? new Map<string, HTMLAudioElement>();
  if (!sfxCacheByBase.has(basePath)) sfxCacheByBase.set(basePath, cache);

  for (const name of sfxFiles) {
    if (cache.has(name)) continue;
    const audio = new Audio(`${basePath}/${name}`);
    audio.preload = "auto";
    audio.load();
    cache.set(name, audio);
  }
}

export function useGameAudio(config: GameAudioConfig) {
  const {
    basePath,
    sfxBasePath: _sfxBase,
    sfxFiles,
    getBgmTracks,
    bgmVolume = 0.35,
    sfxVolume = 0.6,
    fadeMs = 800,
  } = config;
  const sfxBase = _sfxBase ?? basePath;
  const locale = useLocale();
  const trackLabelOf = useCallback(
    (track: BgmTrack) => (locale === "en" ? track.labelEn?.trim() || track.label : track.label),
    [locale]
  );

  // 마운트 시 SFX 프리로드
  useEffect(() => { preloadSfx(sfxBase, sfxFiles); }, [sfxBase, sfxFiles]);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentSrcRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 플레이리스트 상태
  const tracksRef = useRef<BgmTrack[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [trackLabel, setTrackLabel] = useState("");
  const [trackSrc, setTrackSrc] = useState<string | null>(null);
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
    releaseAudio(audio);
    audio.removeAttribute("src");
    audio.load();
  }, []);

  // BGM 페이드아웃 후 콜백
  const fadeOut = useCallback((audio: HTMLAudioElement, onDone?: () => void) => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    const step = getOtherBaseVolume(audio) / (fadeMs / 50);
    fadeTimerRef.current = setInterval(() => {
      const next = getOtherBaseVolume(audio) - step;
      if (next <= 0) {
        setOtherBaseVolume(audio, 0);
        disposeAudio(audio);
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        onDone?.();
      } else {
        setOtherBaseVolume(audio, next);
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
          setTrackSrc(null);
          setIsPlaying(false);
          setTrackLabel("");
          return;
        }
        const audio = new Audio(track.src);
        registerOther(audio);
        setOtherBaseVolume(audio, volumeRef.current);
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
        setTrackSrc(track.src);
        setTrackLabel(trackLabelOf(track));
      }

      if (shouldFade && prev && !prev.paused) {
        fadeOut(prev, startNew);
      } else {
        startNew();
      }
    },
    [fadeOut, disposeAudio, trackLabelOf]
  );

  // 언어가 바뀌면 지금 곡의 표시 이름도 따라 바꾼다
  useEffect(() => {
    const track = tracksRef.current.find((item) => item.src === currentSrcRef.current);
    if (track) setTrackLabel(trackLabelOf(track));
  }, [locale, trackLabelOf]);

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
    const cache = sfxCacheByBase.get(sfxBase);
    const cached = cache?.get(name);
    if (cached) {
      const clone = cached.cloneNode(true) as HTMLAudioElement;
      registerOther(clone, { transient: true });
      setOtherBaseVolume(clone, sfxVolume);
      for (const event of ["pause", "ended", "error"]) clone.addEventListener(event, () => releaseAudio(clone), { once: true });
      void clone.play().catch(() => releaseAudio(clone));
    } else {
      const audio = new Audio(`${sfxBase}/${name}`);
      registerOther(audio, { transient: true });
      setOtherBaseVolume(audio, sfxVolume);
      for (const event of ["pause", "ended", "error"]) audio.addEventListener(event, () => releaseAudio(audio), { once: true });
      void audio.play().catch(() => releaseAudio(audio));
    }
  }, [sfxBase, sfxVolume]);

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
      setOtherBaseVolume(bgmRef.current, v);
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
    setTrackSrc(null);
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

  // src가 지금 플레이리스트에 있으면 그 곡을 튼다. 목록 밖의 곡이면 false를 돌려 호출자가 맡게 한다
  const playSrc = useCallback(
    (src: string) => {
      const tracks = tracksRef.current;
      const index = tracks.findIndex((track) => track.src === src);
      if (index < 0) return false;
      setTrackIndex((prev) => {
        if (index === prev) {
          const audio = bgmRef.current;
          if (audio?.paused) void audio.play().catch(() => {});
          return prev;
        }
        playTrack(tracks[index], false);
        return index;
      });
      return true;
    },
    [playTrack]
  );

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
    trackSrc,
    trackIndex,
    trackCount,
    nextTrack,
    prevTrack,
    playSrc,
  }), [isPlaying, volume, duration, togglePlay, setVolume, seek, trackLabel, trackSrc, trackIndex, trackCount, nextTrack, prevTrack, playSrc]);

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
        disposeAudio(bgmRef.current);
        bgmRef.current = null;
      }
      currentSrcRef.current = null;
    };
  }, [disposeAudio]);

  return { setBgm, playSfx, stopAll, audioControls, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted };
}
