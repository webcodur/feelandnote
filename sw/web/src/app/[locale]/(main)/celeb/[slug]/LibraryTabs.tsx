"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import CreativeLibrary from "@/components/features/celeb/creativeLibrary/CreativeLibrary";
import { FormattedText } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { CelebTier } from "@/actions/user/getUserProfile";

type Tab = "consume" | "journey" | "create";

interface LibraryTabsProps {
  userId: string;
  nickname: string;
  emptyMessage: string;
  wikidataQid?: string | null;
  culturalJourney?: string | null;
  celebTier?: CelebTier;
  initialContents?: GetUserContentsResponse;
}

export default function LibraryTabs({
  userId,
  nickname,
  emptyMessage,
  wikidataQid,
  culturalJourney,
  celebTier = 'full',
  initialContents,
}: LibraryTabsProps) {
  const t = useTranslations("celebPage");

  const tabs: { key: Tab; label: string; desc: string; show: boolean }[] = [
    { key: "journey", label: t("tabCulturalJourney"), desc: t("tabCulturalJourneyDesc"), show: !!culturalJourney },
    { key: "consume", label: t("tabConsume"), desc: t("tabConsumeDesc"), show: true },
    { key: "create", label: t("tabCreate"), desc: t("tabCreateDesc"), show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  // light는 감상 여정이 주역이라 그 탭을 먼저 연다. 다만 여정이 없으면 빈 화면이 되므로 감상 기록으로 되돌린다.
  const defaultTab: Tab = celebTier === 'light' && culturalJourney ? "journey" : "consume";
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div>
      <div className={cn(
        "grid border-b border-white/10 mb-3",
        visibleTabs.length === 3 ? "grid-cols-3" : "grid-cols-2",
      )}>
        {visibleTabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "py-2 text-sm font-medium transition-colors text-center truncate",
              tab === item.key
                ? "text-accent border-b-2 border-accent"
                : "text-text-tertiary hover:text-text-primary",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 선택된 탭 제목 + 부제 */}
      {(() => {
        const active = visibleTabs.find((item) => item.key === tab);
        return (
          <div className="text-center py-6 space-y-1">
            <h3 className="font-serif text-[15px] text-accent/90 tracking-widest">
              {active?.label}
            </h3>
            <p className="text-sm text-text-tertiary">
              {active?.desc}
            </p>
          </div>
        );
      })()}

      {/* 감상 기록·감상 여정은 탭 선택과 무관하게 항상 DOM에 둔다(비활성 탭은 CSS로만 숨김).
          조건부 마운트로 빼면 초기 HTML에서 본문 텍스트가 통째로 빠진다. */}
      <div className={cn(tab !== "consume" && "hidden")}>
        <ContentLibrary
          mode="viewer"
          targetUserId={userId}
          emptyMessage={emptyMessage}
          showPagination
          ownerNickname={nickname}
          defaultViewMode="list"
          hideControlWrapper
          initialContents={initialContents}
        />
      </div>
      {culturalJourney && (
        <div className={cn(
          "font-serif text-sm md:text-[15px] text-text-secondary leading-[1.9] break-keep",
          tab !== "journey" && "hidden",
        )}>
          <FormattedText text={culturalJourney} />
        </div>
      )}
      {/* 창작물은 외부 Wikidata 조회를 유발하므로 선택 시에만 마운트한다 */}
      {tab === "create" && (
        <CreativeLibrary
          celebId={userId}
          celebNickname={nickname}
          wikidataQid={wikidataQid}
          hideControlWrapper
        />
      )}
    </div>
  );
}
