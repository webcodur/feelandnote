/*
  파일명: /components/features/user/lounge/LoungeTabs.tsx
  기능: 라운지 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Trophy, Target, TrendingUp, Clock, Rss } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";

const LOUNGE_TABS = [
  { value: "feed", label: "피드", icon: Rss, href: "/lounge/feed" },
  { value: "higher-lower", label: "업다운", icon: TrendingUp, href: "/lounge/higher-lower" },
  { value: "timeline", label: "연대기", icon: Clock, href: "/lounge/timeline" },
  { value: "tier-list", label: "티어리스트", icon: Trophy, href: "/lounge/tier-list" },
  { value: "blind-game", label: "블라인드 게임", icon: Target, href: "/lounge/blind-game" },
] as const;

export default function LoungeTabs() {
  const pathname = usePathname();

  // 현재 활성 탭 결정
  const activeTab = LOUNGE_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "higher-lower";

  return (
    <div className="relative">
      {/* Divine Lintel for Lounge */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-accent/20 shadow-glow" />

      <div className="pt-2 overflow-x-auto scrollbar-hidden flex justify-center">
        <div className="min-w-max">
          <Tabs>
            {LOUNGE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link key={tab.value} href={tab.href} className="no-underline">
                  <Tab
                    label={
                      <span className="flex items-center gap-1.5">
                        <Icon size={14} />
                        {tab.label}
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
