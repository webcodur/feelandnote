/*
  파일명: components/features/game/shared/GameStartModal.tsx
  기능: 게임 진입 확인 모달 — 중앙 오버레이
  책임: 난이도 선택 모드(options 있음) 또는 단순 확인 모드(options 없음)를 제공.
*/
"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Play } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";
import type { DifficultyOption } from "./GameLobbyDifficultySelect";

interface GameStartModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (value?: string) => void;
  icon: ReactNode;
  title: string;
  desc?: string;
  options?: DifficultyOption[];
}

const COLOR_MAP = {
  accent: {
    button: "hover:bg-accent/[0.06] hover:border-accent/20",
    iconWrap: "bg-accent/10 border-accent/20",
    iconColor: "text-accent/70",
    label: "text-accent",
    labelSub: "text-accent/30",
    chevron: "group-hover:text-accent/40",
  },
  red: {
    button: "hover:bg-red-500/[0.06] hover:border-red-500/20",
    iconWrap: "bg-red-500/10 border-red-500/20",
    iconColor: "text-red-400/70",
    label: "text-red-400",
    labelSub: "text-red-400/30",
    chevron: "group-hover:text-red-400/40",
  },
} as const;

export default function GameStartModal({ open, onClose, onStart, icon, title, desc, options }: GameStartModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopImmediatePropagation();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    // capture phase로 등록하여 GameFullScreen ESC보다 먼저 처리
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.gameModal }}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* modal card */}
      <div className="relative w-[min(90vw,340px)] rounded-2xl bg-bg-main border border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* header */}
        <div className="flex flex-col items-center pt-6 pb-3 px-5">
          <div className="mb-2">{icon}</div>
          <h2 className="text-base font-serif font-black text-white">{title}</h2>
          {desc && <p className="text-[11px] text-text-tertiary mt-0.5">{desc}</p>}
        </div>

        {/* body */}
        <div className="px-4 pb-4 space-y-2">
          {options ? (
            options.map((opt) => {
              const c = COLOR_MAP[opt.color];
              return (
                <button
                  key={opt.value}
                  onClick={() => onStart(opt.value)}
                  className={`group w-full text-left px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] active:scale-[0.97] transition-all ${c.button}`}
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
            })
          ) : (
            <button
              onClick={() => onStart()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent font-bold text-sm hover:bg-accent/[0.15] active:scale-[0.97] transition-all"
            >
              <Play size={14} />
              시작
            </button>
          )}
        </div>

        {/* cancel */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
