/*
  파일명: /components/features/user/explore/ExploreTabs.tsx
  기능: 탐색 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "@/i18n/navigation";
import PageTabs from "@/components/shared/PageTabs";
import { useTranslations } from "next-intl";

export default function ExploreTabs() {
  const pathname = usePathname();
  const t = useTranslations("explore.ui");

  const EXPLORE_TABS = [
    { value: "hub" as const, label: t("tabs.hub"), href: "/explore" },
    { value: "figures" as const, label: t("tabs.celebs"), href: "/explore/figures" },
    { value: "feed" as const, label: t("tabs.celebFeed"), href: "/explore/feed" },
    { value: "spotlight" as const, label: t("tabs.spotlight"), href: "/explore/spotlight" },
  ];
  // 서브 경로 먼저 매칭 후, 정확히 /explore만 남으면 hub
  const subTab = EXPLORE_TABS.slice(1).find((tab) => pathname.startsWith(tab.href));
  const activeTab = subTab?.value ?? "hub";

  return (
    <PageTabs
      tabs={EXPLORE_TABS}
      activeTabValue={activeTab}
    />
  );
}
