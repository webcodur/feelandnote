/*
  파일명: /app/reading/components/Stopwatch.tsx
  기능: 스톱워치 컴포넌트
  책임: 독서 시간을 측정하고 표시한다.
*/ // ------------------------------

"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, Timer, RotateCcw } from "lucide-react";

interface Props {
  isRunning: boolean;
  elapsedTime: number;
  onToggle: () => void;
  onTimeUpdate: (seconds: number) => void;
  onReset: () => void;
}

export default function Stopwatch({
  isRunning,
  elapsedTime,
  onToggle,
  onTimeUpdate,
  onReset,
}: Props) {
  const secondsRef = useRef(elapsedTime);
  const displayRef = useRef<HTMLSpanElement>(null);

  // 초기값 동기화
  useEffect(() => {
    secondsRef.current = elapsedTime;
    if (displayRef.current) {
      displayRef.current.textContent = formatTime(elapsedTime);
    }
  }, [elapsedTime]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      secondsRef.current += 1;
      onTimeUpdate(secondsRef.current);

      if (displayRef.current) {
        displayRef.current.textContent = formatTime(secondsRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onTimeUpdate]);

  return (
    <div className="flex items-center gap-2">
      <Timer className="size-4 text-accent" />
      <span
        ref={displayRef}
        className="min-w-[72px] font-mono text-lg tabular-nums"
      >
        {formatTime(elapsedTime)}
      </span>
      <button
        onClick={onToggle}
        className="flex size-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
        title={isRunning ? "일시정지" : "재개"}
      >
        {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <button
        onClick={onReset}
        className="flex size-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
        title="초기화"
      >
        <RotateCcw className="size-4" />
      </button>
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
