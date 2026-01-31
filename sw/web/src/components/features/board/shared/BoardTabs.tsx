/*
  파일명: /components/features/board/shared/BoardTabs.tsx
  기능: 게시판 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { FileText, MessageSquare } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";

const BOARD_TABS = [
  { value: "notice", label: "공지사항", icon: FileText, href: "/board/notice" },
  { value: "feedback", label: "피드백", icon: MessageSquare, href: "/board/feedback" },
] as const;

export default function BoardTabs() {
  const pathname = usePathname();

  const activeTab = BOARD_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "notice";

  return (
    <div className="relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-accent/20 shadow-glow" />

      <div className="pt-2 overflow-x-auto scrollbar-hidden flex justify-center">
        <div className="min-w-max">
          <Tabs>
            {BOARD_TABS.map((tab) => {
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
