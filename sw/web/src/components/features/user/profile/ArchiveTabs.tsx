/*
  파일명: /components/features/user/profile/ArchiveTabs.tsx
  기능: 기록관 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 수평 탭 네비게이션을 제공한다.
*/

"use client";

import { usePathname } from "next/navigation";
import { buildArchiveTabs } from "@/constants/archive";
import PageTabs from "@/components/shared/PageTabs";

interface ArchiveTabsProps {
  userId: string;
  isOwner: boolean;
  isCeleb: boolean;
}

export default function ArchiveTabs({ userId, isOwner, isCeleb }: ArchiveTabsProps) {
  const pathname = usePathname();
  const tabs = buildArchiveTabs(userId, isOwner, isCeleb);

  const pageTabs = tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    href: tab.fullHref,
  }));

  // 가장 긴 경로 매치 우선
  const sortedTabs = [...tabs].sort((a, b) => b.fullHref.length - a.fullHref.length);
  const activeTab = sortedTabs.find((tab) => {
    if (tab.value === "intro") return pathname === tab.fullHref;
    return pathname.startsWith(tab.fullHref);
  })?.value ?? "intro";

  return <PageTabs tabs={pageTabs} activeTabValue={activeTab} />;
}
