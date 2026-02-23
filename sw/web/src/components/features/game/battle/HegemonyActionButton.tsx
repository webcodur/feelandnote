"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "@/constants/zIndex";

interface Props {
  text: string;
  subtext?: string;
  disabled?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  /** 버튼 위에 렌더할 추가 콘텐츠 (같은 포탈 컨테이너 내부) */
  topSlot?: React.ReactNode;
}

export default function HegemonyActionButton({
  text,
  subtext,
  disabled,
  onClick,
  className = "",
  topSlot,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`flex flex-col items-end gap-2 ${className}`}
      style={{
        zIndex: Z_INDEX.gameModal,
        position: 'fixed',
        pointerEvents: 'none',
      }}
    >
      {topSlot && <div style={{ pointerEvents: 'auto' }}>{topSlot}</div>}
      <button
        style={{ pointerEvents: disabled ? 'none' : 'auto' }}
        disabled={disabled}
        onClick={onClick}
        className={`group relative flex items-center justify-center transition-all duration-150 ${
          disabled
            ? "opacity-40 saturate-0 scale-90 pointer-events-none cursor-not-allowed"
            : "opacity-100 scale-100 active:scale-95 cursor-pointer hover:brightness-110 hover:scale-105"
        }`}
      >
        {/* --- 배경 이펙트 (Glow & Clouds) --- */}
        <div className="absolute inset-0 -inset-x-8 -inset-y-6 pointer-events-none overflow-visible">
          {/* Core Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-20 rounded-full bg-accent/20 blur-2xl animate-pulse" />
          
          {/* Revolving Orbs (Decorations) */}
          {!disabled && (
            <>
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-16 h-16 rounded-full bg-accent/10 blur-xl animate-[pulse_3s_ease-in-out_infinite]" />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-16 h-16 rounded-full bg-accent/10 blur-xl animate-[pulse_3s_ease-in-out_infinite_1s]" />
            </>
          )}
        </div>

        {/* --- 메인 버튼 컨테이너 --- */}
        <div className="relative z-10 transition-transform duration-150">
          {/* Outer Ring / Border Glow */}
          <div className="absolute -inset-[2px] rounded-lg bg-gradient-to-b from-[#d4af37] via-[#f7ef8a] to-[#8a6e14] opacity-60 blur-[2px] group-hover:opacity-100 transition-opacity duration-150" />
          
          {/* Button Body */}
          <div className="relative min-w-[140px] px-6 py-3 rounded-lg bg-gradient-to-b from-[#1a1a1a] via-[#0d0d0d] to-[#000000] border border-accent/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center overflow-hidden">
            
            {/* Shine Effect Animation */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]" />

            {/* Top Divider Line (Deco) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

            {/* Text Content */}
            <div className="flex flex-col items-center gap-0.5 z-10">
              <span className="font-cinzel text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-[#fffbe6] via-[#d4af37] to-[#8a6e14] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] filter">
                {text}
              </span>
              {subtext && (
                <span className="text-[9px] font-serif uppercase tracking-[0.3em] text-accent/40 group-hover:text-accent/70 transition-colors duration-150">
                  {subtext}
                </span>
              )}
            </div>

            {/* Bottom Divider Line (Deco) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          </div>
        </div>
      </button>
    </div>,
    document.body
  );
}
