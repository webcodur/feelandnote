/*
  파일명: /components/features/user/explore/ExploreTabs.tsx
  기능: 탐색 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Users, Sparkles, Star, UserCheck, UserPlus } from "lucide-react";

const EXPLORE_TABS = [
  { value: "celebs", label: "셀럽", icon: Sparkles, href: "/explore/celebs" },
  { value: "friends", label: "친구", icon: Users, href: "/explore/friends" },
  { value: "following", label: "팔로잉", icon: UserCheck, href: "/explore/following" },
  { value: "followers", label: "팔로워", icon: UserPlus, href: "/explore/followers" },
  { value: "similar", label: "취향 유사", icon: Star, href: "/explore/similar" },
] as const;

export default function ExploreTabs() {
  const pathname = usePathname();
  const activeTab = EXPLORE_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "celebs";

  return (
    <div className="mb-8">
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl overflow-x-auto scrollbar-hidden">
        {EXPLORE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm whitespace-nowrap
                ${isActive
                  ? "bg-accent text-bg-main"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }
              `}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
