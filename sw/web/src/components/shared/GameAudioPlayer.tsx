/*
  파일명: components/shared/GameAudioPlayer.tsx
  기능: 게임 내장 오디오 플레이어
  책임: BGM 재생/일시정지, 진행도 조작, 볼륨 조절을 제공한다. 모든 게임에서 공용으로 사용.
*/
"use client";

import { useRef, useCallback, useState, useEffect, type MutableRefObject } from "react";
import { Play, Pause, Volume1, Volume2, VolumeX } from "lucide-react";

export interface GameAudioControls {
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  seek: (time: number) => void;
  /** 오디오 엘리먼트 ref — 플레이어가 자체 폴링으로 currentTime을 읽는다 */
  bgmRef?: MutableRefObject<HTMLAudioElement | null>;
}

interface GameAudioPlayerProps {
  controls: GameAudioControls;
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function GameAudioPlayer({ controls }: GameAudioPlayerProps) {
  const { isPlaying, volume, duration, togglePlay, setVolume, seek, bgmRef } = controls;

  // 자체 rAF 폴링으로 currentTime 표시 (부모 리렌더 없음)
  const [localTime, setLocalTime] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || !bgmRef?.current) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    function tick() {
      if (bgmRef?.current) setLocalTime(bgmRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, bgmRef]);

  const displayTime = bgmRef ? localTime : controls.currentTime;

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(Number(e.target.value));
    },
    [setVolume]
  );

  const trackRef = useRef<HTMLDivElement>(null);

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seek(ratio * duration);
    },
    [duration, seek]
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => seekFromPointer(e.clientX),
    [seekFromPointer]
  );

  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-3 w-full max-w-xl">
      {/* 재생/일시정지 */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/30 text-text-secondary hover:text-accent active:scale-95 transition-all shrink-0"
        title={isPlaying ? "일시정지" : "재생"}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      {/* 시간 + 프로그레스 바 */}
      <span className="text-[10px] tabular-nums text-text-tertiary shrink-0 w-8 text-right">
        {formatTime(displayTime)}
      </span>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={trackRef}
        className="flex-1 relative h-5 flex items-center cursor-pointer group"
        onClick={handleTrackClick}
      >
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/10 group-hover:h-1.5 transition-all">
          <div
            className="h-full rounded-full bg-accent/60"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] tabular-nums text-text-tertiary shrink-0 w-8">
        {formatTime(duration)}
      </span>

      {/* 볼륨 */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setVolume(volume === 0 ? 0.35 : 0)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-accent transition-colors"
          title={volume === 0 ? "음소거 해제" : "음소거"}
        >
          <VolumeIcon size={14} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolumeChange}
          className="w-16 sm:w-20 h-1 accent-[var(--color-accent)] bg-white/10 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(212,175,55,0.4)]
            [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
        />
      </div>
    </div>
  );
}
