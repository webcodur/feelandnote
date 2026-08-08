"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";

import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import {
  CategoryDetail,
  TotalScoreCard,
  TranshistoricityInfoModal,
  sortCategoriesByScore,
  sumBaseScore,
} from "@/components/features/influence";
import { DetailToggle, ScoreBar } from "@/components/ui";

interface Props {
  data: CelebInfluenceDetail;
}

export default function CelebInfluenceSection({ data }: Props) {
  const t = useTranslations("profilePage.influence");
  const [isScaleOpen, setIsScaleOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const baseScore = sumBaseScore(data);

  // 인물의 강세부터 읽히도록 점수 순으로 세운다 (0점도 어둡게 그대로 선다)
  const rankedCategories = sortCategoriesByScore(data);

  return (
    <div className="space-y-5">
      {/* 1. 상단 영역: 종합 영향력 히어로 섹션 */}
      <section className="w-full">
        <TotalScoreCard data={data} />
      </section>

      {/* 역량·덕목·성향 탭과 같은 자리·같은 단추 — 누르기 전에는 수치만 보인다 */}
      <DetailToggle open={showDetail} onToggle={() => setShowDetail((v) => !v)} />

      {/* 2. 중단 영역: 시대초월성 — 40점 눈금 한 줄 + 아래 해설 */}
      <section className="border-b border-white/10 px-1 pb-3">
        <ScoreBar
          thick
          label={
            /* 40점 척도의 뜻과 대표 인물은 눌러서 펼쳐 본다 */
            <button
              type="button"
              onClick={() => setIsScaleOpen(true)}
              aria-label={t("transhistoricityInfo.title")}
              className="group flex items-center gap-1.5 font-serif text-lg font-extrabold tracking-wide text-text-primary hover:text-accent"
            >
              {t("transhistoricity")}
              <Info size={14} className="group-hover:text-accent" />
            </button>
          }
          value={data.transhistoricity || 0}
          max={40}
          maxText={t("scoreOutOf", { max: 40 })}
          description={
            showDetail &&
            data.transhistoricity_exp && (
              <span className="block animate-fade-in">
                {(data.translationFallbacks ?? []).includes("transhistoricity") && (
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-amber-200/65">
                    {t("originalKorean")}
                  </span>
                )}
                {data.transhistoricity_exp}
              </span>
            )
          }
        />
      </section>

      {/* 3. 하단 영역: 일반 점수 (레몬 노랑 차트 아이콘 헤더 + 6개 영역 리스트 및 총점 22/60점 표출) */}
      <section className="space-y-3.5">
        <div className="border-b border-white/10 px-1 pb-3">
          <ScoreBar
            thick
            label={
              <span className="font-serif text-lg font-extrabold tracking-wide text-text-primary">
                {t("generalScore")}
              </span>
            }
            value={baseScore}
            max={60}
            maxText={t("scoreOutOf", { max: 60 })}
          />
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-1 md:grid-cols-2">
          {rankedCategories.map((category) => (
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
              showDescription={showDetail}
            />
          ))}
        </div>
      </section>

      <TranshistoricityInfoModal
        isOpen={isScaleOpen}
        onClose={() => setIsScaleOpen(false)}
        value={data.transhistoricity || 0}
      />
    </div>
  );
}
