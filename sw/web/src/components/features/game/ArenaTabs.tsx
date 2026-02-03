/*
  파일명: /components/features/game/ArenaTabs.tsx
  기능: 전장 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import { ARENA_ITEMS } from "@/constants/arena";
import PageTabs from "@/components/shared/PageTabs";

export default function ArenaTabs() {
  const pathname = usePathname();
  const activeTab = ARENA_ITEMS.find((item) => pathname.startsWith(item.href))?.value ?? "up-down";

  return (
    <PageTabs 
      tabs={ARENA_ITEMS} 
      activeTabValue={activeTab} 
    />
  );
}
