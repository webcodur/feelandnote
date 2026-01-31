/*
  파일명: /components/features/user/explore/ExploreTabs.tsx
  기능: 탐색 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Users, Sparkles, Star, UserCheck, UserPlus } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";

interface ExploreTabsProps {
  counts?: {
    celebs: number;
    friends: number;
    following: number;
    followers: number;
    similar: number;
  };
}

const EXPLORE_TABS = [
  { value: "celebs", label: "셀럽", icon: Sparkles, href: "/explore/celebs" },
  { value: "friends", label: "친구", icon: Users, href: "/explore/friends" },
  { value: "following", label: "팔로잉", icon: UserCheck, href: "/explore/following" },
  { value: "followers", label: "팔로워", icon: UserPlus, href: "/explore/followers" },
  { value: "similar", label: "취향 유사", icon: Star, href: "/explore/similar" },
] as const;

export default function ExploreTabs({ counts }: ExploreTabsProps) {
  const pathname = usePathname();

  const activeTab = EXPLORE_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "celebs";

  return (
    <div className="relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-accent/20 shadow-glow" />

      {/* Shadow Overlay Faders */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg-main to-transparent z-10 pointer-events-none md:hidden" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-main to-transparent z-10 pointer-events-none md:hidden" />

      <div className="pt-2 overflow-x-auto scrollbar-hidden flex justify-center">
        <div className="min-w-max">
          <Tabs>
            {EXPLORE_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = counts?.[tab.value as keyof typeof counts];
              return (
                <Link key={tab.value} href={tab.href} className="no-underline">
                  <Tab
                    label={
                      <span className="flex items-center gap-1.5">
                        <Icon size={14} className={activeTab === tab.value ? "text-accent" : ""} />
                        <span>{tab.label}</span>
                        {count !== undefined && (
                          <span className={`text-xs ${activeTab === tab.value ? "text-accent/80" : "text-text-tertiary"}`}>
                            {count}
                          </span>
                        )}
                      </span>
                    }
                    active={activeTab === tab.value}
                  />
                </Link>
              );
            })}
          </Tabs>
        </div>
      </div>

      <div className="w-full h-px bg-accent/10 mt-4 mb-8" />
    </div>
  );
}
