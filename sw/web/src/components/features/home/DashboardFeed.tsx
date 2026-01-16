"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { CATEGORIES, type ContentTypeFilterValue } from "@/constants/categories";
import type { ContentTypeCounts } from "@/actions/home";
import type { FriendActivityTypeCounts } from "@/actions/activity";
import FriendActivitySection from "./FriendActivitySection";
import CelebFeed from "./CelebFeed";

type TabType = "all" | "friend" | "celeb";

const TABS: { key: TabType; label: string }[] = [
  { key: "all", label: "전체 소식" },
  { key: "friend", label: "친구 동향" },
  { key: "celeb", label: "셀럽 아카이브" },
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
}

export default function DashboardFeed({
  userId,
  friendActivityCounts,
  celebContentCounts,
}: DashboardFeedProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null);
  const [contentType, setContentType] = useState<ContentTypeFilterValue>("all");
  const tabRefs = useRef<Map<TabType, HTMLButtonElement>>(new Map());
  const filterRefs = useRef<Map<ContentTypeFilterValue, HTMLButtonElement>>(new Map());
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  const isLoggedIn = !!userId;

  // 현재 탭에 맞는 counts 선택
  const currentCounts = activeTab === "celeb" ? celebContentCounts : friendActivityCounts;

  // 탭 밑줄 위치 계산
  useEffect(() => {
    const targetTab = hoveredTab ?? activeTab;
    const el = tabRefs.current.get(targetTab);
    if (el) {
      setUnderlineStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activeTab, hoveredTab]);

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
      <div className="flex flex-col items-center relative z-10">
        <div
          className="relative flex items-end gap-8 md:gap-16 border-b border-accent/20 px-8"
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
                className={`relative py-4 cursor-pointer transition-all duration-200 ${
                  isActive ? 'text-accent' : isHovered ? 'text-text-primary' : 'text-text-tertiary/40'
                }`}
              >
                <span className={`font-serif text-lg md:text-xl tracking-tight block transition-all duration-200 ${
                  isActive ? 'font-black' : isHovered ? 'font-semibold' : 'font-medium'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
          {/* 공유 밑줄 */}
          <div
            className="absolute bottom-0 h-[3px] bg-accent shadow-glow transition-all duration-300 ease-out"
            style={{ left: underlineStyle.left, width: underlineStyle.width }}
          />
        </div>
      </div>

      {/* 세그먼트 필터 (중앙 배치) */}
      <div className="flex justify-center">
        <div className="relative inline-flex items-center gap-1 p-1 bg-white/5 rounded-full border border-accent/10">
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
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "text-accent"
                    : "text-text-tertiary/60 hover:text-text-primary"
                }`}
              >
                {Icon && <Icon size={14} className={isActive ? "text-accent" : ""} />}
                <span className={`text-sm ${isActive ? "font-bold" : "font-medium"}`}>
                  {label}
                </span>
                {hasCount && (
                  <span className={`text-[10px] tabular-nums ${isActive ? "text-accent/70" : "text-text-tertiary/40"}`}>
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
        {/* 전체 소식 */}
        <div className={`transition-all duration-500 transform ${activeTab === "all" ? "opacity-100 translate-y-0 relative z-10" : "opacity-0 translate-y-4 absolute top-0 left-0 w-full -z-10 pointer-events-none"}`}>
          {isLoggedIn ? (
            <FriendActivitySection userId={userId!} contentType={contentType} hideFilter />
          ) : (
            <CelebFeed contentType={contentType} hideFilter />
          )}
        </div>
        {/* 친구 동향 */}
        <div className={`transition-all duration-500 transform ${activeTab === "friend" ? "opacity-100 translate-y-0 relative z-10" : "opacity-0 translate-y-4 absolute top-0 left-0 w-full -z-10 pointer-events-none"}`}>
          {isLoggedIn ? (
            <FriendActivitySection userId={userId!} contentType={contentType} hideFilter />
          ) : (
            <div className="py-10 text-center text-text-secondary font-serif">로그인이 필요합니다.</div>
          )}
        </div>
        {/* 셀럽 아카이브 */}
        <div className={`transition-all duration-500 transform ${activeTab === "celeb" ? "opacity-100 translate-y-0 relative z-10" : "opacity-0 translate-y-4 absolute top-0 left-0 w-full -z-10 pointer-events-none"}`}>
          <CelebFeed contentType={contentType} hideFilter />
        </div>
      </div>
    </div>
  );
}
