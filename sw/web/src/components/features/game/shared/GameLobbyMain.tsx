/*
  파일명: components/features/game/shared/GameLobbyMain.tsx
  기능: 게임 로비 메인 화면 공통 컴포넌트
  책임: 시네마틱 타이틀 + CTA + 최고점수 + 하단메뉴 + 크레딧의 공통 레이아웃 제공.
*/
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

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
  highScore?: number;
  navItems: ReactNode;
}

export default function GameLobbyMain({
  title,
  englishTitle,
  catchphrase,
  cta,
  highScore,
  navItems,
}: GameLobbyMainProps) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 0);
    const t2 = setTimeout(() => setStep(2), 100);
    const t3 = setTimeout(() => setStep(3), 250);
    const t4 = setTimeout(() => setStep(4), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className="flex flex-col flex-1 relative">
      <div className="flex flex-col justify-end h-full w-full max-w-none mx-auto text-center px-4 pb-6 sm:ml-auto sm:mr-0 sm:text-right sm:max-w-[420px] sm:pr-8 sm:pb-10 sm:pl-4">

        {/* ═══ 타이틀 블록 ═══ */}
        <div className="text-right mb-6 sm:mb-10">
          <h1
            className={`text-6xl sm:text-8xl font-serif font-black text-white leading-none tracking-[0.15em] transition-all duration-1000 ease-out ${
              step >= 1 ? "opacity-100 translate-x-0 blur-0" : "opacity-0 translate-x-8 blur-sm"
            }`}
            style={{
              textShadow: "0 4px 30px rgba(212,175,55,0.2), 0 0 80px rgba(212,175,55,0.06), 0 2px 0 rgba(0,0,0,0.8)",
            }}
          >
            {title}
          </h1>

          <div className={`mt-1 sm:mt-3 transition-all duration-700 delay-200 ${
            step >= 2 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
          }`}>
            <div className="flex items-center justify-end gap-3">
              <div className="w-12 sm:w-24 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.3))" }} />
              <span
                className="text-base sm:text-xl font-cinzel font-bold uppercase tracking-[0.4em] text-accent/40"
                style={{ textShadow: "0 0 20px rgba(212,175,55,0.15), 0 0 40px rgba(212,175,55,0.05)" }}
              >
                {englishTitle}
              </span>
            </div>
          </div>

          <p className={`text-xs sm:text-sm text-white/20 mt-2 font-serif tracking-[0.25em] transition-all duration-700 delay-300 ${
            step >= 2 ? "opacity-100" : "opacity-0"
          }`}>
            {catchphrase}
          </p>

          {/* 타이틀↔메뉴 연결선 */}
          <div className={`mt-4 sm:mt-6 transition-all duration-700 delay-300 ${
            step >= 2 ? "opacity-100" : "opacity-0"
          }`}>
            <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent 5%, rgba(212,175,55,0.2) 40%, rgba(212,175,55,0.08) 100%)" }} />
          </div>
        </div>

        {/* ═══ CTA 버튼 ═══ */}
        <div className={`w-full mb-4 transition-all duration-700 ease-out ${
          step >= 3 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        }`}>
          <button
            onClick={cta.onClick}
            className="group relative w-full overflow-hidden hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
          >
            <div className="absolute inset-0 rounded-xl"
              style={{
                background: "linear-gradient(160deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.04) 40%, rgba(212,175,55,0.10) 100%)",
                border: "2px solid rgba(212,175,55,0.25)",
                boxShadow: "0 4px 24px rgba(212,175,55,0.08), 0 0 40px rgba(212,175,55,0.04)",
              }}
            />
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "linear-gradient(105deg, transparent 20%, rgba(212,175,55,0.1) 45%, rgba(212,175,55,0.18) 50%, rgba(212,175,55,0.1) 55%, transparent 80%)",
                boxShadow: "0 6px 32px rgba(212,175,55,0.12), 0 0 60px rgba(212,175,55,0.06)",
              }}
            />
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(to right, transparent 10%, rgba(212,175,55,0.4) 50%, transparent 90%)" }} />
            <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(to right, transparent 10%, rgba(212,175,55,0.2) 50%, transparent 90%)" }} />

            <div className="relative flex items-center gap-3 px-5 py-5 sm:py-6">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(145deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.08) 100%)",
                  boxShadow: "0 0 24px rgba(212,175,55,0.12), inset 0 1px 3px rgba(212,175,55,0.2)",
                }}
              >
                {cta.icon}
              </div>
              <div className="text-left flex-1 min-w-0">
                <span className="text-xl sm:text-2xl font-serif font-black text-accent tracking-tight">{cta.label}</span>
                <p className="text-[10px] sm:text-[11px] text-accent/30 mt-0.5 font-cinzel tracking-wider uppercase">{cta.sub}</p>
              </div>
              {cta.showChevron && (
                <ChevronRight size={22} className="text-accent/25 group-hover:text-accent/60 group-hover:translate-x-1.5 transition-all duration-300 shrink-0" />
              )}
            </div>
          </button>
        </div>

        {/* ═══ 최고 점수 ═══ */}
        {!!highScore && highScore > 0 && (
          <div className={`w-full text-right mb-3 transition-all duration-700 ${
            step >= 3 ? "opacity-100" : "opacity-0"
          }`}>
            <p className="text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider">High Score</p>
            <p className="text-2xl font-black text-accent">{highScore}</p>
          </div>
        )}

        {/* ═══ 하단 메뉴 ═══ */}
        <div className={`w-full flex flex-col gap-0.5 transition-all duration-700 ${
          step >= 4 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
        }`}>
          {navItems}
        </div>

        {/* ═══ 크레딧 ═══ */}
        <p className={`text-[9px] text-white/[0.08] mt-5 text-right font-cinzel tracking-[0.3em] uppercase transition-all duration-500 ${
          step >= 4 ? "opacity-100" : "opacity-0"
        }`}>
          Feel & Note
        </p>
      </div>
    </div>
  );
}
