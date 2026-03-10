"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import CreativeLibrary from "@/components/features/celeb/creativeLibrary/CreativeLibrary";
import { cn } from "@/lib/utils";

interface LibraryTabsProps {
  userId: string;
  nickname: string;
  emptyMessage: string;
  wikidataQid?: string | null;
}

export default function LibraryTabs({
  userId,
  nickname,
  emptyMessage,
  wikidataQid,
}: LibraryTabsProps) {
  const [tab, setTab] = useState<"consume" | "create">("consume");
  const t = useTranslations("celebPage");

  return (
    <div>
      <div className="flex gap-1 border-b border-white/10 mb-3">
        <button
          type="button"
          onClick={() => setTab("consume")}
          className={cn(
            "px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
            tab === "consume"
              ? "text-accent border-b-2 border-accent"
              : "text-text-tertiary hover:text-text-primary",
          )}
        >
          {t("tabConsume")}
        </button>
        <button
          type="button"
          onClick={() => setTab("create")}
          className={cn(
            "px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
            tab === "create"
              ? "text-accent border-b-2 border-accent"
              : "text-text-tertiary hover:text-text-primary",
          )}
        >
          {t("tabCreate")}
        </button>
      </div>
      {tab === "consume" ? (
        <ContentLibrary
          mode="viewer"
          targetUserId={userId}
          emptyMessage={emptyMessage}
          showPagination
          ownerNickname={nickname}
          defaultViewMode="list"
          hideControlWrapper
        />
      ) : (
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
