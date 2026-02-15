/*
  파일명: /components/features/user/explore/ExploreTabs.tsx
  기능: 탐색 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import PageTabs from "@/components/shared/PageTabs";

const EXPLORE_TABS = [
  { value: "celebs", label: "셀럽", href: "/explore/celebs" },
  { value: "people", label: "소셜", href: "/explore/people" },
] as const;

export default function ExploreTabs() {
  const pathname = usePathname();
  const activeTab = EXPLORE_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "celebs";

  return (
    <PageTabs 
      tabs={EXPLORE_TABS} 
      activeTabValue={activeTab} 
    />
  );
}
