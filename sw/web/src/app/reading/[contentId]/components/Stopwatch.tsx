/*
  파일명: /app/reading/[contentId]/components/Stopwatch.tsx
  기능: 스톱워치 컴포넌트
  책임: 독서 시간을 측정하고 표시한다.
*/ // ------------------------------

"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, Timer } from "lucide-react";

interface Props {
  isRunning: boolean;
  initialTime?: number;
  onToggle: () => void;
  onTimeUpdate: (seconds: number) => void;
}

export default function Stopwatch({ isRunning, initialTime = 0, onToggle, onTimeUpdate }: Props) {
  const secondsRef = useRef(initialTime);
  const displayRef = useRef<HTMLSpanElement>(null);

  // 초기값 동기화
  useEffect(() => {
    secondsRef.current = initialTime;
    if (displayRef.current) {
      displayRef.current.textContent = formatTime(initialTime);
    }
  }, [initialTime]);

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
      <span ref={displayRef} className="min-w-[72px] font-mono text-lg tabular-nums">
        {formatTime(initialTime)}
      </span>
      <button
        onClick={onToggle}
        className="flex size-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
      >
        {isRunning ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
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
