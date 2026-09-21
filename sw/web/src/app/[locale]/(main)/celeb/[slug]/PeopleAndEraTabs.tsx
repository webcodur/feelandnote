/* ─────────────────────────────────────────────
 * [celeb 상세] connections — 인물·시대 탭(관계망·세력)
 * - 목차 위치: connections (relations/faction)
 * - 데이터: item.children/relations/factions props
 * - 함께 보기: RelationGraphSection.tsx, FactionSection.tsx, ArchiveTabsHeader.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { CelebBySlugProfile, CelebRelationItem } from "@/actions/user/getCelebBySlug";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import type { ServiceItem } from "./celebServiceItems";
import CelebFactionDeferred from "./detail/CelebFactionDeferred";
import RelationGraphSection from "./RelationGraphSection";

type PeopleAndEraTab = "relations" | "faction";

interface Props {
  item: ServiceItem;
  centerName: string;
  centerAvatarUrl: string | null;
  relations: CelebRelationItem[];
  slug: string;
  currentCelebId: string;
  isFiction: boolean;
  centerProfile?: CelebBySlugProfile;
}

const TAB_KEYS: readonly PeopleAndEraTab[] = ["relations", "faction"];

export default function PeopleAndEraTabs({
  item,
  centerName,
  centerAvatarUrl,
  relations,
  slug,
  currentCelebId,
  isFiction,
  centerProfile,
}: Props) {
  const t = useTranslations("celebPage");
  const locale = useLocale();
  const [factionOpened, setFactionOpened] = useState(false);
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
        onChange={(next) => { setTab(next); if (next === "faction") setFactionOpened(true); }}
        columnsClassName={columnsClassName}
        ariaLabel={t(isFiction ? "fictionConnections" : "connections")}
        className="mb-0 sm:mb-0"
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
            centerProfile={centerProfile}
          />
        )}

        {activeKey === "faction" && (
          factionOpened ? <CelebFactionDeferred
            slug={slug} locale={locale} currentCelebId={currentCelebId}
            centerName={centerName} centerAvatarUrl={centerAvatarUrl}
          /> : <button type="button" onClick={() => setFactionOpened(true)}
            className="my-4 w-full rounded border border-white/15 px-4 py-4 text-sm text-text-secondary hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {t("factionLoad")}
          </button>
        )}
      </div>
    </div>
  );
}
