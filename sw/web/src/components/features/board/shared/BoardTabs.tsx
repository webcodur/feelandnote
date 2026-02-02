/*
  파일명: /components/features/board/shared/BoardTabs.tsx
  기능: 게시판 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import PageTabs from "@/components/shared/PageTabs";

const BOARD_TABS = [
  { value: "notice", label: "공지사항", href: "/board/notice" },
  { value: "feedback", label: "피드백", href: "/board/feedback" },
] as const;

export default function BoardTabs() {
  const pathname = usePathname();
  const activeTab = BOARD_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "notice";

  return (
    <PageTabs 
      tabs={BOARD_TABS} 
      activeTabValue={activeTab} 
    />
  );
}
