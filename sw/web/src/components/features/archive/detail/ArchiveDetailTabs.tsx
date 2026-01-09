/*
  파일명: /components/features/archive/detail/ArchiveDetailTabs.tsx
  기능: 기록관 상세 페이지 탭 네비게이션
  책임: 리뷰/노트/창작 탭 전환을 처리한다.
*/ // ------------------------------
"use client";

import Button from "@/components/ui/Button";

type SubTab = "review" | "note" | "creation";

interface ArchiveDetailTabsProps {
  activeSubTab: SubTab;
  onSubTabChange: (tab: SubTab) => void;
}

const SUB_TABS = [
  { key: "review", label: "리뷰" },
  { key: "note", label: "노트" },
  { key: "creation", label: "창작" },
] as const;

export default function ArchiveDetailTabs({
  activeSubTab,
  onSubTabChange,
}: ArchiveDetailTabsProps) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {SUB_TABS.map((tab) => (
        <Button
          unstyled
          key={tab.key}
          onClick={() => onSubTabChange(tab.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
            activeSubTab === tab.key
              ? "bg-accent/20 text-accent"
              : "text-text-secondary hover:text-text-primary hover:bg-white/5"
          }`}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}

export type { SubTab };
