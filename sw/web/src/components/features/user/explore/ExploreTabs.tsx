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
  { value: "friends", label: "친구", href: "/explore/friends" },
  { value: "following", label: "팔로잉", href: "/explore/following" },
  { value: "followers", label: "팔로워", href: "/explore/followers" },
  { value: "similar", label: "취향 유사", href: "/explore/similar" },
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
