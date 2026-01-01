/*
  파일명: /components/features/archive/detail/ArchiveDetailHeader.tsx
  기능: 기록관 상세 페이지 헤더
  책임: 콘텐츠 정보(공통) + 기록 관리(전용) UI를 표시한다.
*/
"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import type { ContentStatus } from "@/actions/contents/addContent";
import type { UserContentWithDetails } from "@/actions/contents/getContent";
import Button from "@/components/ui/Button";
import ContentInfoHeader from "@/components/features/contents/ContentInfoHeader";
import type { ContentInfo, ContentMetadata } from "@/types/content";
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

// DB 타입 → 카테고리 ID 변환
const TYPE_TO_CATEGORY: Record<string, CategoryId> = {
  BOOK: "book",
  VIDEO: "video",
  GAME: "game",
  MUSIC: "music",
  CERTIFICATE: "certificate",
};
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

  // ContentInfo 객체 생성
  const contentInfo: ContentInfo = {
    id: content.id,
    type: content.type as ContentInfo["type"],
    category: TYPE_TO_CATEGORY[content.type] || "book",
    title: content.title,
    creator: content.creator || undefined,
    thumbnail: content.thumbnail_url || undefined,
    description: content.description || undefined,
    releaseDate: content.release_date || undefined,
    subtype: metadata?.subtype,
    metadata,
  };

  return (
    <>
      {/* 뒤로가기 */}
      <Button
        unstyled
        className="flex items-center gap-1 text-text-secondary text-sm mb-3 hover:text-text-primary"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={16} />
        <span>뒤로</span>
      </Button>

      {/* 헤더 영역 */}
      <div className="flex flex-col sm:flex-row gap-4 pb-4 mb-4 border-b border-border">
        {/* 콘텐츠 정보 (공통 컴포넌트) */}
        <div className="flex-1">
          <ContentInfoHeader content={contentInfo} variant="compact">
            {/* 상태 드롭다운 */}
            <select
              className="bg-bg-secondary border border-border text-text-primary py-0.5 px-1.5 rounded text-[10px] cursor-pointer outline-none disabled:opacity-50"
              value={item.status}
              onChange={(e) => onStatusChange(e.target.value as ContentStatus)}
              disabled={isSaving || ((item.progress ?? 0) > 0 && item.status !== "COMPLETE")}
            >
              <option value="EXPERIENCE">감상 중</option>
              <option value="WISH">관심</option>
              <option value="COMPLETE">완료</option>
            </select>
          </ContentInfoHeader>
        </div>

        {/* 삭제 버튼 (모바일) */}
        <Button
          unstyled
          onClick={onDelete}
          className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded self-start sm:hidden absolute right-0 top-0"
          title="삭제"
        >
          <Trash2 size={16} />
        </Button>

        {/* 기록 관리 영역 (진행도, 삭제) */}
        <div className="flex items-center gap-3 sm:ml-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            {/* 진행도 슬라이더 */}
            <div className="relative flex-1 sm:w-32 group">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={item.progress ?? 0}
                onChange={(e) => onProgressChange(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-grab
                  [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${item.progress ?? 0}%, rgba(255,255,255,0.1) ${item.progress ?? 0}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
            </div>
            <span className="text-xs font-semibold text-accent w-8">{item.progress ?? 0}%</span>
            <Button
              unstyled
              onClick={() => onProgressChange(Math.min(100, (item.progress ?? 0) + 10))}
              className="text-[10px] py-1 px-2 bg-white/5 hover:bg-accent/20 text-text-secondary hover:text-accent rounded whitespace-nowrap"
            >
              +10%
            </Button>
          </div>

          {/* 삭제 버튼 (데스크톱) */}
          <Button
            unstyled
            onClick={onDelete}
            className="hidden sm:block p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded"
            title="삭제"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
    </>
  );
}
