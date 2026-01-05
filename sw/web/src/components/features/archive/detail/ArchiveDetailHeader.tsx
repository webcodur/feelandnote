/*
  파일명: /components/features/archive/detail/ArchiveDetailHeader.tsx
  기능: 기록관 상세 페이지 헤더
  책임: 콘텐츠 정보 + 기록 관리 UI를 표시한다.
*/
"use client";

import { ArrowLeft, Trash2, Calendar, User } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";
import ContentMetadataDisplay from "@/components/features/contents/ContentMetadataDisplay";
import type { ContentStatus } from "@/actions/contents/addContent";
import type { UserContentWithDetails } from "@/actions/contents/getContent";
import type { ContentMetadata } from "@/types/content";
import type { CategoryId } from "@/constants/categories";

// #region 타입
interface ArchiveDetailHeaderProps {
  item: UserContentWithDetails;
  metadata: ContentMetadata | null;
  isSaving: boolean;
  onStatusChange: (status: ContentStatus) => void;
  onProgressChange: (progress: number) => void;
  onDelete: () => void;
}

const TYPE_TO_CATEGORY: Record<string, CategoryId> = {
  BOOK: "book",
  VIDEO: "video",
  GAME: "game",
  MUSIC: "music",
  CERTIFICATE: "certificate",
};

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: "WANT", label: "보고싶어요" },
  { value: "WATCHING", label: "보는 중" },
  { value: "FINISHED", label: "완료" },
];

const CATEGORY_CONFIG = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, { icon: cat.icon, label: cat.label }])
);
// #endregion

export default function ArchiveDetailHeader({
  item,
  metadata,
  isSaving,
  onStatusChange,
  onProgressChange,
  onDelete,
}: ArchiveDetailHeaderProps) {
  const content = item.content;
  const categoryId = TYPE_TO_CATEGORY[content.type] || "book";
  const category = CATEGORY_CONFIG[categoryId] || CATEGORY_CONFIG.book;
  const Icon = category.icon;

  const progressPercent = item.progress ?? 0;

  return (
    <>
      {/* 뒤로가기 */}
      <Button
        unstyled
        className="flex items-center gap-1.5 text-text-secondary text-sm mb-4 hover:text-text-primary"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={16} />
        <span>뒤로</span>
      </Button>

      {/* 콘텐츠 정보 카드 */}
      <Card className="p-0 mb-4">
        {/* 헤더 - 카테고리 & 삭제 버튼 */}
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="py-1 px-2 bg-accent/10 text-accent rounded-md text-[11px] font-semibold flex items-center gap-1">
              <Icon size={12} />
              {category.label}
            </span>
            {/* 상태 드롭다운 */}
            <select
              className="bg-white/5 border border-border text-text-primary py-0.5 px-1.5 rounded-md text-[11px] cursor-pointer outline-none focus:border-accent disabled:opacity-50"
              value={item.status}
              onChange={(e) => onStatusChange(e.target.value as ContentStatus)}
              disabled={isSaving || (progressPercent > 0 && item.status !== "FINISHED")}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Button
            unstyled
            onClick={onDelete}
            className="p-1 text-text-tertiary hover:text-red-400 hover:bg-red-400/10 rounded-md"
            title="삭제"
          >
            <Trash2 size={14} />
          </Button>
        </div>

        {/* 본문 - 콘텐츠 정보 */}
        <div className="p-3">
          <div className="flex gap-3">
            {/* 썸네일 */}
            <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg shadow-md shrink-0 overflow-hidden border border-white/10">
              {content.thumbnail_url ? (
                <img src={content.thumbnail_url} alt={content.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <Icon size={24} className="text-gray-500" />
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              {/* 제목 */}
              <h1 className="text-base sm:text-lg font-bold leading-tight mb-1 line-clamp-2">
                {content.title}
              </h1>

              {/* 작성자 */}
              {content.creator && (
                <p className="text-xs text-text-secondary flex items-center gap-1 mb-1.5">
                  <User size={12} className="shrink-0" />
                  <span className="truncate">{content.creator}</span>
                </p>
              )}

              {/* 출시일 */}
              {content.release_date && (
                <p className="text-[11px] text-text-tertiary flex items-center gap-1 mb-2">
                  <Calendar size={10} />
                  {content.release_date}
                </p>
              )}

              {/* 메타데이터 */}
              {metadata && (
                <ContentMetadataDisplay
                  category={categoryId}
                  metadata={metadata}
                  subtype={metadata?.subtype}
                  compact
                />
              )}
            </div>
          </div>

          {/* 진행도 바 */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-text-tertiary shrink-0">진행도</span>

              <div className="flex-1 relative">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={progressPercent}
                  onChange={(e) => onProgressChange(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <span className="text-xs font-semibold text-accent w-8 text-right">{progressPercent}%</span>

              <Button
                unstyled
                onClick={() => onProgressChange(Math.min(100, progressPercent + 10))}
                disabled={progressPercent >= 100}
                className="text-[10px] py-1 px-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +10%
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
