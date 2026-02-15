/*
  파일명: components/features/game/tracker/TrackerTimer.tsx
  기능: 스테이지별 카운트다운 타이머 바
  책임: CSS 애니메이션으로 부드럽게 줄어드는 타이머 바 + 만료 시 콜백
*/
"use client";

import { useEffect, useRef } from "react";

interface TrackerTimerProps {
  duration: number;
  onExpire: () => void;
}

export default function TrackerTimer({ duration, onExpire }: TrackerTimerProps) {
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    const id = setTimeout(() => expireRef.current(), duration * 1000);
    return () => clearTimeout(id);
  }, [duration]);

  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full animate-[timer-shrink_linear_forwards]"
        style={{ animationDuration: `${duration}s` }}
      />
    </div>
  );
}
