/*
  파일명: /components/features/scriptures/ScripturesTabs.tsx
  기능: 지혜의 서고 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Scroll, Route, User, Clock } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";

const SCRIPTURES_TABS = [
  { value: "chosen", label: "인물들의 선택", icon: Scroll, href: "/scriptures/chosen" },
  { value: "profession", label: "길의 갈래", icon: Route, href: "/scriptures/profession" },
  { value: "sage", label: "오늘의 인물", icon: User, href: "/scriptures/sage" },
  { value: "era", label: "세대의 경전", icon: Clock, href: "/scriptures/era" },
] as const;

export default function ScripturesTabs() {
  const pathname = usePathname();

  const activeTab = SCRIPTURES_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "chosen";

  return (
    <div className="relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-accent/20 shadow-glow" />

      <div className="pt-2 overflow-x-auto scrollbar-hidden flex justify-center">
        <div className="min-w-max">
          <Tabs>
            {SCRIPTURES_TABS.map((tab) => {
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
