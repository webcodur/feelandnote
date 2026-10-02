"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { InfluenceExplorerData } from "@/actions/home/getInfluenceExplorer";
import { TotalScoreCard, TranshistoricityInfoModal, sortCategoriesByScore } from "@/components/features/influence";
import { Modal, ScoreBar } from "@/components/ui";
import StatReasonModal from "./StatReasonModal";

interface Props {
  data: CelebInfluenceDetail;
  explorerData: InfluenceExplorerData | null;
}

const STAT_ROW_CLASS = "min-h-8 rounded-control px-1 text-left hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function CelebInfluenceSection({ data, explorerData }: Props) {
  const isEn = useLocale() === "en";
  const t = useTranslations("profilePage.influence");
  const tc = useTranslations("celebPage");
  const [isEraOpen, setIsEraOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const categories = useMemo(() => sortCategoriesByScore(data), [data]);
  const rankedData = useMemo(() => explorerData ? {
    ...data,
    ranking: explorerData.current.ranking,
    rankedTotal: explorerData.total,
    percentile: explorerData.current.percentile,
  } : data, [data, explorerData]);
  const explanationItems = categories.map((category) => ({
    key: category.key,
    label: t(`categories.${category.key}`),
    value: category.value,
    max: 10,
    explanation: data[`${category.key}_exp` as keyof CelebInfluenceDetail] as string | null,
  }));
  const activeExplanation = explanationItems.find((item) => item.key === selected);

  return (
    <div className="space-y-3">
      <div>
        <div className="mx-auto max-w-xl">
          <TotalScoreCard data={rankedData} onOpenExplanation={() => setShowExplanation(true)} />
        </div>
        <div className="mt-2">
          <button type="button" aria-haspopup="dialog" aria-pressed={isEraOpen} onClick={() => setIsEraOpen(true)} className={`${STAT_ROW_CLASS} w-full`}>
            <ScoreBar insetValue prominent selected={isEraOpen} className="py-1" label={t("explorer.shortFields.transhistoricity")} labelClassName={isEn ? "w-[5.5rem]" : "w-10"} value={data.transhistoricity || 0} max={40} maxText="/ 40" />
          </button>
          <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <button key={category.key} type="button" aria-haspopup="dialog" aria-pressed={selected === category.key} onClick={() => setSelected(category.key)} className={STAT_ROW_CLASS}>
                <ScoreBar insetValue selected={selected === category.key} className="py-1" label={t(`categories.${category.key}`)} labelClassName={isEn ? "w-[5.5rem]" : "w-10"} value={category.value} max={10} maxText="/ 10" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={showExplanation} onClose={() => setShowExplanation(false)} title={`${tc("influence")} · ${tc("analysisExplanation")}`} size="xl" stickyHeader animateHeight={false}>
        <div className="space-y-6 p-5">
          {explanationItems.map((item) => (
            <div key={item.key} className="space-y-2">
              <ScoreBar label={item.label} value={item.value} max={item.max} maxText={t("scoreOutOf", { max: item.max })} />
              {(data.translationFallbacks ?? []).includes(item.key) && (
                <p className="text-sm text-text-tertiary">{t("originalKorean")}</p>
              )}
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">{item.explanation || t("noDetails")}</p>
            </div>
          ))}
        </div>
      </Modal>

      {activeExplanation && <StatReasonModal label={activeExplanation.label} value={activeExplanation.value} max={activeExplanation.max} reason={activeExplanation.explanation} empty={t("noDetails")} isTranslationFallback={(data.translationFallbacks ?? []).includes(activeExplanation.key)} onClose={() => setSelected(null)} />}

      <TranshistoricityInfoModal isOpen={isEraOpen} onClose={() => setIsEraOpen(false)} value={data.transhistoricity || 0} explanation={data.transhistoricity_exp} isTranslationFallback={(data.translationFallbacks ?? []).includes("transhistoricity")} />
    </div>
  );
}
