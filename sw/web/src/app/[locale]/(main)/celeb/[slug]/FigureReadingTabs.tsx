"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import type { ServiceItem } from "./celebServiceItems";

type ReadingTab = "person-guide" | "person-explore";

interface Props {
  item: ServiceItem;
  reading: CelebBySlugProfile["reading"];
}

const TAB_KEYS: readonly ReadingTab[] = ["person-guide", "person-explore"];

function Paragraphs({ text }: { text: string }) {
  return (
    // 좌우 여백은 구획 상자가 이미 쥔다. 여기서 더 주면 글 시작선이 다른 구획과 어긋난다
    <div className="mx-auto max-w-3xl space-y-4 pb-2 font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
      {text.split(/\n\n+/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

export default function FigureReadingTabs({ item, reading }: Props) {
  const t = useTranslations("celebPage");
  const childItems = item.children ?? [];
  const tabItems = Object.fromEntries(
    childItems.map((child) => [child.key, child]),
  ) as Partial<Record<ReadingTab, ServiceItem>>;
  const [tab, setTab] = useState<ReadingTab>("person-guide");

  if (!TAB_KEYS.every((key) => tabItems[key])) return null;

  const tabs: ArchiveTabItem<ReadingTab>[] = TAB_KEYS.map((key) => ({
    key,
    label: tabItems[key]!.label,
  }));

  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={tab}
        onChange={setTab}
        columnsClassName="grid-cols-2"
        ariaLabel={t("reading")}
      />

      <div
        id={`archive-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`archive-tab-${tab}`}
      >
        {tab === "person-guide" && reading && (
          <Paragraphs text={reading.guide} />
        )}

        {tab === "person-explore" && reading && (
          <article className="mx-auto max-w-3xl pb-2">
            <h3 className="mb-5 text-center font-serif text-xl font-semibold leading-snug text-text-primary md:text-2xl">
              {reading.explorationTitle}
            </h3>
            <Paragraphs text={reading.explorationText} />
          </article>
        )}
      </div>
    </div>
  );
}
