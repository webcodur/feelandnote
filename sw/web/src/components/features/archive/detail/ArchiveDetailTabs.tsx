/*
  파일명: /components/features/archive/detail/ArchiveDetailTabs.tsx
  기능: 기록관 상세 페이지 탭 네비게이션
  책임: 내 기록/피드 탭과 하위 탭(리뷰/노트/창작) 전환을 처리한다.
*/ // ------------------------------
"use client";

import Button from "@/components/ui/Button";

type MainTab = "myRecord" | "feed";
type SubTab = "review" | "note" | "creation";

interface ArchiveDetailTabsProps {
  activeTab: MainTab;
  activeSubTab: SubTab;
  onTabChange: (tab: MainTab) => void;
  onSubTabChange: (tab: SubTab) => void;
}

export default function ArchiveDetailTabs({
  activeTab,
  activeSubTab,
  onTabChange,
  onSubTabChange,
}: ArchiveDetailTabsProps) {
  return (
    <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2 -mb-2">
      <div className="flex bg-bg-secondary rounded-lg p-0.5 flex-shrink-0">
        <Button
          unstyled
          onClick={() => onTabChange("myRecord")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium ${
            activeTab === "myRecord" ? "bg-bg-card text-text-primary" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          내 기록
        </Button>
        <Button
          unstyled
          onClick={() => onTabChange("feed")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium ${
            activeTab === "feed" ? "bg-bg-card text-text-primary" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          피드
        </Button>
      </div>

      <div className="w-px h-5 bg-border flex-shrink-0" />

      <div className="flex gap-1 flex-shrink-0">
        {[
          { key: "review", label: "리뷰" },
          { key: "note", label: "노트" },
          { key: "creation", label: "창작" },
        ].map((subTab) => (
          <Button
            unstyled
            key={subTab.key}
            onClick={() => onSubTabChange(subTab.key as SubTab)}
            className={`px-2.5 py-1 rounded text-xs font-medium ${
              activeSubTab === subTab.key
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            }`}
          >
            {subTab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export type { MainTab, SubTab };
