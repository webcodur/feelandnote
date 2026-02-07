"use client";

import { useState } from "react";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { INFLUENCE_CATEGORIES } from "@/constants/influence";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import { RadarChart, TranshistoricityGauge, CategoryDetail } from "@/components/features/influence";

interface ProfileInfluenceSectionProps {
  data: CelebInfluenceDetail;
}

export default function ProfileInfluenceSection({ data }: ProfileInfluenceSectionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
      <div className="flex justify-center mb-6 sm:mb-8">
        <DecorativeLabel label="영향력" />
      </div>

      {/* 총점 + 레이더 차트 */}
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="text-center">
          <span className="text-3xl font-black text-accent">{data.total_score}</span>
          <span className="text-sm text-text-tertiary ml-1">/ 100</span>
        </div>
        <div className="p-3 rounded-xl bg-black/20 border border-white/5">
          <RadarChart data={data} size={220} />
        </div>
      </div>

      {/* 시대초월성 */}
      <div className="mb-6 max-w-lg mx-auto">
        <TranshistoricityGauge value={data.transhistoricity} />
        {data.transhistoricity_exp && (
          <p className="text-xs text-text-secondary leading-relaxed text-center mt-2 px-2">{data.transhistoricity_exp}</p>
        )}
      </div>

      {/* 영역별 상세 */}
      <div className="space-y-3 max-w-2xl mx-auto">
        <h3 className="text-sm font-bold text-text-primary px-1">영역별 상세</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {INFLUENCE_CATEGORIES.map((cat) => (
            <CategoryDetail
              key={cat.key}
              category={cat}
              value={data[cat.key as keyof CelebInfluenceDetail] as number}
              explanation={data[`${cat.key}_exp` as keyof CelebInfluenceDetail] as string | null}
              isExpanded={expanded === cat.key}
              onToggle={() => setExpanded(expanded === cat.key ? null : cat.key)}
            />
          ))}
        </div>
      </div>
    </ClassicalBox>
  );
}
