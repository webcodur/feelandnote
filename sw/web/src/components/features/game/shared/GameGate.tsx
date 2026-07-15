/*
  파일명: components/features/game/shared/GameGate.tsx
  기능: 게임 입장 게이트
  책임: 전체화면 진입 전 게임명·설명·입장 버튼을 표시하는 공통 UI.
*/
"use client";

import type { ReactNode } from "react";
import { Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface GameGateProps {
  icon: ReactNode;
  gameName: string;
  subtitle: string;
  onEnter: () => void;
}

export default function GameGate({ icon, gameName, subtitle, onEnter }: GameGateProps) {
  const t = useTranslations("shared.game");

  return (
    <div className="max-w-md mx-auto flex flex-col items-center text-center">
      <div className="w-full max-w-xs flex flex-col items-center gap-4 py-6 bg-bg-main/95 backdrop-blur-md rounded-xl px-5 border border-white/[0.06]">
        <div className="space-y-1.5">
          {icon}
          <h2 className="text-xl font-serif font-black text-white">{gameName}</h2>
          <p className="text-xs text-text-secondary">{subtitle}</p>
        </div>
        <button
          onClick={onEnter}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/20 active:scale-95"
        >
          <Volume2 size={16} className="text-accent" />
          <span className="font-serif font-bold text-accent text-base">{t("enterGame")}</span>
        </button>
        <p className="text-[9px] text-white/50">{t("soundInfo")}</p>
      </div>
    </div>
  );
}
