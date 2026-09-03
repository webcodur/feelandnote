/* ─────────────────────────────────────────────
 * [celeb 상세] faction — 세력도감 넘김
 * - 목차 위치: connections > faction
 * - 데이터: factions/currentCelebId props
 * - 함께 보기: PeopleAndEraTabs.tsx, detail/CelebConnectionsDeferred.tsx
 * ───────────────────────────────────────────── */
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { FeaturedTag } from "@/actions/home/getFeaturedTags";
import type { Locale } from "@/types/locale";

const FactionShowcase = dynamic(
  () => import("@/components/features/landing/FactionShowcase"),
  {
    loading: () => (
      <div
        className="h-[560px] w-full animate-pulse rounded-[2px] bg-white/[0.025]"
        aria-hidden
      />
    ),
  },
);

interface FactionSectionProps {
  factions: FeaturedTag[];
  currentCelebId: string;
}

export default function FactionSection({
  factions,
  currentCelebId,
}: FactionSectionProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("celebPage");
  const [activeIndex, setActiveIndex] = useState(0);

  if (factions.length === 0) return null;

  const safeIndex = Math.min(activeIndex, factions.length - 1);
  const activeFaction = factions[safeIndex];
  const activeFactionName = locale === "en"
    ? activeFaction.name_en?.trim() || activeFaction.name
    : activeFaction.name;
  const hasPager = factions.length > 1;
  const stepPage = (delta: number) => {
    setActiveIndex((safeIndex + delta + factions.length) % factions.length);
  };

  return (
    // 모드줄 다음 요소라 위를 소폭 떼어 시작한다
    <div className="space-y-6 pt-4 md:pt-6">
      <div className="border-b border-white/10 pb-4">
        <div className="mx-auto flex w-full min-w-0 items-center justify-center gap-3 whitespace-nowrap">
          <button
            type="button"
            onClick={() => stepPage(-1)}
            disabled={!hasPager}
            aria-label={t("factionPagerPrev")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-text-secondary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="flex min-w-0 items-baseline justify-center gap-2.5">
            <span className="shrink-0 text-[11px] font-black tabular-nums tracking-[0.08em] text-accent/80">
              #{safeIndex + 1}
            </span>
            <span
              className="max-w-[min(42vw,14rem)] truncate font-serif text-sm font-bold text-text-primary"
              title={activeFactionName}
            >
              {activeFactionName}
            </span>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-text-secondary/70">
              {t("factionPagerMemberCount", { count: activeFaction.celebs.length })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => stepPage(1)}
            disabled={!hasPager}
            aria-label={t("factionPagerNext")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-text-secondary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowRight size={17} />
          </button>
        </div>
      </div>

      <FactionShowcase
        key={activeFaction.id}
        activeTag={activeFaction}
        locale={locale}
        initialCelebId={currentCelebId}
        variant="embedded"
        atlasLinkLabel={t("factionOpen")}
      />
    </div>
  );
}
