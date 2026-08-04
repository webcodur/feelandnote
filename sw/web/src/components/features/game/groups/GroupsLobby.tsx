"use client";

/**
 * 넷씩 넷 (Groups) — 로비: 규칙 설명 + 시작 버튼
 */

import { useTranslations } from "next-intl";

interface Props {
  dateKey: string;
  canStart: boolean;
  onStart: () => void;
}

export default function GroupsLobby({ dateKey, canStart, onStart }: Props) {
  const t = useTranslations("gameGroups");

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-white font-cinzel tracking-wide">
        {t("title")}
      </h1>

      <p className="text-white/60 text-sm leading-relaxed">
        {t("description")}
      </p>

      <div className="flex flex-col gap-2 text-left w-full bg-white/5 rounded-lg px-4 py-3">
        <h3 className="text-xs uppercase tracking-widest text-white/40 mb-1">{t("howToPlay")}</h3>
        <p className="text-sm text-white/70">{t("rule1")}</p>
        <p className="text-sm text-white/70">{t("rule2")}</p>
        <p className="text-sm text-white/70">{t("rule3")}</p>
      </div>

      <div className="text-xs text-white/30">
        {t("todayPuzzle", { date: dateKey })}
      </div>

      <button
        onClick={onStart}
        disabled={!canStart}
        className="px-8 py-3 rounded-xl text-sm font-bold
                   bg-white text-black
                   hover:bg-white/90 hover:scale-105
                   disabled:opacity-30 disabled:cursor-not-allowed
                   transition-colors"
      >
        {t("start")}
      </button>

      {!canStart && (
        <p className="text-xs text-red-400/80">{t("notEnoughData")}</p>
      )}
    </div>
  );
}
