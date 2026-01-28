"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { CATEGORIES, type ContentTypeFilterValue } from "@/constants/categories";
import type { ContentTypeCounts } from "@/actions/home";
import type { FriendActivityTypeCounts } from "@/actions/activity";
import type { CelebReview } from "@/types/home";
import FriendActivitySection from "./FriendActivitySection";
import CelebFeed from "./CelebFeed";

type TabType = "celeb" | "friend";

const TABS: { key: TabType; label: string }[] = [
  { key: "celeb", label: "셀럽 아카이브" },
  { key: "friend", label: "친구 동향" },
];

// 세그먼트 필터 아이템
const SEGMENT_FILTERS: { value: ContentTypeFilterValue; label: string; icon?: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { value: "all", label: "전체", icon: Sparkles },
  ...CATEGORIES.map((c) => ({ value: c.dbType as ContentTypeFilterValue, label: c.label, icon: c.icon })),
];

interface DashboardFeedProps {
  userId?: string;
  friendActivityCounts?: FriendActivityTypeCounts;
  celebContentCounts?: ContentTypeCounts;
  initialReviews?: CelebReview[];
}

export default function DashboardFeed({
  userId,
  friendActivityCounts,
  celebContentCounts,
  initialReviews,
}: DashboardFeedProps) {
  const [activeTab, setActiveTab] = useState<TabType>("celeb");
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null);
  const [contentType, setContentType] = useState<ContentTypeFilterValue>("all");
  const tabRefs = useRef<Map<TabType, HTMLButtonElement>>(new Map());
  const filterRefs = useRef<Map<ContentTypeFilterValue, HTMLButtonElement>>(new Map());
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  const isLoggedIn = !!userId;

  // 현재 탭에 맞는 counts 선택
  const currentCounts = activeTab === "celeb" ? celebContentCounts : friendActivityCounts;

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

    // 윈도우 리사이즈 및 탭 너비 변화 감지
    const handleResize = () => updateUnderline();
    window.addEventListener("resize", handleResize);

    const observers: ResizeObserver[] = [];
    tabRefs.current.forEach((el) => {
      if (el) {
        const observer = new ResizeObserver(() => updateUnderline());
        observer.observe(el);
        observers.push(observer);
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      observers.forEach(obs => obs.disconnect());
    };
  }, [updateUnderline]);

  // 필터 pill 위치 계산
  useEffect(() => {
    const el = filterRefs.current.get(contentType);
    if (el) {
      setPillStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [contentType]);

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
                className={`relative py-3 md:py-4 cursor-pointer transition-all duration-200 whitespace-nowrap px-1 md:px-0 ${
                  isActive ? 'text-accent' : isHovered ? 'text-text-primary' : 'text-text-tertiary/40'
                }`}
              >
                <span className={`font-serif text-[13px] sm:text-base md:text-xl tracking-tighter block transition-all duration-200 ${
                  isActive ? 'font-black' : isHovered ? 'font-semibold' : 'font-medium'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
          {/* 공유 밑줄: 위치를 bottom-0으로 조정하여 보더와 일치시킴 */}
          <div
            className="absolute bottom-0 h-[2px] md:h-[3px] bg-accent shadow-none md:shadow-[0_0_15px_rgba(212,175,55,0.8),0_0_5px_rgba(212,175,55,1)] transition-all duration-300 ease-out z-20"
            style={{ left: underlineStyle.left, width: underlineStyle.width }}
          />
        </div>
      </div>

      {/* 세그먼트 필터 (중앙 배치) */}
      <div className="flex justify-center w-full px-1 sm:px-4">
        <div className="relative inline-flex items-center gap-0.5 p-1 bg-white/5 rounded-full border border-accent/10 overflow-x-auto scrollbar-hide max-w-full">
          {/* 슬라이딩 pill 배경 */}
          <div
            className="absolute top-1 bottom-1 bg-accent/20 rounded-full border border-accent/30 shadow-[0_0_12px_rgba(212,175,55,0.15)] transition-all duration-300 ease-out"
            style={{ left: pillStyle.left, width: pillStyle.width }}
          />
          {SEGMENT_FILTERS.map(({ value, label, icon: Icon }) => {
            const isActive = contentType === value;
            const count = currentCounts?.[value];
            const hasCount = count !== undefined && count > 0;

            return (
              <button
                key={value}
                ref={(el) => { if (el) filterRefs.current.set(value, el); }}
                onClick={() => setContentType(value)}
                className={`relative z-10 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "text-accent"
                    : "text-text-tertiary/60 hover:text-text-primary"
                }`}
              >
                {Icon && <Icon size={12} className={isActive ? "text-accent" : ""} />}
                <span className={`text-[11px] sm:text-xs md:text-sm ${isActive ? "font-bold" : "font-medium"}`}>
                  {label}
                </span>
                {hasCount && (
                  <span className={`text-[9px] md:text-[10px] tabular-nums ${isActive ? "text-accent/70" : "text-text-tertiary/40"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="relative min-h-[400px]">
        {/* 셀럽 아카이브 */}
        <div className={`transition-all duration-500 transform ${activeTab === "celeb" ? "opacity-100 translate-y-0 relative z-10" : "opacity-0 translate-y-4 absolute top-0 left-0 w-full -z-10 pointer-events-none"}`}>
          <CelebFeed contentType={contentType} hideFilter initialReviews={initialReviews} />
        </div>
        {/* 친구 동향 */}
        <div className={`transition-all duration-500 transform ${activeTab === "friend" ? "opacity-100 translate-y-0 relative z-10" : "opacity-0 translate-y-4 absolute top-0 left-0 w-full -z-10 pointer-events-none"}`}>
          {isLoggedIn ? (
            <FriendActivitySection userId={userId!} contentType={contentType} hideFilter />
          ) : (
            <div className="py-10 text-center text-text-secondary font-serif">로그인이 필요합니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
