"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import CreativeLibrary from "@/components/features/celeb/creativeLibrary/CreativeLibrary";
import { cn } from "@/lib/utils";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";

import { CELEB_SERVICE_ICONS } from "./celebServiceIcons";

type LibraryTab = "consume" | "create";

interface LibraryTabsProps {
  userId: string;
  nickname: string;
  emptyMessage: string;
  wikidataQid?: string | null;
  initialContents?: GetUserContentsResponse;
}

export default function LibraryTabs({
  userId,
  nickname,
  emptyMessage,
  wikidataQid,
  initialContents,
}: LibraryTabsProps) {
  const t = useTranslations("celebPage");
  const [tab, setTab] = useState<LibraryTab>("consume");

  const tabs: { key: LibraryTab; label: string; desc: string; icon: LucideIcon }[] = [
    { key: "consume", label: t("tabConsume"), desc: t("tabConsumeDesc"), icon: CELEB_SERVICE_ICONS.library },
    { key: "create", label: t("tabCreate"), desc: t("tabCreateDesc"), icon: CELEB_SERVICE_ICONS.works },
  ];

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 border-b border-white/10">
        {tabs.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "flex items-center justify-center gap-2 truncate py-2 text-center text-sm font-medium",
                tab === item.key
                  ? "text-accent border-b-2 border-accent"
                  : "text-text-tertiary hover:text-text-primary",
              )}
            >
              <Icon size={15} strokeWidth={1.8} aria-hidden />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 선택된 탭 제목 + 부제 */}
      {(() => {
        const active = tabs.find((item) => item.key === tab);
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

      {/* 감상 기록은 초기 HTML에 포함하고 비활성 탭에서만 숨긴다. */}
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
