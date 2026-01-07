/*
  파일명: /components/features/archive/contentLibrary/section/CategorySection.tsx
  기능: 콘텐츠 타입별 섹션 컴포넌트
  책임: 카테고리(도서/영상/게임 등) 단위로 콘텐츠를 그룹핑하여 표시한다.
*/ // ------------------------------
"use client";

import { ChevronRight, ChevronDown, Book, Film, Gamepad2, Music, Award, ArrowRight } from "lucide-react";
import type { ContentType } from "@/types/database";
import Button from "@/components/ui/Button";

const MAX_ITEMS_PER_CATEGORY = 20;

const CATEGORY_INFO: Record<ContentType, { icon: typeof Book; label: string; color: string }> = {
  BOOK: { icon: Book, label: "도서", color: "text-amber-500" },
  VIDEO: { icon: Film, label: "영상", color: "text-red-500" },
  GAME: { icon: Gamepad2, label: "게임", color: "text-cyan-500" },
  MUSIC: { icon: Music, label: "음악", color: "text-green-500" },
  CERTIFICATE: { icon: Award, label: "자격증", color: "text-purple-500" },
};

interface CategorySectionProps {
  type: ContentType;
  totalItems: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onShowMore?: () => void;
  children: React.ReactNode;
}

export default function CategorySection({
  type,
  totalItems,
  isCollapsed,
  onToggle,
  onShowMore,
  children,
}: CategorySectionProps) {
  if (totalItems === 0) return null;

  const info = CATEGORY_INFO[type];
  const Icon = info.icon;
  const hasMore = totalItems > MAX_ITEMS_PER_CATEGORY;

  return (
    <div>
      <Button
        unstyled
        onClick={onToggle}
        className="flex items-center gap-2 mb-3 w-full text-left group"
      >
        <div className={`flex items-center gap-1.5 ${info.color}`}>
          {isCollapsed && <ChevronRight size={16} />}
          {!isCollapsed && <ChevronDown size={16} />}
          <Icon size={16} />
          <h3 className="text-sm font-bold">{info.label}</h3>
        </div>
        <span className="text-xs text-text-secondary">({totalItems})</span>
        <div className="flex-1 h-px bg-border ml-2 group-hover:bg-text-secondary/30" />
      </Button>

      {!isCollapsed && (
        <div>
          {children}
          {hasMore && onShowMore && (
            <Button
              unstyled
              onClick={onShowMore}
              className="mt-3 flex items-center gap-1 mx-auto px-3 py-1.5 text-xs text-accent hover:text-accent-hover"
            >
              <span>더보기 ({totalItems - MAX_ITEMS_PER_CATEGORY}개 더)</span>
              <ArrowRight size={14} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { CATEGORY_INFO, MAX_ITEMS_PER_CATEGORY };
