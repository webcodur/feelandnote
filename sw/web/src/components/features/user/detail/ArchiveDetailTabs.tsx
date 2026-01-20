/*
  파일명: /components/features/user/detail/ArchiveDetailTabs.tsx
  기능: 기록관 상세 페이지 탭 네비게이션
  책임: 리뷰/노트/창작 탭 전환을 처리한다.
*/

"use client";

import { Tabs, Tab } from "@/components/ui/Tab";

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
    <div className="mb-4">
      <Tabs>
        {SUB_TABS.map((tab) => (
          <Tab
            key={tab.key}
            label={tab.label}
            active={activeSubTab === tab.key}
            onClick={() => onSubTabChange(tab.key)}
          />
        ))}
      </Tabs>
    </div>
  );
}

export type { SubTab };
