/*
  파일명: /components/features/scriptures/ScripturesTabs.tsx
  기능: 지혜의 서고 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Scroll, Route, User, Clock } from "lucide-react";

const SCRIPTURES_TABS = [
  { value: "chosen", label: "다수의 선택", icon: Scroll, href: "/scriptures/chosen" },
  { value: "profession", label: "길의 갈래", icon: Route, href: "/scriptures/profession" },
  { value: "sage", label: "오늘의 인물", icon: User, href: "/scriptures/sage" },
  { value: "era", label: "세대의 경전", icon: Clock, href: "/scriptures/era" },
] as const;

export default function ScripturesTabs() {
  const pathname = usePathname();
  const activeTab = SCRIPTURES_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "chosen";

  return (
    <div className="mb-8">
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl overflow-x-auto scrollbar-hidden">
        {SCRIPTURES_TABS.map((tab) => {
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
