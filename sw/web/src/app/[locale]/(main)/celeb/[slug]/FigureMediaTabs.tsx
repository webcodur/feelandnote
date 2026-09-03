/* ─────────────────────────────────────────────
 * [celeb 상세] media — 미디어 탭(대사·영상)
 * - 목차 위치: media (dialogues/videos)
 * - 데이터: item.children/dialogueLines/longform/shorts props
 * - 함께 보기: DialogueSection.tsx, VideosSection.tsx, ArchiveTabsHeader.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import type { ServiceItem } from "./celebServiceItems";
import DialogueSection from "./DialogueSection";
import VideosSection, { type CelebVideoItem } from "./VideosSection";

type MediaTab = "dialogues" | "videos";

interface Props {
  item: ServiceItem;
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
  "dialogues",
  "videos",
];

export default function FigureMediaTabs({
  item,
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
  // 자료가 있는 탭만 목록에 남는다. 없는 탭을 기다리다 빈 상자를 그리지 않는다
  const visibleTabs = TAB_KEYS.flatMap((key) => {
    const child = childItems.find((candidate) => candidate.key === key);
    return child ? [{ key, item: child }] : [];
  });
  const [tab, setTab] = useState<MediaTab>(
    () => visibleTabs[0]?.key ?? "dialogues",
  );
  const active = visibleTabs.find(({ key }) => key === tab) ?? visibleTabs[0];
  if (!active) return null;

  const activeKey = active.key;
  const tabs: ArchiveTabItem<MediaTab>[] = visibleTabs.map(
    ({ key, item: child }) => ({ key, label: child.label }),
  );

  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={activeKey}
        onChange={setTab}
        columnsClassName={visibleTabs.length === 1 ? "grid-cols-1" : "grid-cols-2"}
        ariaLabel={t("media")}
      />

      <div
        id={`archive-panel-${activeKey}`}
        role="tabpanel"
        aria-labelledby={`archive-tab-${activeKey}`}
      >
        {/* 가상 독백은 화면에서 폐기하고 DB에 제작 재료로만 남긴다. */}
        {activeKey === "dialogues" && dialogueLines && (
          <DialogueSection
            lines={dialogueLines}
            nickname={nickname}
            avatarUrl={avatarUrl}
            hasVoice={hasVoice}
            celebId={celebId}
            voiceV={voiceV}
            voiceSpeed={voiceSpeed}
          />
        )}

        {activeKey === "videos" && (
          <VideosSection longform={longform} shorts={shorts} />
        )}
      </div>
    </div>
  );
}
