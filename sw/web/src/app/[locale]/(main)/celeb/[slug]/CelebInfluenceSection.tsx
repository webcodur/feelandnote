"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Hourglass, BarChart3, Info } from "lucide-react";

import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import {
  CategoryDetail,
  EmptyCategoryRow,
  TotalScoreCard,
  TranshistoricityInfoModal,
  sortCategoriesByScore,
  sumBaseScore,
} from "@/components/features/influence";

interface Props {
  data: CelebInfluenceDetail;
}

export default function CelebInfluenceSection({ data }: Props) {
  const t = useTranslations("profilePage.influence");
  const [hovered, setHovered] = useState<string | null>(null);
  const [isScaleOpen, setIsScaleOpen] = useState(false);

  const baseScore = sumBaseScore(data);

  // 인물의 강세부터 읽히도록 점수 순으로 세우고, 0점은 상자 대신 맨 아래 한 줄로 접는다
  const rankedCategories = sortCategoriesByScore(data);
  const scoredCategories = rankedCategories.filter((category) => category.value > 0);
  const emptyCategories = rankedCategories.filter((category) => category.value === 0);

  return (
    <div className="space-y-5">
      {/* 1. 상단 영역: 종합 영향력 히어로 섹션 */}
      <section className="w-full">
        <TotalScoreCard data={data} />
      </section>

      {/* 2. 중단 영역: 시대초월성 (라벨 우측 해설 배치 + 통일된 레드 점수 칩 한 줄 완성) */}
      <section className="space-y-1">
        {/* 좁은 화면에서는 머리글과 점수만 한 줄에 서고 해설이 아래로 내려간다 */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-white/10 px-1 pb-3">
          <div className="order-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent-dim/35 bg-accent/10 text-accent">
            <Hourglass size={18} className="text-accent" />
          </div>
          {/* 40점 척도의 뜻과 대표 인물은 눌러서 펼쳐 본다 */}
          <button
            type="button"
            onClick={() => setIsScaleOpen(true)}
            aria-label={t("transhistoricityInfo.title")}
            className="group order-2 flex shrink-0 items-center gap-1.5 font-serif text-lg font-extrabold tracking-wide text-text-primary hover:text-accent"
          >
            {t("transhistoricity")}
            <Info size={14} className="group-hover:text-accent" />
          </button>

          {data.transhistoricity_exp && (
            <p className="order-4 min-w-0 basis-full text-sm font-medium leading-relaxed text-text-primary/90 break-keep sm:order-3 sm:flex-1 sm:basis-auto sm:border-l sm:border-white/15 sm:pl-2.5">
              {(data.translationFallbacks ?? []).includes("transhistoricity") && (
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-amber-200/65">
                  {t("originalKorean")}
                </span>
              )}
              {data.transhistoricity_exp}
            </p>
          )}

          {/* 통일된 시대초월성 점수 칩 (40점 만점 대비 n% 차오르는 뱃지 - 레드 톤) */}
          <div className="relative order-3 ms-auto inline-flex shrink-0 items-baseline gap-1 overflow-hidden rounded-lg border border-accent-dim/40 bg-black/50 px-3 py-2 sm:order-4">
            <div
              className="absolute left-0 top-0 bottom-0 pointer-events-none bg-accent/15 transition-[width] duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, ((data.transhistoricity || 0) / 40) * 100))}%`,
              }}
            />
            <span className="relative z-10 text-base md:text-lg font-bold text-accent">
              {data.transhistoricity || 0}
            </span>
            <span className="relative z-10 text-xs font-bold">
              {t("scoreOutOf", { max: 40 })}
            </span>
          </div>
        </div>

      </section>

      {/* 3. 하단 영역: 일반 점수 (레몬 노랑 차트 아이콘 헤더 + 6개 영역 리스트 및 총점 22/60점 표출) */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-white/10 px-1 pb-3">
          <div className="order-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent-dim/35 bg-accent/10 text-accent">
            <BarChart3 size={18} className="text-accent" />
          </div>
          <h3 className="order-2 shrink-0 font-serif text-lg font-extrabold tracking-wide text-text-primary">
            {t("generalScore")}
          </h3>

          {/* 시대초월성의 해설이 놓이는 자리에, 여기서는 여섯 영역이 어떻게 더해졌는지 보인다 */}
          <p className="order-4 min-w-0 basis-full text-sm font-semibold tabular-nums leading-relaxed text-text-secondary sm:order-3 sm:flex-1 sm:basis-auto sm:border-l sm:border-white/15 sm:pl-2.5">
            {rankedCategories.map((category, index) => (
              <span key={category.key}>
                {index > 0 && <span className="mx-1.5 font-medium">+</span>}
                {category.value}
              </span>
            ))}
          </p>

          {/* 통일된 일반 점수 칩 (60점 만점 대비 n% 차오르는 뱃지 - 레몬 노랑 톤) */}
          <div className="relative order-3 ms-auto inline-flex shrink-0 items-baseline gap-1 overflow-hidden rounded-lg border border-accent-dim/40 bg-black/50 px-3 py-2 sm:order-4">
            <div
              className="absolute left-0 top-0 bottom-0 pointer-events-none bg-accent/15 transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, (baseScore / 60) * 100))}%` }}
            />
            <span className="relative z-10 text-base md:text-lg font-bold text-accent">{baseScore}</span>
            <span className="relative z-10 text-xs font-bold">
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
            hoveredCategory={hovered}
            onHoverCategory={setHovered}
          />
        </div>
        */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {scoredCategories.map((category) => (
            <CategoryDetail
              key={category.key}
              category={category}
              value={category.value}
              explanation={
                data[
                  `${category.key}_exp` as keyof CelebInfluenceDetail
                ] as string | null
              }
              isTranslationFallback={(data.translationFallbacks ?? []).includes(category.key)}
              isHovered={hovered === category.key}
              onMouseEnter={() => setHovered(category.key)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </div>

        <EmptyCategoryRow categories={emptyCategories} />
      </section>

      <TranshistoricityInfoModal
        isOpen={isScaleOpen}
        onClose={() => setIsScaleOpen(false)}
        value={data.transhistoricity || 0}
      />
    </div>
  );
}
