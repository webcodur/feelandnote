/*
  파일명: /components/features/home/TagQuickFilter.tsx
  기능: 태그 퀵필터 (탐색 페이지 상단)
  책임: 최근 선택된 3개 태그를 표시, 선택 히스토리는 localStorage에 저장
*/
"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { FilterModal, type FilterOption } from "@/components/shared/filters";
import type { TagCount } from "@/actions/home";

const STORAGE_KEY = "celeb-tag-recent";
const MAX_RECENT_TAGS = 3;

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
  const [showAllTags, setShowAllTags] = useState(false);
  const [recentTagIds, setRecentTagIds] = useState<string[]>([]);

  // localStorage에서 최근 태그 불러오기
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentTagIds(parsed.filter((id) => tags.some((t) => t.id === id)));
        }
      } catch {
        // ignore
      }
    } else {
      // 초기값: 상위 3개 태그
      setRecentTagIds(tags.slice(0, MAX_RECENT_TAGS).map((t) => t.id));
    }
  }, [tags]);

  // 태그 선택 시 최근 목록 갱신
  const handleTagSelect = useCallback((tagId: string) => {
    if (tagId) {
      setRecentTagIds((prev) => {
        const filtered = prev.filter((id) => id !== tagId);
        const updated = [tagId, ...filtered].slice(0, MAX_RECENT_TAGS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
    onTagSelect(tagId);
  }, [onTagSelect]);

  // 표시할 태그: 최근 선택된 3개
  const displayTags = recentTagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is TagCount => t !== undefined);

  const activeTag = tags.find((t) => t.id === currentTagId);

  // 전체 태그 옵션 생성 (모달용)
  const allTagOptions: FilterOption[] = [
    { value: "", label: "전체" },
    ...tags.map((t) => ({ value: t.id, label: t.name, count: t.count })),
  ];

  // 추가 태그 수 (표시된 3개 외)
  const remainingCount = tags.length - displayTags.length;

  if (tags.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Sparkles size={14} className="text-accent" />
        <span className="text-xs text-text-secondary font-medium">지금 뜨는 컬렉션</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {displayTags.map((tag) => {
          const isActive = currentTagId === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => handleTagSelect(isActive ? "" : tag.id)}
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
        {/* 전체 보기 버튼 */}
        {remainingCount > 0 && (
          <button
            onClick={() => setShowAllTags(true)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-full text-sm font-medium border border-border/50 text-text-secondary hover:border-accent/50 hover:text-text-primary bg-bg-card/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            전체 +{remainingCount}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      {/* 선택된 태그 설명 */}
      {activeTag?.description && (
        <p className="mt-2 text-xs text-text-tertiary text-center">
          {activeTag.description}
        </p>
      )}

      {/* 전체 태그 모달 */}
      <FilterModal
        title="컬렉션"
        isOpen={showAllTags}
        current={currentTagId}
        options={allTagOptions}
        onClose={() => setShowAllTags(false)}
        onChange={handleTagSelect}
      />
    </div>
  );
}
