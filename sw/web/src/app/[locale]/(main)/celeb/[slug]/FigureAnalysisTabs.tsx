"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import type { SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import CelebInfluenceSection from "./CelebInfluenceSection";
import type { ServiceItem } from "./celebServiceItems";
import PersonaSection from "./PersonaSection";
import UnavailableSectionGuide from "./UnavailableSectionGuide";

type AnalysisTab = "persona" | "influence";

interface Props {
  item: ServiceItem;
  personaData: SimilarByCelebResult | null;
  influenceData: CelebInfluenceDetail | null;
}

export default function FigureAnalysisTabs({
  item,
  personaData,
  influenceData,
}: Props) {
  const t = useTranslations("celebPage");
  const childItems = item.children ?? [];
  const personaItem = childItems.find((child) => child.key === "persona");
  const influenceItem = childItems.find((child) => child.key === "influence");
  const [tab, setTab] = useState<AnalysisTab>(() => {
    if (personaItem?.ready) return "persona";
    if (influenceItem?.ready) return "influence";
    return "persona";
  });

  if (!personaItem || !influenceItem) return null;

  const tabs: ArchiveTabItem<AnalysisTab>[] = [
    {
      key: "persona",
      label: personaItem.label,
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
        {tab === "persona" && (
          personaItem.ready && personaData?.targetPersona ? (
            <PersonaSection
              persona={personaData.targetPersona}
              personaJsonb={personaData.targetPersonaJsonb}
              matchesByCategory={personaData.matchesByCategory}
            />
          ) : (
            <UnavailableSectionGuide item={personaItem} />
          )
        )}

        {tab === "influence" && (
          influenceItem.ready && influenceData ? (
            <CelebInfluenceSection data={influenceData} />
          ) : (
            <UnavailableSectionGuide item={influenceItem} />
          )
        )}
      </div>
    </div>
  );
}
