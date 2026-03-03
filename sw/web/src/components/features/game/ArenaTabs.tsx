/*
  파일명: /components/features/game/ArenaTabs.tsx
  기능: 전장 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { useMemo } from "react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ARENA_ITEMS } from "@/constants/arena";
import PageTabs from "@/components/shared/PageTabs";

export default function ArenaTabs() {
  const pathname = usePathname();
  const t = useTranslations("rest.arena");
  const visibleItems = ARENA_ITEMS.filter((item) => !item.hidden);
  const activeTab = ARENA_ITEMS.find((item) => pathname.startsWith(item.href))?.value ?? "dawn";

  const tabs = useMemo(
    () => visibleItems.map((item) => ({
      ...item,
      label: t(`${item.value}.label` as any),
    })),
    [visibleItems, t]
  );

  return (
    <div id="arena-tabs" className="scroll-mt-16">
      <PageTabs
        tabs={tabs}
        activeTabValue={activeTab}
      />
    </div>
  );
}
