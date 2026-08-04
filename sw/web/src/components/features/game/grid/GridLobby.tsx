"use client";

import { Grid3X3, Sparkles, Brain, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface Props {
  canStart: boolean;
  onStart: () => void;
}

export default function GridLobby({ canStart, onStart }: Props) {
  const t = useTranslations("gameGrid");

  return (
    <div className="m-auto w-full max-w-3xl py-3 text-center sm:py-6">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-indigo-400/35 bg-indigo-500/10 text-indigo-400 shadow-[0_0_40px_-14px_rgba(99,102,241,0.8)] sm:mb-5 sm:h-16 sm:w-16">
        <Grid3X3 className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
      </div>
      <p className="mb-1.5 font-cinzel text-[9px] font-bold tracking-[0.25em] text-indigo-300/70 sm:mb-2 sm:text-[10px] sm:tracking-[0.28em]">
        CROSSING GRID
      </p>
      <h1 className="font-serif text-2xl font-black text-text-primary sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-text-secondary sm:mt-3 sm:text-base">
        {t("intro")}
      </p>

      {/* 모바일 규칙 요약 */}
      <div className="mx-auto mt-4 max-w-md rounded-lg border border-indigo-400/15 bg-bg-main/65 px-3 py-2 text-xs text-text-secondary sm:hidden">
        {t("mobileRuleSummary")}
      </div>

      <button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        className="mt-5 inline-flex min-h-12 min-w-52 items-center justify-center gap-2 rounded-xl border border-indigo-400/45 bg-indigo-500/15 px-7 py-3 font-serif text-base font-black text-indigo-300 shadow-[0_12px_32px_-18px_rgba(99,102,241,0.8)] hover:border-indigo-400 hover:bg-indigo-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-text-secondary sm:mt-6 sm:py-3.5"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {t("startGame")}
      </button>

      {!canStart && (
        <p className="mt-3 text-xs text-red-300">{t("notEnoughData")}</p>
      )}

      {/* 규칙 카드 (데스크톱) */}
      <div className="mx-auto mt-7 hidden max-w-2xl grid-cols-3 gap-3 text-left sm:grid">
        <RuleCard icon={<Grid3X3 />} title={t("rules.gridTitle")} body={t("rules.gridBody")} />
        <RuleCard icon={<Brain />} title={t("rules.recallTitle")} body={t("rules.recallBody")} />
        <RuleCard icon={<Target />} title={t("rules.scoreTitle")} body={t("rules.scoreBody")} />
      </div>
    </div>
  );
}

function RuleCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-bg-main/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
      <h2 className="font-serif text-sm font-bold text-text-primary">{title}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{body}</p>
    </div>
  );
}
