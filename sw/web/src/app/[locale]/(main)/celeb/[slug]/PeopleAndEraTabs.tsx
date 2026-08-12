"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import type { FeaturedTag } from "@/actions/home/getFeaturedTags";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";

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
  isFiction: boolean;
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
  isFiction,
}: Props) {
  const t = useTranslations("celebPage");
  const childItems = item.children ?? [];
  const visibleTabs = TAB_KEYS.flatMap((key) => {
    const child = childItems.find((candidate) => candidate.key === key);
    return child ? [{ key, item: child }] : [];
  });
  const [tab, setTab] = useState<PeopleAndEraTab>(() =>
    visibleTabs.find(({ item: child }) => child.ready)?.key
      ?? visibleTabs[0]?.key
      ?? "relations"
  );
  const active = visibleTabs.find(({ key }) => key === tab) ?? visibleTabs[0];
  if (!active) return null;

  const activeKey = active.key;
  const activeItem = active.item;
  const tabs: ArchiveTabItem<PeopleAndEraTab>[] = visibleTabs.map(({ key, item: child }) => ({
    key,
    label: child.label,
  }));
  const columnsClassName = visibleTabs.length === 1
    ? "grid-cols-1"
    : visibleTabs.length === 2
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={activeKey}
        onChange={setTab}
        columnsClassName={columnsClassName}
        ariaLabel={t("connections")}
      />

      <div
        id={`archive-panel-${activeKey}`}
        role="tabpanel"
        aria-labelledby={`archive-tab-${activeKey}`}
      >
        {activeKey === "relations" && (
          activeItem.ready ? (
            <RelationGraphSection
              centerName={centerName}
              centerAvatarUrl={centerAvatarUrl}
              relations={relations}
              isFiction={isFiction}
            />
          ) : (
            <UnavailableSectionGuide item={activeItem} />
          )
        )}

        {activeKey === "contemporaries" && (
          activeItem.ready ? (
            <ContemporariesSection contemporaries={contemporaries} />
          ) : (
            <UnavailableSectionGuide item={activeItem} />
          )
        )}

        {activeKey === "faction" && (
          activeItem.ready ? (
            <FactionSection factions={factions} currentCelebId={currentCelebId} />
          ) : (
            <UnavailableSectionGuide item={activeItem} />
          )
        )}
      </div>
    </div>
  );
}
