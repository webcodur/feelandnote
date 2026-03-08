/*
  파일명: /components/shared/HubNav.tsx
  기능: 허브 페이지 서브페이지 네비게이터
  책임: 가로 스크롤 칩으로 허브 섹션 항목과 독립 페이지를 구분 표기한다.
*/ // ------------------------------

"use client";

import { useRef } from "react";
import { Link } from "@/i18n/navigation";
import { hubSectionId } from "@/components/shared/HubSection";

export interface HubNavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface HubNavProps {
  /** 허브 섹션 항목 (페이지 내 실제 섹션 순서대로) */
  hubItems: HubNavItem[];
  /** 독립 페이지 (Nav에서만 접근 가능) */
  standaloneItems?: HubNavItem[];
  /** 허브 섹션 스크롤 네비게이션용 그룹 ID */
  groupId?: string;
}

export default function HubNav({ hubItems, standaloneItems, groupId }: HubNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleHubClick = (index: number) => {
    if (!groupId) return;
    const el = document.getElementById(hubSectionId(index, groupId));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
    >
      {/* 허브 섹션 항목 */}
      {hubItems.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={(e) => {
            if (groupId) {
              e.preventDefault();
              handleHubClick(i);
            }
          }}
          className="group shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-[#d4af37]/25 bg-[#d4af37]/5 text-[#d4af37]/80 hover:bg-[#d4af37]/15 hover:text-[#d4af37] hover:border-[#d4af37]/40"
        >
          <span className="text-[10px] font-mono text-[#d4af37]/40 group-hover:text-[#d4af37]/60 tabular-nums">
            {i + 1}/{hubItems.length}
          </span>
          <span className="whitespace-nowrap">{item.label}</span>
        </Link>
      ))}

      {/* 구분선 */}
      {standaloneItems && standaloneItems.length > 0 && (
        <div className="shrink-0 w-px h-5 bg-white/10 mx-1" />
      )}

      {/* 독립 페이지 */}
      {standaloneItems?.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-white/10 text-white/40 hover:bg-white/5 hover:text-white/70 hover:border-white/20"
        >
          {item.icon && (
            <span className="text-white/30 shrink-0">{item.icon}</span>
          )}
          <span className="whitespace-nowrap">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
