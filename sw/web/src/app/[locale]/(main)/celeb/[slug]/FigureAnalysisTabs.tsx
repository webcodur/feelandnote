/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 분석 탭(스펙트럼·영향력)
 * - 목차 위치: analysis (spectrum/influence)
 * - 데이터: item.children/spectrumData/influenceData props
 * - 함께 보기: SpectrumSection.tsx, CelebInfluenceSection.tsx, ArchiveTabsHeader.tsx
 * ───────────────────────────────────────────── */
"use client";

import CelebSectionSkeleton from "@/components/features/celeb/CelebSectionSkeleton";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { InfluenceExplorerData } from "@/actions/home/getInfluenceExplorer";
import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import CelebInfluenceSection from "./CelebInfluenceSection";
import type { ServiceItem } from "./celebServiceItems";
import SpectrumSection from "./SpectrumSection";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import { getCelebInfluence } from "@/actions/home/getCelebInfluence";
import { getInfluenceExplorer } from "@/actions/home/getInfluenceExplorer";
import { RetryBlock } from "@/components/ui/pending";

type AnalysisTab = "spectrum" | "influence";

const TAB_KEYS: readonly AnalysisTab[] = ["spectrum", "influence"];

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
  const t = useTranslations("celebPage");
  const childItems = item.children ?? [];
  // 자료가 있는 탭만 목록에 남는다. 없는 탭을 기다리다 빈 상자를 그리지 않는다
  const visibleTabs = TAB_KEYS.flatMap((key) => {
    const child = childItems.find((candidate) => candidate.key === key);
    return child ? [{ key, item: child }] : [];
  });
  const [tab, setTab] = useState<AnalysisTab>(
    () => visibleTabs[0]?.key ?? "spectrum",
  );
  const active = visibleTabs.find(({ key }) => key === tab) ?? visibleTabs[0];
  if (!active) return null;

  const activeKey = active.key;
  const tabs: ArchiveTabItem<AnalysisTab>[] = visibleTabs.map(
    ({ key, item: child }) => ({ key, label: child.label }),
  );

  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={activeKey}
        onChange={setTab}
        columnsClassName={visibleTabs.length === 1 ? "grid-cols-1" : "grid-cols-2"}
        ariaLabel={t("analysis")}
      />

      <AnimatedHeight duration={350} className="w-full">
        <div
          id={`archive-panel-${activeKey}`}
          role="tabpanel"
          aria-labelledby={`archive-tab-${activeKey}`}
        >
          {activeKey === "spectrum" && spectrumData?.targetSpectrum && (
            <SpectrumSection
              spectrum={spectrumData.targetSpectrum}
              spectrumJsonb={spectrumData.targetSpectrumJsonb}
              matchesByCategory={spectrumData.matchesByCategory}
              highlights={spectrumData.highlights}
              population={spectrumData.population}
            />
          )}

          {activeKey === "influence" && (
            <InfluencePanel celebId={celebId} initialData={influenceData} initialExplorer={influenceExplorerData} />
          )}
        </div>
      </AnimatedHeight>
    </div>
  );
}

function InfluencePanel({ celebId, initialData, initialExplorer }: {
  celebId: string;
  initialData: CelebInfluenceDetail | null;
  initialExplorer: InfluenceExplorerData | null;
}) {
  const locale = useLocale();
  const [result, setResult] = useState(initialData ? { data: initialData, explorer: initialExplorer } : null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (initialData) return;
    let active = true;
    Promise.all([getCelebInfluence(celebId, locale), getInfluenceExplorer(celebId, locale)])
      .then(([data, explorer]) => {
        if (!active) return;
        if (data) setResult({ data, explorer });
        else setFailed(true);
      }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [celebId, locale, initialData, attempt]);
  if (failed) return <RetryBlock onRetry={() => { setFailed(false); setAttempt(v => v + 1); }} />;
  if (!result) return <CelebSectionSkeleton kind="influence" />;
  return <CelebInfluenceSection data={result.data} explorerData={result.explorer} />;
}
