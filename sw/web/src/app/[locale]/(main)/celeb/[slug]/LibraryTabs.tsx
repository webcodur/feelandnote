"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import CreativeLibrary from "@/components/features/celeb/creativeLibrary/CreativeLibrary";
import { FormattedText } from "@/components/ui";
import { cn } from "@/lib/utils";

type Tab = "consume" | "journey" | "create";

interface LibraryTabsProps {
  userId: string;
  nickname: string;
  emptyMessage: string;
  wikidataQid?: string | null;
  culturalJourney?: string | null;
  celebTier?: 'full' | 'light';
}

export default function LibraryTabs({
  userId,
  nickname,
  emptyMessage,
  wikidataQid,
  culturalJourney,
  celebTier = 'full',
}: LibraryTabsProps) {
  const isLight = celebTier === 'light';
  const defaultTab: Tab = isLight ? "journey" : "consume";
  const [tab, setTab] = useState<Tab>(defaultTab);
  const t = useTranslations("celebPage");

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "journey", label: t("tabCulturalJourney"), show: !!culturalJourney },
    { key: "consume", label: t("tabConsume"), show: true },
    { key: "create", label: t("tabCreate"), show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

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
      {tab === "consume" && (
        <ContentLibrary
          mode="viewer"
          targetUserId={userId}
          emptyMessage={emptyMessage}
          showPagination
          ownerNickname={nickname}
          defaultViewMode="list"
          hideControlWrapper
        />
      )}
      {tab === "journey" && culturalJourney && (
        <div className="font-serif text-sm md:text-[15px] text-text-secondary leading-[1.9] break-keep">
          <FormattedText text={culturalJourney} />
        </div>
      )}
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
