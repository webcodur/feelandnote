/*
  파일명: /components/features/board/shared/BoardTabs.tsx
  기능: 게시판 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import PageTabs from "@/components/shared/PageTabs";

export default function BoardTabs() {
  const pathname = usePathname();
  const t = useTranslations("board.tabs");

  const BOARD_TABS = [
    { value: "notice", label: t("notice"), href: "/agora/board/notice" },
    { value: "feedback", label: t("feedback"), href: "/agora/board/feedback" },
  ] as const;
  const activeTab = BOARD_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "notice";

  return (
    <PageTabs 
      tabs={BOARD_TABS} 
      activeTabValue={activeTab} 
    />
  );
}
