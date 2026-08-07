"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import type { ServiceItem } from "./celebServiceItems";
import UnavailableSectionGuide from "./UnavailableSectionGuide";

type ReadingTab = "person-guide" | "person-explore";

interface Props {
  item: ServiceItem;
  reading: CelebBySlugProfile["reading"];
}

const TAB_KEYS: readonly ReadingTab[] = ["person-guide", "person-explore"];

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 pb-2 font-serif text-[15px] leading-loose text-text-secondary break-keep sm:px-5 md:text-base">
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
        {tab === "person-guide" && (
          reading ? (
            <Paragraphs text={reading.guide} />
          ) : (
            <UnavailableSectionGuide item={tabItems["person-guide"]!} />
          )
        )}

        {tab === "person-explore" && (
          reading ? (
            <article className="mx-auto max-w-3xl px-3 pb-2 sm:px-5">
              <h3 className="mb-5 text-center font-serif text-xl font-semibold leading-snug text-text-primary md:text-2xl">
                {reading.explorationTitle}
              </h3>
              <Paragraphs text={reading.explorationText} />
            </article>
          ) : (
            <UnavailableSectionGuide item={tabItems["person-explore"]!} />
          )
        )}
      </div>
    </div>
  );
}
