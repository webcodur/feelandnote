/*
  파일명: /components/features/user/profile/ArchiveSectionHeader.tsx
  기능: 기록관 탭별 안내 섹션
  책임: 현재 활성 탭을 판별하여 SectionHeader를 렌더링한다.
*/

"use client";

import { usePathname } from "next/navigation";
import { ARCHIVE_TABS } from "@/constants/archive";
import SectionHeader from "@/components/shared/SectionHeader";

interface Props {
  userId: string;
  isOwner: boolean;
}

export default function ArchiveSectionHeader({ userId, isOwner }: Props) {
  const pathname = usePathname();

  // 가장 긴 경로 매치 우선 (ArchiveTabs와 동일 로직)
  const tabsWithHref = ARCHIVE_TABS.map((tab) => ({
    ...tab,
    fullHref: `/${userId}${tab.href}`,
  }));
  const sorted = [...tabsWithHref].sort((a, b) => b.fullHref.length - a.fullHref.length);
  const activeTab = sorted.find((tab) => {
    if (tab.value === "reception") return pathname === tab.fullHref;
    return pathname.startsWith(tab.fullHref);
  });

  if (!activeTab) return null;

  const desc = isOwner ? activeTab.ownerDescription : activeTab.description;
  const subDesc = isOwner ? activeTab.ownerSubDescription : activeTab.subDescription;

  return (
    <SectionHeader
      title={activeTab.title}
      label={activeTab.englishLabel}
      description={
        <>
          {desc}
          <br />
          <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
            {subDesc}
          </span>
        </>
      }
    />
  );
}
