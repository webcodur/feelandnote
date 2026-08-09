"use client";

import { useState } from "react";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";
import type { ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import type { FeaturedTag } from "@/actions/home/getFeaturedTags";
import { useTranslations } from "next-intl";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import type { ServiceItem } from "./celebServiceItems";
import ContemporariesSection from "./ContemporariesSection";
import FactionSection from "./FactionSection";
import RelationGraphSection from "./RelationGraphSection";
import UnavailableSectionGuide from "./UnavailableSectionGuide";

type PeopleAndEraTab = "relations" | "contemporaries" | "faction";

interface Props {
  item: ServiceItem;
  centerName: string;
  centerAvatarUrl: string | null;
  relations: CelebRelationItem[];
  contemporaries: ContemporaryCeleb[];
  factions: FeaturedTag[];
  currentCelebId: string;
}

const TAB_KEYS: readonly PeopleAndEraTab[] = [
  "relations",
  "contemporaries",
  "faction",
];

export default function PeopleAndEraTabs({
  item,
  centerName,
  centerAvatarUrl,
  relations,
  contemporaries,
  factions,
  currentCelebId,
}: Props) {
  const t = useTranslations("celebPage");
  const childItems = item.children ?? [];
  const relationItem = childItems.find((child) => child.key === "relations");
  const contemporariesItem = childItems.find(
    (child) => child.key === "contemporaries",
  );
  const factionItem = childItems.find((child) => child.key === "faction");
  const [tab, setTab] = useState<PeopleAndEraTab>(() => {
    if (relationItem?.ready) return "relations";
    if (contemporariesItem?.ready) return "contemporaries";
    if (factionItem?.ready) return "faction";
    return "relations";
  });

  if (!relationItem || !contemporariesItem || !factionItem) return null;

  const tabItems: Record<PeopleAndEraTab, ServiceItem> = {
    relations: relationItem,
    contemporaries: contemporariesItem,
    faction: factionItem,
  };
  const tabs: ArchiveTabItem<PeopleAndEraTab>[] = TAB_KEYS.map((key) => ({
    key,
    label: tabItems[key].label,
  }));

  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={tab}
        onChange={setTab}
        columnsClassName="grid-cols-3"
        ariaLabel={t("connections")}
      />

      <div
        id={`archive-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`archive-tab-${tab}`}
      >
        {tab === "relations" && (
          relationItem.ready ? (
            <RelationGraphSection
              centerName={centerName}
              centerAvatarUrl={centerAvatarUrl}
              relations={relations}
            />
          ) : (
            <UnavailableSectionGuide item={relationItem} />
          )
        )}

        {tab === "contemporaries" && (
          contemporariesItem.ready ? (
            <ContemporariesSection contemporaries={contemporaries} />
          ) : (
            <UnavailableSectionGuide item={contemporariesItem} />
          )
        )}

        {tab === "faction" && (
          factionItem.ready ? (
            <FactionSection
              factions={factions}
              currentCelebId={currentCelebId}
            />
          ) : (
            <UnavailableSectionGuide item={factionItem} />
          )
        )}
      </div>
    </div>
  );
}
