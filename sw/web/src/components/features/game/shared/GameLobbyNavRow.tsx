/*
  파일명: components/features/game/shared/GameLobbyNavRow.tsx
  기능: 게임 로비 메뉴 행 (공통)
  책임: 로비 하단 네비게이션 행 UI를 제공한다.
*/
"use client";

import { CornerDownLeft } from "lucide-react";

interface GameLobbyNavRowProps {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick?: () => void;
  disabled?: boolean;
}

export default function GameLobbyNavRow({ icon, label, sub, onClick, disabled }: GameLobbyNavRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-lobby-item
      className={`group relative flex items-center gap-2 sm:gap-2.5 w-full px-3 py-1.5 sm:py-2 rounded-xl bg-white/[0.12] backdrop-blur-md border border-white/[0.08] text-left outline-none
        ${disabled
          ? "text-white/20 cursor-not-allowed"
          : "text-white/60 hover:text-white hover:bg-white/[0.18] active:scale-[0.97] cursor-pointer data-[focused=true]:border-accent/30 data-[focused=true]:text-white data-[focused=true]:bg-white/[0.18]"
        }
      `}
    >
      <span className={`shrink-0 ${disabled ? "opacity-50" : "opacity-70 group-hover:opacity-100 group-hover:drop-shadow-[0_0_6px_rgba(212,175,55,0.4)]"}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="text-xs sm:text-sm font-serif font-bold block leading-tight">{label}</span>
        <span className={`text-[9px] font-cinzel uppercase tracking-widest block mt-px ${disabled ? "text-white/[0.10]" : "text-white/25 group-hover:text-white/40"}`}>{sub}</span>
      </span>
      {!disabled && <CornerDownLeft size={13} className="text-white/0 group-data-[focused=true]:text-white/40 shrink-0" />}
    </button>
  );
}
