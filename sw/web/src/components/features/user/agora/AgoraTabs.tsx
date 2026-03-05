/*
  파일명: /components/features/user/agora/AgoraTabs.tsx
  기능: 광장 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { useMemo } from "react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AGORA_ITEMS } from "@/constants/agora";
import PageTabs from "@/components/shared/PageTabs";

export default function AgoraTabs() {
  const pathname = usePathname();
  const t = useTranslations("agora.items");

  const activeTab =
    AGORA_ITEMS.find((item) => pathname.startsWith(item.href))?.value ?? "social";

  // value에서 camelCase 키로 변환 (celeb-feed → celebFeed)
  const toKey = (value: string) => value.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  const tabs = useMemo(
    () => AGORA_ITEMS.map((item) => ({
      ...item,
      label: t(`${toKey(item.value)}.label` as any),
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
