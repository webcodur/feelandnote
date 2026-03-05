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
    { value: "celebs" as const, label: t("tabs.celebs"), href: "/explore/celebs" },
    { value: "celeb-feed" as const, label: t("tabs.celebFeed"), href: "/explore/celeb-feed" },
    { value: "spotlight" as const, label: t("tabs.spotlight"), href: "/explore/spotlight" },
  ];
  const activeTab = EXPLORE_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "celebs";

  return (
    <PageTabs
      tabs={EXPLORE_TABS}
      activeTabValue={activeTab}
    />
  );
}
