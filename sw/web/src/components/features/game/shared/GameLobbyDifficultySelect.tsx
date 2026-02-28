/*
  파일명: components/features/game/shared/GameLobbyDifficultySelect.tsx
  기능: 난이도 선택 공통 컴포넌트
  책임: data-driven 옵션 목록으로 난이도 선택 UI를 제공. GameLobbySubmenu를 내부 사용하여 래퍼+헤더+키보드 자동 적용.
*/
"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import GameLobbySubmenu from "./GameLobbySubmenu";

export interface DifficultyOption {
  value: string;
  label: string;
  englishLabel: string;
  desc: string;
  icon: ReactNode;
  color: "accent" | "red";
}

interface GameLobbyDifficultySelectProps {
  onBack: () => void;
  onStart: (value: string) => void;
  icon: ReactNode;
  title: string;
  desc: string;
  options: DifficultyOption[];
}

const COLOR_MAP = {
  accent: {
    button: "hover:bg-accent/[0.06] hover:border-accent/20 data-[focused=true]:ring-accent/40 data-[focused=true]:bg-accent/[0.06]",
    iconWrap: "bg-accent/10 border-accent/20",
    iconColor: "text-accent/70",
    label: "text-accent",
    labelSub: "text-accent/30",
    chevron: "group-hover:text-accent/40",
  },
  red: {
    button: "hover:bg-red-500/[0.06] hover:border-red-500/20 data-[focused=true]:ring-red-500/40 data-[focused=true]:bg-red-500/[0.06]",
    iconWrap: "bg-red-500/10 border-red-500/20",
    iconColor: "text-red-400/70",
    label: "text-red-400",
    labelSub: "text-red-400/30",
    chevron: "group-hover:text-red-400/40",
  },
} as const;

export default function GameLobbyDifficultySelect({ onBack, onStart, icon, title, desc, options }: GameLobbyDifficultySelectProps) {
  return (
    <GameLobbySubmenu onBack={onBack} icon={icon} title={title} desc={desc}>
      <div className="px-4 pb-6 space-y-2">
        {options.map((opt) => {
          const c = COLOR_MAP[opt.color];
          return (
            <button
              key={opt.value}
              onClick={() => onStart(opt.value)}
              data-lobby-item
              className={`group w-full text-left px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] active:scale-[0.97] transition-all outline-none data-[focused=true]:ring-1 ${c.button}`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${c.iconWrap}`}>
                  <span className={c.iconColor}>{opt.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-serif font-black ${c.label}`}>{opt.label}</span>
                    <span className={`text-[8px] font-cinzel uppercase tracking-wider ${c.labelSub}`}>{opt.englishLabel}</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
                <ChevronRight size={14} className={`text-white/10 transition-colors shrink-0 ${c.chevron}`} />
              </div>
            </button>
          );
        })}
      </div>
    </GameLobbySubmenu>
  );
}
