"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Hourglass, BarChart3 } from "lucide-react";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { INFLUENCE_CATEGORIES } from "@/constants/influence";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import {
  CategoryDetail,
  TotalScoreCard
} from "@/components/features/influence";

interface Props {
  data: CelebInfluenceDetail;
}

export default function ProfileInfluenceSection({ data }: Props) {
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
    <ClassicalBox className="p-4 md:p-6 bg-bg-card/40 shadow-2xl border-accent-dim/20">
      <div className="flex justify-center mb-6">
        <DecorativeLabel label={t("label")} />
      </div>

      <div className="space-y-5">
        {/* 1. 상단 영역: 종합 영향력 히어로 섹션 */}
        <section className="w-full">
          <TotalScoreCard data={data} />
        </section>

        {/* 2. 중단 영역: 시대초월성 (라벨 우측 해설 배치 + 통일된 레드 점수 칩 한 줄 완성) */}
        <section className="space-y-1">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1 gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                <Hourglass size={15} className="text-rose-400" />
              </div>
              <h3 className="font-serif text-lg font-extrabold tracking-wide text-text-primary shrink-0">
                {t("transhistoricity")}
              </h3>

              {/* 라벨 우측에 인물 고유 시대초월성 해설 배치 */}
              {data.transhistoricity_exp && (
                <span className="min-w-0 truncate border-l border-white/15 pl-2.5 text-xs font-medium text-text-primary/90 md:text-sm">
                  {(data.translationFallbacks ?? []).includes("transhistoricity") && (
                    <span className="me-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/65">
                      {t("originalKorean")}
                    </span>
                  )}
                  {data.transhistoricity_exp}
                </span>
              )}
            </div>

            {/* 통일된 시대초월성 점수 칩 (40점 만점 대비 n% 차오르는 뱃지 - 레드 톤) */}
            <div className="relative inline-flex items-baseline gap-1 px-3 py-1 rounded-lg bg-black/80 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)] overflow-hidden shrink-0">
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
          <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-yellow-400/15 border border-yellow-300/30 flex items-center justify-center text-yellow-300 shrink-0 shadow-[0_0_10px_rgba(253,224,71,0.2)]">
                <BarChart3 size={15} className="text-yellow-300" />
              </div>
              <h3 className="font-serif text-lg font-extrabold tracking-wide text-text-primary">
                {t("generalScore")}
              </h3>
            </div>

            {/* 통일된 일반 점수 칩 (60점 만점 대비 n% 차오르는 뱃지 - 레몬 노랑 톤) */}
            <div className="relative inline-flex items-baseline gap-1 px-3 py-1 rounded-lg bg-black/80 border border-yellow-300/40 shadow-[0_0_10px_rgba(253,224,71,0.2)] overflow-hidden shrink-0">
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
          <div className="flex flex-col items-center justify-center p-1.5 rounded-2xl bg-black/20 border border-white/5 relative overflow-hidden">
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
            {INFLUENCE_CATEGORIES.map((cat) => (
              <CategoryDetail
                key={cat.key}
                category={cat}
                value={data[cat.key as keyof CelebInfluenceDetail] as number}
                explanation={data[`${cat.key}_exp` as keyof CelebInfluenceDetail] as string | null}
                isTranslationFallback={(data.translationFallbacks ?? []).includes(cat.key)}
                isExpanded={expanded === cat.key}
                onToggle={() => setExpanded(expanded === cat.key ? null : cat.key)}
                isHovered={hovered === cat.key}
                onMouseEnter={() => setHovered(cat.key)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </div>
        </section>
      </div>
    </ClassicalBox>
  );
}
