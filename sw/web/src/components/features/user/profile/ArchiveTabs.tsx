/*
  파일명: /components/features/user/profile/ArchiveTabs.tsx
  기능: 기록관 1단 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 수평 탭 네비게이션을 제공한다.
*/

"use client";

import { usePathname } from "next/navigation";
import { buildArchiveTabs } from "@/constants/archive";
import PageTabs from "@/components/shared/PageTabs";

interface ArchiveTabsProps {
  userId: string;
  isOwner: boolean;
}

export default function ArchiveTabs({ userId, isOwner }: ArchiveTabsProps) {
  const pathname = usePathname();
  const tabs = buildArchiveTabs(userId, isOwner);

  // 탭을 PageTabs 형식으로 변환
  const pageTabs = tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    href: tab.fullHref,
  }));

  // 가장 긴 경로 매치 우선 (chamber > reading > merits > root)
  const sortedTabs = [...tabs].sort((a, b) => b.fullHref.length - a.fullHref.length);
  const activeTab = sortedTabs.find((tab) => {
    if (tab.value === "reception") return pathname === tab.fullHref;
    return pathname.startsWith(tab.fullHref);
  })?.value ?? "reception";

  return <PageTabs tabs={pageTabs} activeTabValue={activeTab} />;
}
