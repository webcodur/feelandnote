"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { FeaturedTag } from "@/actions/home/getFeaturedTags";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import type { ServiceItem } from "./celebServiceItems";
import FactionSection from "./FactionSection";
import RelationGraphSection from "./RelationGraphSection";

type PeopleAndEraTab = "relations" | "faction";

interface Props {
  item: ServiceItem;
  centerName: string;
  centerAvatarUrl: string | null;
  relations: CelebRelationItem[];
  factions: FeaturedTag[];
  currentCelebId: string;
  isFiction: boolean;
}

const TAB_KEYS: readonly PeopleAndEraTab[] = ["relations", "faction"];

export default function PeopleAndEraTabs({
  item,
  centerName,
  centerAvatarUrl,
  relations,
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
  const [tab, setTab] = useState<PeopleAndEraTab>(
    () => visibleTabs[0]?.key ?? "relations",
  );
  const active = visibleTabs.find(({ key }) => key === tab) ?? visibleTabs[0];
  if (!active) return null;

  const activeKey = active.key;
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
          <RelationGraphSection
            centerName={centerName}
            centerAvatarUrl={centerAvatarUrl}
            relations={relations}
            isFiction={isFiction}
          />
        )}

        {activeKey === "faction" && (
          <FactionSection factions={factions} currentCelebId={currentCelebId} />
        )}
      </div>
    </div>
  );
}
