/*
  파일명: /components/features/board/shared/BoardTabs.tsx
  기능: 게시판 탭 네비게이션
  책임: URL 기반으로 활성 탭을 결정하고 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { FileText, MessageSquare } from "lucide-react";

const BOARD_TABS = [
  { value: "notice", label: "공지사항", icon: FileText, href: "/board/notice" },
  { value: "feedback", label: "피드백", icon: MessageSquare, href: "/board/feedback" },
] as const;

export default function BoardTabs() {
  const pathname = usePathname();
  const activeTab = BOARD_TABS.find((tab) => pathname.startsWith(tab.href))?.value ?? "notice";

  return (
    <div className="mb-8">
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl overflow-x-auto scrollbar-hidden">
        {BOARD_TABS.map((tab) => {
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
