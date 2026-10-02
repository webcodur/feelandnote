/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 영향력·스펙트럼을 함께 보여주는 분석 구획
 * - 목차 위치: analysis (spectrum/influence)
 * - 데이터: item.children/spectrumData/influenceData props
 * - 함께 보기: SpectrumSection.tsx, CelebInfluenceSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import CelebSectionSkeleton from "@/components/features/celeb/CelebSectionSkeleton";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { InfluenceExplorerData } from "@/actions/home/getInfluenceExplorer";
import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";

import CelebInfluenceSection from "./CelebInfluenceSection";
import type { ServiceItem } from "./celebServiceItems";
import SpectrumSection from "./SpectrumSection";
import { getCelebInfluence } from "@/actions/home/getCelebInfluence";
import { getInfluenceExplorer } from "@/actions/home/getInfluenceExplorer";
import { RetryBlock } from "@/components/ui/pending";
import InfluenceComparisonButtons from "./InfluenceComparisonButtons";
import { ComparisonGroup } from "./spectrum/SpectrumPanels";

interface Props {
  item: ServiceItem;
  celebId: string;
  spectrumData: SimilarByCelebResult | null;
  influenceData: CelebInfluenceDetail | null;
  influenceExplorerData: InfluenceExplorerData | null;
}

export default function FigureAnalysisTabs({
  item,
  celebId,
  spectrumData,
  influenceData,
  influenceExplorerData,
}: Props) {
  const childItems = item.children ?? [];
  const influenceItem = childItems.find((child) => child.key === "influence");
  const spectrumItem = childItems.find((child) => child.key === "spectrum");
  const { result, failed, retry } = useInfluenceData({ celebId, initialData: influenceData, initialExplorer: influenceExplorerData, enabled: !!influenceItem });
  const hasSpectrum = !!spectrumItem && !!spectrumData?.targetSpectrum;
  if (!influenceItem && !spectrumItem) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {influenceItem && (
        <section aria-label={influenceItem.label} className="space-y-4">
          {failed ? <RetryBlock onRetry={retry} /> : result ? <CelebInfluenceSection data={result.data} explorerData={result.explorer} /> : <CelebSectionSkeleton kind="influence" />}
        </section>
      )}
      {spectrumItem && spectrumData?.targetSpectrum && (
        <section aria-label={spectrumItem.label}>
          <SpectrumSection
            spectrum={spectrumData.targetSpectrum}
            spectrumJsonb={spectrumData.targetSpectrumJsonb}
            matchesByCategory={spectrumData.matchesByCategory}
            highlights={spectrumData.highlights}
            population={spectrumData.population}
            influenceExplorerData={influenceItem ? result?.explorer : null}
          />
        </section>
      )}
      {!hasSpectrum && influenceItem && result?.explorer && (
        <ComparisonGroup title={influenceItem.label} columns={2}>
          <InfluenceComparisonButtons data={result.explorer} />
        </ComparisonGroup>
      )}
    </div>
  );
}

function useInfluenceData({ celebId, initialData, initialExplorer, enabled }: {
  celebId: string;
  initialData: CelebInfluenceDetail | null;
  initialExplorer: InfluenceExplorerData | null;
  enabled: boolean;
}) {
  const locale = useLocale();
  const [result, setResult] = useState(initialData ? { data: initialData, explorer: initialExplorer } : null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (initialData || !enabled) return;
    let active = true;
    Promise.all([getCelebInfluence(celebId, locale), getInfluenceExplorer(celebId, locale)])
      .then(([data, explorer]) => {
        if (!active) return;
        if (data) setResult({ data, explorer });
        else setFailed(true);
      }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [celebId, locale, initialData, attempt, enabled]);
  return { result, failed, retry: () => { setFailed(false); setAttempt(v => v + 1); } };
}
