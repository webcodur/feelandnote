/* ─────────────────────────────────────────────
 * [celeb 상세] media — 미디어 탭(대사)
 * - 목차 위치: media (dialogues)
 * - 데이터: item.children/dialogueLines props
 * - 함께 보기: DialogueSection.tsx, ArchiveTabsHeader.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";

import ContentTextModal from "@/components/ui/ContentTextModal";
import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
import type { ServiceItem } from "./celebServiceItems";
import DialogueSection from "./DialogueSection";

type MediaTab = "dialogues";

interface Props {
  item: ServiceItem;
  dialogueLines?: Record<string, string[]> | null;
  nickname: string;
  avatarUrl: string | null;
  hasVoice: boolean;
  celebId: string;
  voiceV?: number;
  voiceSpeed?: number;
}

const TAB_KEYS: readonly MediaTab[] = ["dialogues"];

export default function FigureMediaTabs({
  item,
  dialogueLines,
  nickname,
  avatarUrl,
  hasVoice,
  celebId,
  voiceV,
  voiceSpeed,
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
  const [infoOpen, setInfoOpen] = useState(false);
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
        endSlot={
          /* 대사 안내는 탭 우단의 (i) 단추로 접어 모달로 연다 — 절대 배치라 탭 가운데 정렬이 안 흔들린다 */
          activeKey === "dialogues" ? (
            <button
              type="button"
              aria-label={t("dialogueDescriptionTitle")}
              aria-haspopup="dialog"
              aria-expanded={infoOpen}
              title={t("dialogueDescriptionTitle")}
              onClick={() => setInfoOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary hover:bg-white/[0.06] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <Info size={15} aria-hidden />
            </button>
          ) : null
        }
      />

      <div
        id={`archive-panel-${activeKey}`}
        role="tabpanel"
        aria-labelledby={`archive-tab-${activeKey}`}
      >
        {/* 가상독백은 미디어가 아니라 읽어보기 두 번째 모드에서 보인다. */}
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
      </div>

      {infoOpen && (
        <ContentTextModal
          isOpen
          onClose={() => setInfoOpen(false)}
          title={t("mediaDialogues")}
          text={t("dialogueDescription")}
        />
      )}
    </div>
  );
}
