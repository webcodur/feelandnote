"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import CreativeLibrary from "@/components/features/celeb/creativeLibrary/CreativeLibrary";
import CelebAffiliateBooks from "@/components/features/celeb/CelebAffiliateBooks";
import { cn } from "@/lib/utils";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";

type LibraryTab = "consume" | "create";

// 상단 제휴 레일은 개별 콘텐츠의 구매 버튼과 중복되어 임시 비노출한다.
// 필요해지면 이 값만 true로 바꾸면 기존 레일을 다시 사용할 수 있다.
const SHOW_EMBEDDED_AFFILIATE_RAIL = false;

interface LibraryTabsProps {
  userId: string;
  nickname: string;
  /** 감상배경 칸 머리에 띄울 인물 얼굴 */
  avatarUrl?: string | null;
  emptyMessage: string;
  wikidataQid?: string | null;
  initialContents?: GetUserContentsResponse;
  initialContentBrief?: ContentBrief | null;
}

export default function LibraryTabs({
  userId,
  nickname,
  avatarUrl,
  emptyMessage,
  wikidataQid,
  initialContents,
  initialContentBrief,
}: LibraryTabsProps) {
  const t = useTranslations("celebPage");
  const [tab, setTab] = useState<LibraryTab>("consume");

  const tabs: ArchiveTabItem<LibraryTab>[] = [
    { key: "consume", label: t("tabConsume") },
    { key: "create", label: t("tabCreate") },
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
        {SHOW_EMBEDDED_AFFILIATE_RAIL && (
          <CelebAffiliateBooks
            userId={userId}
            actualOnly
            embedded
          />
        )}
        <ContentLibrary
          mode="viewer"
          ownerKind="celeb"
          targetUserId={userId}
          emptyMessage={emptyMessage}
          showPagination
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
