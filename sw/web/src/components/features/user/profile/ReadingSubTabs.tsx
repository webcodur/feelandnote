/*
  파일명: /components/features/user/profile/ReadingSubTabs.tsx
  기능: 열람실 2단 탭 네비게이션
  책임: URL 기반으로 기록/관심/컬렉션/통계 활성 탭을 결정한다.
*/

"use client";

import { usePathname } from "next/navigation";
import { buildReadingSubTabs } from "@/constants/archive";
import PillTabs from "@/components/shared/PillTabs";

interface ReadingSubTabsProps {
  userId: string;
  isCeleb: boolean;
  isOwner: boolean;
}

export default function ReadingSubTabs({ userId, isCeleb, isOwner }: ReadingSubTabsProps) {
  const pathname = usePathname();
  const tabs = buildReadingSubTabs(userId, isCeleb, isOwner);

  const pillTabs = tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    href: tab.fullHref,
  }));

  // 가장 긴 경로 매치 우선
  const sortedTabs = [...tabs].sort((a, b) => b.fullHref.length - a.fullHref.length);
  const activeTab = sortedTabs.find((tab) => {
    if (tab.value === "records") return pathname === tab.fullHref || pathname === `/${userId}/reading`;
    return pathname.startsWith(tab.fullHref);
  })?.value ?? "records";

  return <PillTabs tabs={pillTabs} activeTabValue={activeTab} />;
}
