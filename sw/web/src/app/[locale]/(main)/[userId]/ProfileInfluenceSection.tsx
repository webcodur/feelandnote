"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, DetailToggle, ScoreBar } from "@/components/ui";
import {
  CategoryDetail,
  TotalScoreCard,
  TranshistoricityInfoModal,
  sortCategoriesByScore,
  sumBaseScore,
} from "@/components/features/influence";

interface Props {
  data: CelebInfluenceDetail;
}

export default function ProfileInfluenceSection({ data }: Props) {
  const t = useTranslations("profilePage.influence");
  const [isScaleOpen, setIsScaleOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const baseScore = sumBaseScore(data);

  // 강세 영역이 먼저 읽히도록 점수 순 배치 (0점도 어둡게 그대로 선다)
  const rankedCategories = sortCategoriesByScore(data);

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
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-amber-200/65">
                      {t("originalKorean")}
                    </span>
                  )}
                  {data.transhistoricity_exp}
                </span>
              )
            }
          />
        </section>

        {/* 3. 하단 영역: 일반 점수 — 60점 눈금 + 영역별 눈금 */}
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
            {rankedCategories.map((cat) => (
              <CategoryDetail
                key={cat.key}
                category={cat}
                value={cat.value}
                explanation={data[`${cat.key}_exp` as keyof CelebInfluenceDetail] as string | null}
                isTranslationFallback={(data.translationFallbacks ?? []).includes(cat.key)}
                showDescription={showDetail}
              />
            ))}
          </div>
        </section>
      </div>

      <TranshistoricityInfoModal
        isOpen={isScaleOpen}
        onClose={() => setIsScaleOpen(false)}
        value={data.transhistoricity || 0}
      />
    </ClassicalBox>
  );
}
