/* ─────────────────────────────────────────────
 * [celeb 상세] library — 서재 탭(감상·창작)
 * - 목차 위치: library
 * - 데이터: userId/initialContents/initialContentBrief props
 * - 함께 보기: ArchiveTabsHeader.tsx, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import CreativeLibrary from "@/components/features/celeb/creativeLibrary/CreativeLibrary";
import { cn } from "@/lib/utils";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";

type LibraryTab = "consume" | "create";

interface LibraryTabsProps {
  userId: string;
  nickname: string;
  /** 감상배경 칸 머리에 띄울 인물 얼굴 */
  avatarUrl?: string | null;
  emptyMessage: string;
  wikidataQid?: string | null;
  initialContents?: GetUserContentsResponse;
  initialContentBrief?: ContentBrief | null;
  authoredBooks?: FigureBookContent[];
}

export default function LibraryTabs({
  userId,
  nickname,
  avatarUrl,
  emptyMessage,
  wikidataQid,
  initialContents,
  initialContentBrief,
  authoredBooks = [],
}: LibraryTabsProps) {
  const t = useTranslations("celebPage");
  const hasConsumption = initialContents === undefined || initialContents.items.length > 0;
  const hasCreation = authoredBooks.length > 0 || Boolean(wikidataQid);
  const [tab, setTab] = useState<LibraryTab>(hasConsumption ? "consume" : "create");
  const activeTab = tab === "consume" && !hasConsumption ? "create"
    : tab === "create" && !hasCreation ? "consume" : tab;

  const tabs: ArchiveTabItem<LibraryTab>[] = [
    ...(hasConsumption ? [{ key: "consume" as const, label: t("tabConsume") }] : []),
    ...(hasCreation ? [{ key: "create" as const, label: t("tabCreate") }] : []),
  ];

  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={activeTab}
        onChange={setTab}
        columnsClassName={tabs.length === 1 ? "grid-cols-1" : "grid-cols-2"}
        ariaLabel={t("library")}
      />

      {/* 감상 탭은 초기 HTML에 포함하고 비활성 탭에서만 숨긴다. */}
      {hasConsumption && <div className={cn(activeTab !== "consume" && "hidden")}>
        <ContentLibrary
          mode="viewer"
          ownerKind="celeb"
          targetUserId={userId}
          emptyMessage={emptyMessage}
          showPagination
          hideReviewFilter
          ownerNickname={nickname}
          ownerAvatarUrl={avatarUrl}
          defaultViewMode="list"
          /* 넓은 화면은 펼쳐보기로 연다 — 자리가 넉넉해 감상 글과 작품 정보를 한 번에 편다.
             좁은 화면은 목록으로 두고, 어느 쪽이든 보기 단추로 바꿀 수 있다. */
          desktopViewMode="expand"
          defaultPageSize={4}
          hideControlWrapper
          initialContents={initialContents}
          initialContentBrief={initialContentBrief}
        />
      </div>}
      {/* 창작 탭은 외부 Wikidata 조회를 유발하므로 선택 시에만 마운트한다 */}
      {activeTab === "create" && hasCreation && (
        <CreativeLibrary
          celebId={userId}
          celebNickname={nickname}
          wikidataQid={wikidataQid}
          authoredBooks={authoredBooks}
          hideControlWrapper
        />
      )}
    </div>
  );
}
