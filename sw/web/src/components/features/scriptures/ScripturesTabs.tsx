/*
  파일명: /components/features/scriptures/ScripturesTabs.tsx
  기능: 지혜의 서가 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { useMemo } from "react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SCRIPTURES_TABS } from "@/constants/scriptures";
import PageTabs from "@/components/shared/PageTabs";

export default function ScripturesTabs() {
  const pathname = usePathname();
  const t = useTranslations("scriptures.tabs");
  const activeTab = SCRIPTURES_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "era";

  const tabs = useMemo(
    () => SCRIPTURES_TABS.map((tab) => ({
      ...tab,
      label: t(`${tab.value}.label` as any),
    })),
    [t]
  );

  return (
    <PageTabs
      tabs={tabs}
      activeTabValue={activeTab}
    />
  );
}
