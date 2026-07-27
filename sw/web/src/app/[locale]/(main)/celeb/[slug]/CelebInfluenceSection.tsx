"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Hourglass, BarChart3 } from "lucide-react";

import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import {
  CategoryDetail,
  TotalScoreCard,
} from "@/components/features/influence";
import { INFLUENCE_CATEGORIES } from "@/constants/influence";

interface Props {
  data: CelebInfluenceDetail;
}

export default function CelebInfluenceSection({ data }: Props) {
  const t = useTranslations("profilePage.influence");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const baseScore =
    (data.political || 0) +
    (data.strategic || 0) +
    (data.tech || 0) +
    (data.social || 0) +
    (data.economic || 0) +
    (data.cultural || 0);

  return (
    <div className="space-y-5">
      {/* 1. 상단 영역: 종합 영향력 히어로 섹션 */}
      <section className="w-full">
        <TotalScoreCard data={data} />
      </section>

      {/* 2. 중단 영역: 시대초월성 (라벨 우측 해설 배치 + 통일된 레드 점수 칩 한 줄 완성) */}
      <section className="space-y-1">
        <div className="flex flex-col gap-3 border-b border-white/10 px-1 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/15 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                <Hourglass size={18} className="text-rose-400" />
              </div>
              <h3 className="font-serif text-lg font-extrabold tracking-wide text-text-primary">
                {t("transhistoricity")}
              </h3>
            </div>

            {data.transhistoricity_exp && (
              <p className="mt-2 border-l border-white/15 pl-3 text-sm font-medium leading-relaxed text-text-primary/90 break-keep sm:ml-[50px]">
                {(data.translationFallbacks ?? []).includes("transhistoricity") && (
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-amber-200/65">
                    {t("originalKorean")}
                  </span>
                )}
                {data.transhistoricity_exp}
              </p>
            )}
          </div>

          {/* 통일된 시대초월성 점수 칩 (40점 만점 대비 n% 차오르는 뱃지 - 레드 톤) */}
          <div className="relative inline-flex shrink-0 items-baseline gap-1 overflow-hidden rounded-lg border border-rose-500/40 bg-black/80 px-3 py-2 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <div
              className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 bg-gradient-to-r from-rose-500/55 via-red-400/35 to-rose-300/20"
              style={{
                width: `${Math.min(100, Math.max(0, ((data.transhistoricity || 0) / 40) * 100))}%`,
              }}
            />
            <span className="relative z-10 text-base md:text-lg font-black text-rose-400">
              {data.transhistoricity || 0}
            </span>
            <span className="relative z-10 text-xs font-bold text-text-tertiary">
              {t("scoreOutOf", { max: 40 })}
            </span>
          </div>
        </div>
      </section>

      {/* 3. 하단 영역: 일반 점수 (레몬 노랑 차트 아이콘 헤더 + 6개 영역 리스트 및 총점 22/60점 표출) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-1 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-yellow-300/30 bg-yellow-400/15 text-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.2)]">
              <BarChart3 size={18} className="text-yellow-300" />
            </div>
            <h3 className="font-serif text-lg font-extrabold tracking-wide text-text-primary">
              {t("generalScore")}
            </h3>
          </div>

          {/* 통일된 일반 점수 칩 (60점 만점 대비 n% 차오르는 뱃지 - 레몬 노랑 톤) */}
          <div className="relative inline-flex shrink-0 items-baseline gap-1 overflow-hidden rounded-lg border border-yellow-300/40 bg-black/80 px-3 py-2 shadow-[0_0_10px_rgba(253,224,71,0.2)]">
            <div
              className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 bg-gradient-to-r from-yellow-400/65 via-yellow-300/45 to-yellow-200/25"
              style={{ width: `${Math.min(100, Math.max(0, (baseScore / 60) * 100))}%` }}
            />
            <span className="relative z-10 text-base md:text-lg font-black text-yellow-300">{baseScore}</span>
            <span className="relative z-10 text-xs font-bold text-text-tertiary">
              {t("scoreOutOf", { max: 60 })}
            </span>
          </div>
        </div>

        {/* 주석 처리된 레이더 차트 (공간 낭비 제거) */}
        {/*
        <div className="effect-engraved flex items-center justify-center border border-stone-border bg-stone-heavy p-1.5 rounded-2xl relative overflow-hidden">
          <RadarChart
            data={data}
            size={270}
            activeCategory={expanded}
            onSelectCategory={(key) => setExpanded(key)}
            hoveredCategory={hovered}
            onHoverCategory={setHovered}
          />
        </div>
        */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {INFLUENCE_CATEGORIES.map((category) => (
            <CategoryDetail
              key={category.key}
              category={category}
              value={data[category.key as keyof CelebInfluenceDetail] as number}
              explanation={
                data[
                  `${category.key}_exp` as keyof CelebInfluenceDetail
                ] as string | null
              }
              isTranslationFallback={(data.translationFallbacks ?? []).includes(category.key)}
              isExpanded={expanded === category.key}
              onToggle={() =>
                setExpanded((current) =>
                  current === category.key ? null : category.key,
                )
              }
              isHovered={hovered === category.key}
              onMouseEnter={() => setHovered(category.key)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
