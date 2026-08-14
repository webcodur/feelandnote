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
import UnavailableSectionGuide from "./UnavailableSectionGuide";

type AnalysisTab = "spectrum" | "influence";

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
  const spectrumItem = childItems.find((child) => child.key === "spectrum");
  const influenceItem = childItems.find((child) => child.key === "influence");
  const [tab, setTab] = useState<AnalysisTab>(() => {
    if (spectrumItem?.ready) return "spectrum";
    if (influenceItem?.ready) return "influence";
    return "spectrum";
  });

  if (!spectrumItem || !influenceItem) return null;

  const tabs: ArchiveTabItem<AnalysisTab>[] = [
    {
      key: "spectrum",
      label: spectrumItem.label,
    },
    {
      key: "influence",
      label: influenceItem.label,
    },
  ];

  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={tab}
        onChange={setTab}
        columnsClassName="grid-cols-2"
        ariaLabel={t("analysis")}
        mobileTextClassName="text-lg"
      />

      <div
        id={`archive-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`archive-tab-${tab}`}
      >
        {tab === "spectrum" && (
          spectrumItem.ready && spectrumData?.targetSpectrum ? (
            <SpectrumSection
              spectrum={spectrumData.targetSpectrum}
              spectrumJsonb={spectrumData.targetSpectrumJsonb}
              matchesByCategory={spectrumData.matchesByCategory}
              highlights={spectrumData.highlights}
              population={spectrumData.population}
            />
          ) : (
            <UnavailableSectionGuide item={spectrumItem} />
          )
        )}

        {tab === "influence" && (
          influenceItem.ready && influenceData ? (
            <CelebInfluenceSection
              data={influenceData}
              explorerData={influenceExplorerData}
            />
          ) : (
            <UnavailableSectionGuide item={influenceItem} />
          )
        )}
      </div>
    </div>
  );
}
