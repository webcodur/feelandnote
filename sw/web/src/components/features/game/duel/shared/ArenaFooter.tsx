/*
  파일명: components/features/game/duel/shared/ArenaFooter.tsx
  기능: 미니게임 공통 하단 바
  책임: 기권 버튼 + 안내 텍스트를 하단에 배치한다.
*/

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface Props {
  onForfeit: () => void;
  hint?: ReactNode;
}

export default function ArenaFooter({ onForfeit, hint }: Props) {
  const t = useTranslations("shared.game.duel");
  return (
    <div
      className="shrink-0 px-3 pb-4 pt-2 md:px-5 md:pb-5 safe-area-bottom flex items-center justify-between"
      style={{ background: "linear-gradient(to top, rgba(14,13,10,0.95), rgba(14,13,10,0.7) 60%, transparent)" }}
    >
      <div className="flex-1 text-center">
        {hint && (
          <p className="text-xs font-serif text-white/25">{hint}</p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onForfeit(); }}
        className="shrink-0 text-[11px] text-white/30 hover:text-white/50 transition-colors px-2 py-1 rounded"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {t("forfeit")}
      </button>
    </div>
  );
}
