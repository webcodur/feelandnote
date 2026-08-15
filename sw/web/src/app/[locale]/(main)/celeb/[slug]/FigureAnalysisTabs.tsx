"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { InfluenceExplorerData } from "@/actions/home/getInfluenceExplorer";
import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import CelebInfluenceSection from "./CelebInfluenceSection";
import type { ServiceItem } from "./celebServiceItems";
import SpectrumSection from "./SpectrumSection";

type AnalysisTab = "spectrum" | "influence";

const TAB_KEYS: readonly AnalysisTab[] = ["spectrum", "influence"];

interface Props {
  item: ServiceItem;
  spectrumData: SimilarByCelebResult | null;
  influenceData: CelebInfluenceDetail | null;
  influenceExplorerData: InfluenceExplorerData | null;
}

export default function FigureAnalysisTabs({
  item,
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
        mobileTextClassName="text-lg"
      />

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

        {activeKey === "influence" && influenceData && (
          <CelebInfluenceSection
            data={influenceData}
            explorerData={influenceExplorerData}
          />
        )}
      </div>
    </div>
  );
}
