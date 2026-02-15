/*
  파일명: /components/features/scriptures/ScripturesTabs.tsx
  기능: 지혜의 서고 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import { SCRIPTURES_TABS } from "@/constants/scriptures";
import PageTabs from "@/components/shared/PageTabs";

export default function ScripturesTabs() {
  const pathname = usePathname();
  const activeTab = SCRIPTURES_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "era";

  return (
    <PageTabs 
      tabs={SCRIPTURES_TABS} 
      activeTabValue={activeTab} 
    />
  );
}
