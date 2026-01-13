/*
  파일명: /components/features/archive/detail/ArchiveDetailHeader.tsx
  기능: 기록관 상세 페이지 헤더
  책임: 콘텐츠 정보 + 기록 관리 UI를 표시한다.
*/
"use client";

import Image from "next/image";
import { ArrowLeft, Trash2, Calendar, User } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";
import ContentMetadataDisplay from "@/components/shared/content/ContentMetadataDisplay";
import type { ContentStatus } from "@/types/database";
import type { UserContentWithDetails } from "@/actions/contents/getContent";
import type { ContentMetadata } from "@/types/content";
import type { CategoryId } from "@/constants/categories";

// #region 타입
interface ArchiveDetailHeaderProps {
  item: UserContentWithDetails;
  metadata: ContentMetadata | null;
  isSaving: boolean;
  onStatusChange: (status: ContentStatus) => void;
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
  { value: "WANT", label: "관심" },
  { value: "WATCHING", label: "진행중" },
  { value: "DROPPED", label: "중단" },
  { value: "FINISHED", label: "완료" },
  { value: "RECOMMENDED", label: "완료+추천" },
  { value: "NOT_RECOMMENDED", label: "완료+비추" },
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
  onDelete,
}: ArchiveDetailHeaderProps) {
  const content = item.content;
  const categoryId = TYPE_TO_CATEGORY[content.type] || "book";
  const category = CATEGORY_CONFIG[categoryId] || CATEGORY_CONFIG.book;
  const Icon = category.icon;

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
              disabled={isSaving}
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
            <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-lg shadow-md shrink-0 overflow-hidden border border-white/10">
              {content.thumbnail_url ? (
                <Image src={content.thumbnail_url} alt={content.title} fill unoptimized className="object-cover" />
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
                  <span className="truncate">{content.creator?.replace(/\^/g, ', ')}</span>
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
        </div>
      </Card>
    </>
  );
}
