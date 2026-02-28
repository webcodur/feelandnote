/*
  파일명: components/features/game/shared/GameLobbyMain.tsx
  기능: 게임 로비 메인 화면 공통 컴포넌트
  책임: 시네마틱 타이틀 + CTA + 하단메뉴 + 크레딧의 공통 레이아웃 제공.
*/
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useLobbyKeyboard } from "./useLobbyKeyboard";

interface GameLobbyMainProps {
  title: string;
  englishTitle: string;
  catchphrase: string;
  cta: {
    icon: ReactNode;
    label: string;
    sub: string;
    onClick: () => void;
    showChevron?: boolean;
  };
  navItems: ReactNode;
  /** 타이틀 영역 탭 콜백 (숨김 기능 진입점) */
  onTitleTap?: () => void;
}

export default function GameLobbyMain({
  title,
  englishTitle,
  catchphrase,
  cta,
  navItems,
  onTitleTap,
}: GameLobbyMainProps) {
  const kbRef = useLobbyKeyboard();

  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 0);
    const t2 = setTimeout(() => setStep(2), 100);
    const t3 = setTimeout(() => setStep(3), 250);
    const t4 = setTimeout(() => setStep(4), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div ref={kbRef} className="flex flex-col flex-1 relative">
      <div className="flex flex-col items-end justify-end gap-2 sm:gap-3 h-full w-full pr-4 pb-3 sm:pr-8 sm:pb-6">

        {/* ═══ 타이틀 블록 ═══ */}
        <div className={`text-right px-5 py-4 sm:px-6 sm:py-5 max-w-[280px] sm:max-w-[400px] transition-all duration-1000 ease-out ${
          step >= 1 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        }`}>
          <h1
            className="text-4xl sm:text-6xl font-serif font-black text-white leading-none tracking-[0.15em]"
            style={{
              textShadow: "0 4px 30px rgba(212,175,55,0.2), 0 0 80px rgba(212,175,55,0.06), 0 2px 0 rgba(0,0,0,0.8)",
            }}
            onClick={onTitleTap}
          >
            {title}
          </h1>

          <div className={`mt-1 sm:mt-2 transition-all duration-700 delay-200 ${
            step >= 2 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
          }`}>
            <div className="flex items-center justify-end gap-3">
              <div className="w-10 sm:w-16 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.3))" }} />
              <span
                className="text-xs sm:text-base font-cinzel font-bold uppercase tracking-[0.4em] text-accent/40"
                style={{ textShadow: "0 0 20px rgba(212,175,55,0.15), 0 0 40px rgba(212,175,55,0.05)" }}
              >
                {englishTitle}
              </span>
            </div>
          </div>

          <p className={`text-[10px] sm:text-[13px] text-white/80 mt-2 sm:mt-2.5 font-serif tracking-[0.15em] sm:tracking-[0.25em] transition-all duration-700 delay-300 ${
            step >= 2 ? "opacity-100" : "opacity-0"
          }`}
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.5)" }}>
            {catchphrase}
          </p>
        </div>

        {/* ═══ CTA 행 ═══ */}
        <div className={`w-full max-w-[260px] sm:max-w-[360px] transition-all duration-700 ease-out ${
          step >= 3 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        }`}>
          <button
            onClick={cta.onClick}
            data-lobby-item
            className="group w-full flex items-center gap-2.5 sm:gap-3 px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.12] backdrop-blur-md border border-white/[0.08] text-left outline-none text-accent hover:bg-white/[0.18] active:scale-[0.97] cursor-pointer transition-all duration-75 data-[focused=true]:border-accent/30"
          >
            <span className="shrink-0 opacity-70 group-hover:opacity-100 group-hover:drop-shadow-[0_0_6px_rgba(212,175,55,0.4)] transition-all duration-75">{cta.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-serif font-bold block leading-tight">{cta.label}</span>
              <span className="text-[9px] font-cinzel uppercase tracking-widest block mt-px text-accent/30 group-hover:text-accent/50">{cta.sub}</span>
            </span>
            <ChevronRight size={14} className="text-accent/20 group-hover:text-accent/50 group-hover:translate-x-0.5 transition-all duration-75 shrink-0" />
          </button>
        </div>

        {/* ═══ 하단 메뉴 ═══ */}
        <div className={`w-full max-w-[260px] sm:max-w-[360px] flex flex-col gap-1.5 transition-all duration-700 ${
          step >= 4 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
        }`}>
          {navItems}
        </div>

        {/* ═══ 크레딧 ═══ */}
        <p className={`text-[9px] text-white/[0.08] text-right font-cinzel tracking-[0.3em] uppercase transition-all duration-500 ${
          step >= 4 ? "opacity-100" : "opacity-0"
        }`}>
          Feel & Note
        </p>
      </div>
    </div>
  );
}
