/*
  파일명: components/features/game/shared/GameLobbyNavRow.tsx
  기능: 게임 로비 메뉴 행 (공통)
  책임: 로비 하단 네비게이션 행 UI를 제공한다.
*/
"use client";

import { ChevronRight } from "lucide-react";

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
      className={`group flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition-all duration-200 text-left
        ${disabled
          ? "text-white/20 cursor-not-allowed"
          : "text-white/60 hover:text-white hover:bg-white/[0.06] active:scale-[0.97] cursor-pointer"
        }
      `}
    >
      <span className={`shrink-0 transition-all duration-200 ${disabled ? "opacity-50" : "opacity-70 group-hover:opacity-100 group-hover:drop-shadow-[0_0_6px_rgba(212,175,55,0.4)]"}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="text-sm font-serif font-bold block leading-tight">{label}</span>
        <span className={`text-[9px] font-cinzel uppercase tracking-widest block mt-px ${disabled ? "text-white/[0.10]" : "text-white/25 group-hover:text-white/40"}`}>{sub}</span>
      </span>
      {!disabled && <ChevronRight size={14} className="text-white/10 group-hover:text-white/30 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />}
    </button>
  );
}
