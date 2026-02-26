/*
  파일명: components/features/game/battle/PhaseAnnounce.tsx
  기능: 페이즈/라운드 전환 알림 오버레이 (양피지 두루마리)
  책임: 페이즈·라운드 전환 시 ParchmentScrollBanner 위에 안내를 2.4초간 표시한다.
*/
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import ParchmentScrollBanner from "@/components/lab/ParchmentScrollBanner";

export interface AnnounceData {
  /** 고유 키 (같은 내용이라도 새 인스턴스 감지용) */
  key: string;
  /** 상단 작은 텍스트 (예: "PHASE", "ROUND 3") */
  label: string;
  /** 중앙 대형 텍스트 (예: "드래프트", "기술") */
  title: string;
  /** 하단 보조 텍스트 (선택) */
  subtitle?: string;
  /** 색조: accent(금), red, neutral */
  tone?: "accent" | "red" | "neutral";
}

interface Props {
  data: AnnounceData | null;
  onDone?: () => void;
}

const DISPLAY_MS = 2400;
const FADE_OUT_MS = 500;

const TONE_MAP = {
  accent: {
    glow: "rgba(212,175,55,0.10)",
    label: "text-[#8a6d3b]",
    title: "text-[#3e2b22]",
    subtitle: "text-[#8a6d3b]/70",
    shadow: "0 1px 2px rgba(0,0,0,0.2)",
  },
  red: {
    glow: "rgba(248,113,113,0.10)",
    label: "text-[#8b3a3a]",
    title: "text-[#5c1a1a]",
    subtitle: "text-[#8b3a3a]/70",
    shadow: "0 1px 2px rgba(0,0,0,0.2)",
  },
  neutral: {
    glow: "rgba(255,255,255,0.05)",
    label: "text-[#5c4033]",
    title: "text-[#3e2b22]",
    subtitle: "text-[#5c4033]/70",
    shadow: "0 1px 2px rgba(0,0,0,0.2)",
  },
} as const;

export default function PhaseAnnounce({ data, onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // 이미 처리 완료된 key를 추적하여 깜빡임 방지
  const handledKeyRef = useRef<string | null>(null);

  const clearAllTimers = useCallback(() => {
    if (exitTimerRef.current) { clearTimeout(exitTimerRef.current); exitTimerRef.current = null; }
    if (doneTimerRef.current) { clearTimeout(doneTimerRef.current); doneTimerRef.current = null; }
  }, []);

  // 클릭 시 즉시 제거
  const dismiss = useCallback(() => {
    if (!visible || exiting) return;
    clearAllTimers();
    if (data?.key) handledKeyRef.current = data.key;
    setVisible(false);
    setExiting(false);
    onDoneRef.current?.();
  }, [visible, exiting, clearAllTimers, data?.key]);

  useEffect(() => {
    if (!data) {
      clearAllTimers();
      setVisible(false);
      setExiting(false);
      return;
    }

    // 이미 처리한 key면 무시 (깜빡임 방지)
    if (handledKeyRef.current === data.key) return;

    setVisible(true);
    setExiting(false);

    exitTimerRef.current = setTimeout(() => setExiting(true), DISPLAY_MS - FADE_OUT_MS);
    doneTimerRef.current = setTimeout(() => {
      handledKeyRef.current = data.key;
      setVisible(false);
      setExiting(false);
      onDoneRef.current?.();
    }, DISPLAY_MS);

    return () => clearAllTimers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.key]);

  if (!visible || !data) return null;

  const tone = TONE_MAP[data.tone ?? "accent"];

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center cursor-pointer
        ${exiting ? "animate-phase-announce-out" : "animate-phase-announce-in"}
      `}
      onClick={dismiss}
    >
      {/* 배경 비네트 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${tone.glow} 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.85) 100%)`,
        }}
      />

      {/* 양피지 두루마리 + 안내 텍스트 */}
      <div className="relative">
        <ParchmentScrollBanner
          variant="horizontal"
          showLabels={false}
          paperWidth={320}
          paperHeight={160}
        >
          <div className="flex flex-col items-center justify-center gap-1.5 px-6">
            {/* 상단 장식선 + 라벨 */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-px bg-[#8a6d3b]/30" />
              <span className={`text-[9px] font-cinzel tracking-[0.3em] uppercase ${tone.label}`}>
                {data.label}
              </span>
              <div className="w-8 h-px bg-[#8a6d3b]/30" />
            </div>

            {/* 메인 타이틀 */}
            <h2
              className={`text-2xl sm:text-3xl font-serif font-black tracking-wide ${tone.title}`}
              style={{ textShadow: tone.shadow }}
            >
              {data.title}
            </h2>

            {/* 하단 보조 */}
            {data.subtitle && (
              <span className={`text-[10px] sm:text-xs font-cinzel tracking-widest ${tone.subtitle}`}>
                {data.subtitle}
              </span>
            )}

            {/* 하단 장식 */}
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-6 h-px bg-[#8a6d3b]/20" />
              <div className="w-1 h-1 rotate-45 bg-[#8a6d3b]/30" />
              <div className="w-6 h-px bg-[#8a6d3b]/20" />
            </div>
          </div>
        </ParchmentScrollBanner>
      </div>
    </div>
  );
}
