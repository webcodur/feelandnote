/*
  파일명: components/features/game/shared/GameLobbySubmenu.tsx
  기능: 게임 로비 서브메뉴 래퍼
  책임: 외곽 래퍼 + 헤더(뒤로가기·아이콘·제목·설명) + 하단 돌아가기 + 키보드 네비게이션을 단일 컴포넌트로 제공.
*/
"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { useLobbyKeyboard } from "./useLobbyKeyboard";

interface GameLobbySubmenuProps {
  onBack: () => void;
  icon: ReactNode;
  title: string;
  desc: string;
  longDesc?: boolean;
  showBackBottom?: boolean;
  children: ReactNode;
}

export default function GameLobbySubmenu({ onBack, icon, title, desc, longDesc, showBackBottom, children }: GameLobbySubmenuProps) {
  const t = useTranslations("shared.game.ui");
  const kbRef = useLobbyKeyboard(onBack);

  return (
    <div ref={kbRef} className="lg:ml-auto lg:w-1/3 lg:min-w-[360px]">
      <div className="flex flex-col animate-fade-in bg-bg-main/95 backdrop-blur-md lg:rounded-l-2xl lg:border-l lg:border-white/[0.06]">

        {/* 헤더 */}
        <div className={`relative text-center py-6 px-4${longDesc ? " mb-1" : ""}`}>
          <button
            onClick={onBack}
            className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-xs"
          >
            <ArrowLeft size={12} />
            {t("back")}
          </button>
          <div className="mx-auto mb-1.5 flex justify-center">{icon}</div>
          <h2 className="text-xl font-serif font-black text-white tracking-wide">{title}</h2>
          <p className={`text-xs text-text-tertiary mt-1${longDesc ? " max-w-md mx-auto leading-relaxed" : ""}`}>
            {desc}
          </p>
        </div>

        {children}

        {showBackBottom && (
          <div className="text-center py-4 border-t border-white/[0.06]">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary text-xs"
            >
              <ArrowLeft size={12} />
              {t("backToLobby")}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
