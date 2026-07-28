"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import type { ServiceItem } from "./celebServiceItems";
import DialogueSection from "./DialogueSection";
import UnavailableSectionGuide from "./UnavailableSectionGuide";
import VideosSection, { type CelebVideoItem } from "./VideosSection";
import VirtualMonologueSection from "./VirtualMonologueSection";

type MediaTab = "virtual-monologue" | "dialogues" | "videos";

interface Props {
  item: ServiceItem;
  monologueText?: string | null;
  showTranslate: boolean;
  dialogueLines?: Record<string, string[]> | null;
  nickname: string;
  avatarUrl: string | null;
  hasVoice: boolean;
  celebId: string;
  voiceV?: number;
  voiceSpeed?: number;
  longform: CelebVideoItem[];
  shorts: CelebVideoItem[];
}

const TAB_KEYS: readonly MediaTab[] = [
  "virtual-monologue",
  "dialogues",
  "videos",
];

export default function FigureMediaTabs({
  item,
  monologueText,
  showTranslate,
  dialogueLines,
  nickname,
  avatarUrl,
  hasVoice,
  celebId,
  voiceV,
  voiceSpeed,
  longform,
  shorts,
}: Props) {
  const t = useTranslations("celebPage");
  const childItems = item.children ?? [];
  const tabItems = Object.fromEntries(
    childItems.map((child) => [child.key, child]),
  ) as Partial<Record<MediaTab, ServiceItem>>;
  const [tab, setTab] = useState<MediaTab>(() => {
    return TAB_KEYS.find((key) => tabItems[key]?.ready) ?? "virtual-monologue";
  });

  if (!TAB_KEYS.every((key) => tabItems[key])) return null;

  const tabs: ArchiveTabItem<MediaTab>[] = TAB_KEYS.map((key) => ({
    key,
    label: tabItems[key]!.label,
    icon: tabItems[key]!.icon,
  }));

  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={tab}
        onChange={setTab}
        columnsClassName="grid-cols-3"
        ariaLabel={t("media")}
      />

      <div
        id={`archive-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`archive-tab-${tab}`}
      >
        {tab === "virtual-monologue" && (
          tabItems["virtual-monologue"]!.ready && monologueText ? (
            <VirtualMonologueSection
              text={monologueText}
              showTranslate={showTranslate}
            />
          ) : (
            <UnavailableSectionGuide item={tabItems["virtual-monologue"]!} />
          )
        )}

        {tab === "dialogues" && (
          tabItems.dialogues!.ready && dialogueLines ? (
            <DialogueSection
              lines={dialogueLines}
              nickname={nickname}
              avatarUrl={avatarUrl}
              hasVoice={hasVoice}
              celebId={celebId}
              voiceV={voiceV}
              voiceSpeed={voiceSpeed}
            />
          ) : (
            <UnavailableSectionGuide item={tabItems.dialogues!} />
          )
        )}

        {tab === "videos" && (
          tabItems.videos!.ready ? (
            <VideosSection longform={longform} shorts={shorts} />
          ) : (
            <UnavailableSectionGuide item={tabItems.videos!} />
          )
        )}
      </div>
    </div>
  );
}
