/*
  파일명: /components/features/archive/contentLibrary/section/MonthTransitionIndicator.tsx
  기능: 월 전환 인디케이터
  책임: 스크롤 시 현재 보고 있는 월을 화면에 표시한다.
*/ // ------------------------------
"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface MonthTransitionIndicatorProps {
  currentMonthKey: string | null;
}

export default function MonthTransitionIndicator({ currentMonthKey }: MonthTransitionIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const [displayKey, setDisplayKey] = useState<string | null>(null);
  const [isMounting, setIsMounting] = useState(false);
  const [animatedMonth, setAnimatedMonth] = useState<string>("");

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibleRef = useRef(false);
  const displayKeyRef = useRef<string | null>(null);

  // ref 동기화
  visibleRef.current = visible;
  displayKeyRef.current = displayKey;

  useEffect(() => {
    if (!currentMonthKey) return;

    const [, newMonth] = currentMonthKey.split("-");
    const newMonthNum = parseInt(newMonth);

    // 타이머 초기화
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const prevVisible = visibleRef.current;
    const prevDisplayKey = displayKeyRef.current;

    // 이미 표시 중이고 월이 바뀌는 경우
    if (prevVisible && prevDisplayKey && prevDisplayKey !== currentMonthKey) {
      const [, oldMonth] = prevDisplayKey.split("-");
      const oldMonthNum = parseInt(oldMonth);

      // 카운팅 애니메이션
      const diff = newMonthNum - oldMonthNum;
      const step = diff > 0 ? 1 : -1;
      const steps = Math.abs(diff);

      let currentStep = 0;
      intervalRef.current = setInterval(() => {
        currentStep++;
        const intermediateMonth = oldMonthNum + (step * currentStep);
        setAnimatedMonth(intermediateMonth.toString().padStart(2, '0'));

        if (currentStep >= steps) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setDisplayKey(currentMonthKey);
        }
      }, 50);
    } else {
      // 처음 표시하거나 같은 월인 경우
      setDisplayKey(currentMonthKey);
      setAnimatedMonth(newMonth.padStart(2, '0'));
      setVisible(true);

      requestAnimationFrame(() => setIsMounting(true));
    }

    // 1초 후 사라지기
    hideTimerRef.current = setTimeout(() => {
      setIsMounting(false);
      setTimeout(() => setVisible(false), 300);
    }, 1000);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentMonthKey]);

  if (!displayKey || !visible) return null;

  const [year] = displayKey.split("-");

  // 브라우저 로케일 감지 (한국어: ko, ko-KR 등)
  const locale = typeof navigator !== "undefined" ? navigator.language : "en";
  const isKorean = locale.startsWith("ko");

  // 포탈을 사용하여 body에 직접 렌더링하여 z-index 이슈 방지 및 위치 보장
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none ${
        isMounting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="relative px-2 py-2 bg-gradient-to-br from-accent via-accent/95 to-accent/70 backdrop-blur-lg rounded-xl shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] border-2 border-white/30 flex items-center overflow-hidden">
        {/* Intense glow effect */}
        <div className="absolute inset-0 rounded-xl bg-accent/50 blur-xl -z-10"></div>
        <div className="absolute inset-0 rounded-xl bg-accent/30 blur-2xl -z-20"></div>

        {isKorean ? (
          <>
            <div className="w-12 flex justify-center">
              <span className="text-xl font-black text-white tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] font-mono">{year}</span>
            </div>
            <span className="text-base font-bold text-white/60 px-1">·</span>
            <div className="w-8 flex justify-center">
              <span className="text-xl font-black text-white tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] font-mono">{animatedMonth}</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 flex justify-center">
              <span className="text-xl font-black text-white tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] font-mono">{animatedMonth}</span>
            </div>
            <span className="text-base font-bold text-white/60 px-1">·</span>
            <div className="w-12 flex justify-center">
              <span className="text-xl font-black text-white tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] font-mono">{year}</span>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
