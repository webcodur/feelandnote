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
import { useTranslations } from "next-intl";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";

interface Props {
  initialReviews?: CelebReview[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
}

export default function CelebFeedSection({ initialReviews, initialCursor, initialHasMore }: Props) {
  const [contentType, setContentType] = useState<ContentTypeFilterValue>("all");
  const t = useTranslations("content.category");

  const tabs: { value: ContentTypeFilterValue; label: string }[] = [
    { value: "all", label: t("all") },
    ...CATEGORIES.map((c) => ({
      value: c.dbType as ContentTypeFilterValue,
      label: t(c.id),
    })),
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-12">
      <CategoryTabFilter media options={tabs} value={contentType} onChange={setContentType} wrap />

      {/* 피드 콘텐츠 */}
      <div className="relative min-h-[400px]">
        <CelebFeed contentType={contentType} hideFilter initialReviews={initialReviews} initialCursor={initialCursor} initialHasMore={initialHasMore} />
      </div>
    </div>
  );
}
