"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import {
  CategoryDetail,
  RadarChart,
  TopInfluenceTags,
  TranshistoricityGauge,
} from "@/components/features/influence";
import { INFLUENCE_CATEGORIES } from "@/constants/influence";

interface Props {
  data: CelebInfluenceDetail;
}

export default function CelebInfluenceSection({ data }: Props) {
  const t = useTranslations("profilePage.influence");
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:gap-6">
        <div className="effect-engraved flex min-w-0 flex-col items-center justify-center border border-stone-border bg-stone-heavy px-3 py-5">
          <div className="mb-1 flex items-baseline gap-1">
            <span className="font-serif text-4xl font-black text-accent">
              {data.total_score}
            </span>
            <span className="text-sm text-text-tertiary">/ 100</span>
          </div>
          <RadarChart data={data} size={210} />
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-5">
          <TopInfluenceTags data={data} />
          <TranshistoricityGauge value={data.transhistoricity} />
          {data.transhistoricity_exp && (
            <p className="break-keep text-sm leading-relaxed text-text-secondary">
              {data.transhistoricity_exp}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-serif text-sm tracking-wide text-text-primary">
          {t("categoryDetail")}
        </h3>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
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
              isExpanded={expanded === category.key}
              onToggle={() =>
                setExpanded((current) =>
                  current === category.key ? null : category.key,
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
