"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CATEGORIES, type ContentTypeFilterValue } from "@/constants/categories";
import type { CelebReview } from "@/types/home";
import FriendActivitySection from "./FriendActivitySection";
import CelebFeed from "./CelebFeed";

type TabType = "celeb" | "friend";

const TABS: { key: TabType; label: string }[] = [
  { key: "celeb", label: "셀럽 아카이브" },
  { key: "friend", label: "친구 동향" },
];

// 카테고리 탭
const CATEGORY_TABS: { value: ContentTypeFilterValue; label: string }[] = [
  { value: "all", label: "전체" },
  ...CATEGORIES.map((c) => ({ value: c.dbType as ContentTypeFilterValue, label: c.label })),
];

interface DashboardFeedProps {
  userId?: string;
  initialReviews?: CelebReview[];
}

export default function DashboardFeed({
  userId,
  initialReviews,
}: DashboardFeedProps) {
  const [activeTab, setActiveTab] = useState<TabType>("celeb");
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null);
  const [contentType, setContentType] = useState<ContentTypeFilterValue>("all");
  const tabRefs = useRef<Map<TabType, HTMLButtonElement>>(new Map());
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  const isLoggedIn = !!userId;

  // 탭 밑줄 위치 및 너비 계산 로직
  const updateUnderline = useCallback(() => {
    const targetTab = hoveredTab ?? activeTab;
    const el = tabRefs.current.get(targetTab);
    if (el) {
      setUnderlineStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activeTab, hoveredTab]);

  useEffect(() => {
    updateUnderline();

    // 윈도우 리사이즈 감지
    const handleResize = () => updateUnderline();
    window.addEventListener("resize", handleResize);

    // 단일 ResizeObserver로 모든 탭 요소 관찰
    const observer = new ResizeObserver(() => updateUnderline());
    tabRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [updateUnderline]);

  return (
    <div className="flex flex-col gap-8 md:gap-12">
      {/* 탭 헤더 */}
      <div className="flex flex-col items-center relative z-10 w-full">
        <div
          className="relative flex items-end gap-2 sm:gap-6 md:gap-16 border-b border-accent/20 px-2 sm:px-4 md:px-8 overflow-x-hidden max-w-full justify-center"
          onMouseLeave={() => setHoveredTab(null)}
        >
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            const isHovered = hoveredTab === key;
            return (
              <button
                key={key}
                ref={(el) => { if (el) tabRefs.current.set(key, el); }}
                onClick={() => setActiveTab(key)}
                onMouseEnter={() => setHoveredTab(key)}
                className={`relative py-3 md:py-4 cursor-pointer whitespace-nowrap px-1 md:px-0 ${
                  isActive ? 'text-accent' : isHovered ? 'text-text-primary' : 'text-text-tertiary/40'
                }`}
              >
                <span className={`font-serif text-[13px] sm:text-base md:text-xl tracking-tighter block ${
                  isActive ? 'font-black' : isHovered ? 'font-semibold' : 'font-medium'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
          {/* 공유 밑줄 */}
          <div
            className="absolute bottom-0 h-[2px] md:h-[3px] bg-accent shadow-none md:shadow-[0_0_15px_rgba(212,175,55,0.8),0_0_5px_rgba(212,175,55,1)] z-20"
            style={{ left: underlineStyle.left, width: underlineStyle.width }}
          />
        </div>
      </div>

      {/* 카테고리 탭 (석판 스타일) */}
      <div className="flex justify-center overflow-x-auto pb-4 scrollbar-hidden">
        <div className="inline-flex min-w-max p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
          {CATEGORY_TABS.map((tab) => {
            const isActive = contentType === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setContentType(tab.value)}
                className={`
                  relative px-4 py-2 rounded-lg text-sm font-bold
                  ${isActive
                    ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <span className={isActive ? "font-serif text-black" : "font-sans"}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="relative min-h-[400px]">
        {activeTab === "celeb" && (
          <CelebFeed contentType={contentType} hideFilter initialReviews={initialReviews} />
        )}
        {activeTab === "friend" && (
          isLoggedIn ? (
            <FriendActivitySection userId={userId!} contentType={contentType} hideFilter />
          ) : (
            <div className="py-10 text-center text-text-secondary font-serif">로그인이 필요합니다.</div>
          )
        )}
      </div>
    </div>
  );
}
