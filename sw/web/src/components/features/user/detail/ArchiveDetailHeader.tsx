/*
  파일명: /components/features/user/detail/ArchiveDetailHeader.tsx
  기능: 기록관 상세 페이지 헤더
  책임: 콘텐츠 정보 + 기록 관리 UI를 표시한다.
*/
"use client";

import Image from "next/image";
import { ArrowLeft, Trash2, Calendar } from "lucide-react";
import { CATEGORIES, TYPE_TO_CATEGORY_ID } from "@/constants/categories";
import { BLUR_DATA_URL } from "@/constants/image";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";
import ContentMetadataDisplay from "@/components/shared/content/ContentMetadataDisplay";
import type { ContentStatus, ContentType } from "@/types/database";
import type { UserContentWithDetails } from "@/actions/contents/getContent";
import FormattedText from "@/components/ui/FormattedText";

// #region 타입
interface ArchiveDetailHeaderProps {
  item: UserContentWithDetails;
  metadata: Record<string, unknown> | null;
  isSaving: boolean;
  isOwner: boolean;
  onStatusChange: (status: ContentStatus) => void;
  onDelete: () => void;
}

const CATEGORY_CONFIG = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, { icon: cat.icon, label: cat.label }])
);
// #endregion

export default function ArchiveDetailHeader({
  item,
  metadata,
  isSaving,
  isOwner,
  onStatusChange,
  onDelete,
}: ArchiveDetailHeaderProps) {
  const content = item.content;
  const categoryId = TYPE_TO_CATEGORY_ID[content.type as ContentType] || "book";
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
        {/* 본문 - 2열 레이아웃: 썸네일(좁게) | 메타+설명(넓게) */}
        <div className="p-3">
          <div className="flex gap-4">
            {/* 1열: 썸네일 + 오버레이 */}
            <div className="relative w-32 sm:w-40 shrink-0">
              <div className="relative aspect-[2/3] rounded-lg shadow-lg overflow-hidden border border-white/10">
                {content.thumbnail_url ? (
                  <Image src={content.thumbnail_url} alt={content.title} fill unoptimized className="object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <Icon size={32} className="text-gray-500" />
                  </div>
                )}
                {/* 좌상단 카테고리 배지 */}
                <span className="absolute top-2 left-2 py-0.5 px-1.5 bg-black/70 backdrop-blur-sm text-white rounded text-[11px] font-semibold flex items-center gap-1">
                  <Icon size={11} />
                  {category.label}
                </span>
                {/* 하단 오버레이 */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 pt-8">
                  <h1 className="text-base font-bold leading-tight line-clamp-2 text-white">
                    {content.title}
                  </h1>
                  {content.creator && (
                    <p className="text-xs text-white/70 truncate mt-0.5">
                      {content.creator?.replace(/\^/g, ', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2열: 메타데이터 + 설명 (스크롤 영역) */}
            <div className="flex-1 min-w-0 max-h-[200px] sm:max-h-[240px] overflow-y-auto pr-1">
              {/* 상단: 메타데이터 + 상세정보 링크 */}
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex flex-col gap-2">
                  {content.release_date && (
                    <p className="text-sm text-text-primary/70 flex items-center gap-1.5">
                      <Calendar size={14} className="text-text-primary/50" />
                      {content.release_date}
                    </p>
                  )}
                  {metadata && (
                    <ContentMetadataDisplay
                      category={categoryId}
                      metadata={metadata}
                      subtype={(metadata as Record<string, unknown>).subtype as string | undefined}
                      hideLink
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!!metadata?.link && (
                    <a
                      href={metadata.link as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      상세정보
                      <ArrowLeft size={12} className="rotate-[135deg]" />
                    </a>
                  )}
                  {isOwner && (
                    <Button
                      unstyled
                      onClick={onDelete}
                      className="p-1.5 text-text-tertiary hover:text-red-400 hover:bg-red-400/10 rounded-md"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>

              {/* 설명 - API 메타데이터 우선, DB 데이터 fallback */}
              {(() => {
                const description = (metadata?.description as string) || content.description;
                if (!description) return null;
                return (
                  <FormattedText
                    text={description}
                    className="text-sm text-white/80 leading-relaxed whitespace-pre-line block"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
