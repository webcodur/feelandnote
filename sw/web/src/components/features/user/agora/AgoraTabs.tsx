/*
  파일명: /components/features/user/agora/AgoraTabs.tsx
  기능: 광장 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import { AGORA_ITEMS } from "@/constants/agora";
import PageTabs from "@/components/shared/PageTabs";

export default function AgoraTabs() {
  const pathname = usePathname();
  const activeTab =
    AGORA_ITEMS.find((item) => pathname.startsWith(item.href))?.value ?? "celeb-feed";

  return (
    <PageTabs 
      tabs={AGORA_ITEMS} 
      activeTabValue={activeTab} 
    />
  );
}
