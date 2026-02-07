/*
  파일명: /components/features/user/profile/ArchiveSectionHeader.tsx
  기능: 기록관 탭별 안내 섹션
  책임: 현재 활성 탭을 판별하여 SectionHeader를 렌더링한다.
*/

"use client";

import { usePathname } from "next/navigation";
import { buildArchiveTabs } from "@/constants/archive";
import SectionHeader from "@/components/shared/SectionHeader";

interface Props {
  userId: string;
  isOwner: boolean;
  isCeleb: boolean;
}

export default function ArchiveSectionHeader({ userId, isOwner, isCeleb }: Props) {
  const pathname = usePathname();
  const tabs = buildArchiveTabs(userId, isOwner, isCeleb);

  // 가장 긴 경로 매치 우선
  const sorted = [...tabs].sort((a, b) => b.fullHref.length - a.fullHref.length);
  const activeTab = sorted.find((tab) => {
    if (tab.value === "intro") return pathname === tab.fullHref;
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
