/*
  파일명: /components/features/agora/CelebFeedSection.tsx
  기능: 셀럽 피드 섹션
  책임: 셀럽 아카이브 피드와 콘텐츠 타입 필터를 보여준다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { CATEGORIES, type ContentTypeFilterValue } from "@/constants/categories";
import type { CelebReview } from "@/types/home";
import CelebFeed from "@/components/features/home/CelebFeed";

const CATEGORY_TABS: { value: ContentTypeFilterValue; label: string }[] = [
  { value: "all", label: "전체" },
  ...CATEGORIES.map((c) => ({ value: c.dbType as ContentTypeFilterValue, label: c.label })),
];

interface Props {
  initialReviews?: CelebReview[];
}

export default function CelebFeedSection({ initialReviews }: Props) {
  const [contentType, setContentType] = useState<ContentTypeFilterValue>("all");

  return (
    <div className="flex flex-col gap-8 md:gap-12">
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

      {/* 피드 콘텐츠 */}
      <div className="relative min-h-[400px]">
        <CelebFeed contentType={contentType} hideFilter initialReviews={initialReviews} />
      </div>
    </div>
  );
}
