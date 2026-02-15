/*
  파일명: /components/lab/LabTabs.tsx
  기능: Lab 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import { LAB_ITEMS } from "@/constants/lab";
import PageTabs from "@/components/shared/PageTabs";

export default function LabTabs() {
  const pathname = usePathname();
  const activeTab =
    LAB_ITEMS.find((item) => pathname.startsWith(item.href))?.value ?? "content-cards";

  return (
    <PageTabs
      tabs={LAB_ITEMS}
      activeTabValue={activeTab}
    />
  );
}
