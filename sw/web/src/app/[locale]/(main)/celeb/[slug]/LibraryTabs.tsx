"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import CreativeLibrary from "@/components/features/celeb/creativeLibrary/CreativeLibrary";
import { cn } from "@/lib/utils";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";
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

  const tabs: ArchiveTabItem<LibraryTab>[] = [
    { key: "consume", label: t("tabConsume"), icon: CELEB_SERVICE_ICONS.library },
    { key: "create", label: t("tabCreate"), icon: CELEB_SERVICE_ICONS.works },
  ];

  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={tab}
        onChange={setTab}
        columnsClassName="grid-cols-2"
        ariaLabel={t("library")}
      />

      {/* 감상 탭은 초기 HTML에 포함하고 비활성 탭에서만 숨긴다. */}
      <div className={cn(tab !== "consume" && "hidden")}>
        <ContentLibrary
          mode="viewer"
          targetUserId={userId}
          emptyMessage={emptyMessage}
          showPagination
          ownerNickname={nickname}
          defaultViewMode="list"
          defaultPageSize={4}
          hideControlWrapper
          initialContents={initialContents}
        />
      </div>
      {/* 창작 탭은 외부 Wikidata 조회를 유발하므로 선택 시에만 마운트한다 */}
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
