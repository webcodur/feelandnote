/*
  파일명: /components/features/home/TagQuickFilter.tsx
  기능: 태그 퀵필터 (탐색 페이지 상단)
  책임: 피처드 태그를 칩으로 표시하여 원클릭 필터 적용
*/
"use client";

import { Sparkles } from "lucide-react";
import type { TagCount } from "@/actions/home";

interface TagQuickFilterProps {
  tags: TagCount[];
  currentTagId: string;
  onTagSelect: (tagId: string) => void;
  isLoading?: boolean;
}

export default function TagQuickFilter({
  tags,
  currentTagId,
  onTagSelect,
  isLoading = false,
}: TagQuickFilterProps) {
  // 상위 4개만 표시
  const displayTags = tags.slice(0, 4);

  const activeTag = displayTags.find((t) => t.id === currentTagId);

  if (displayTags.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-accent" />
        <span className="text-xs text-text-secondary font-medium">지금 뜨는 컬렉션</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayTags.map((tag) => {
          const isActive = currentTagId === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => onTagSelect(isActive ? "" : tag.id)}
              disabled={isLoading}
              title={tag.description || undefined}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium
                border transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isActive
                  ? "border-transparent text-white"
                  : "border-border/50 text-text-secondary hover:border-accent/50 hover:text-text-primary bg-bg-card/50"
                }
              `}
              style={isActive ? { backgroundColor: tag.color } : undefined}
            >
              {tag.name}
              <span className="ml-1.5 text-xs opacity-70">
                {tag.count}
              </span>
            </button>
          );
        })}
      </div>
      {/* 선택된 태그 설명 */}
      {activeTag?.description && (
        <p className="mt-2 text-xs text-text-tertiary">
          {activeTag.description}
        </p>
      )}
    </div>
  );
}
