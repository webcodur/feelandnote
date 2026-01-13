/*
  파일명: /components/features/contents/ContentInfoHeader.tsx
  기능: 콘텐츠 정보 헤더 (검색/기록관 공통)
  책임: 콘텐츠 정보를 일관된 UI로 표시한다. 기록 관리 UI는 분리하여 전달받는다.
*/ // ------------------------------
"use client";

import Image from "next/image";
import { Calendar, User } from "lucide-react";
import { CATEGORIES, getCategoryById } from "@/constants/categories";
import ContentMetadataDisplay from "./ContentMetadataDisplay";
import type { ContentInfo } from "@/types/content";
import { Z_INDEX } from "@/constants/zIndex";

// #region 상수
const CATEGORY_ICONS = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.icon])
);

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.label])
);
// #endregion

// #region 타입
interface ContentInfoHeaderProps {
  content: ContentInfo
  variant: 'full' | 'compact'
  children?: React.ReactNode // 액션 버튼 영역 (추가/진행도 등)
}
// #endregion

export default function ContentInfoHeader({ content, variant, children }: ContentInfoHeaderProps) {
  const Icon = CATEGORY_ICONS[content.category] || CATEGORIES[0].icon;
  const categoryLabel = CATEGORY_LABELS[content.category] || content.category;

  // #region Full 버전 (검색 상세 페이지)
  if (variant === 'full') {
    return (
      <div className="relative mb-8">
        {/* 배경 블러 */}
        {content.thumbnail && (
          <div
            className="absolute inset-0 opacity-20 blur-3xl"
            style={{
              zIndex: Z_INDEX.background,
              backgroundImage: `url(${content.thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}

        <div className="flex gap-8">
          {/* 썸네일 */}
          <div className="relative w-52 h-80 rounded-2xl shadow-2xl shrink-0 overflow-hidden border border-white/10">
            {content.thumbnail ? (
              <Image src={content.thumbnail} alt={content.title} fill unoptimized className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <Icon size={64} className="text-gray-500" />
              </div>
            )}
          </div>

          {/* 정보 */}
          <div className="flex-1 py-4">
            {/* 카테고리 배지 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="py-1.5 px-4 bg-accent/20 text-accent rounded-full text-sm font-semibold flex items-center gap-2">
                <Icon size={16} /> {categoryLabel}
              </span>
            </div>

            {/* 제목 */}
            <h1 className="text-4xl font-bold mb-3 leading-tight">{content.title}</h1>

            {/* 작성자 */}
            {content.creator && (
              <p className="text-xl text-text-secondary mb-6 flex items-center gap-2">
                <User size={18} /> {content.creator.replace(/\^/g, ', ')}
              </p>
            )}

            {/* 출시일 */}
            <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-4">
              {content.releaseDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} /> {content.releaseDate}
                </span>
              )}
            </div>

            {/* 메타데이터 */}
            {content.metadata && (
              <div className="mb-8 p-4 bg-bg-card/50 rounded-xl border border-border">
                <ContentMetadataDisplay
                  category={content.category}
                  metadata={content.metadata}
                  subtype={content.subtype}
                />
              </div>
            )}

            {/* 액션 영역 (자식으로 전달) */}
            {children}
          </div>
        </div>
      </div>
    );
  }
  // #endregion

  // #region Compact 버전 (기록관 상세 페이지)
  return (
    <div className="flex gap-3 sm:gap-4">
      {/* 썸네일 */}
      <div className="relative w-16 h-24 sm:w-20 sm:h-[120px] rounded-lg shadow-lg shrink-0 overflow-hidden">
        {content.thumbnail ? (
          <Image src={content.thumbnail} alt={content.title} fill unoptimized className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <Icon size={24} className="text-gray-500" />
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        {/* 카테고리 배지 */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="py-0.5 px-2 bg-white/10 rounded text-[10px] font-medium text-text-secondary flex items-center gap-1">
            <Icon size={12} /> {categoryLabel}
          </span>
          {/* 액션 영역 (자식으로 전달 - 상태 드롭다운 등) */}
          {children}
        </div>

        {/* 제목 */}
        <h1 className="text-lg sm:text-xl font-bold leading-tight truncate mb-1">{content.title}</h1>

        {/* 작성자 */}
        <div className="text-xs sm:text-sm text-text-secondary truncate">
          {content.creator?.replace(/\^/g, ', ')}
        </div>

        {/* 메타데이터 */}
        {content.metadata && (
          <div className="mt-1.5">
            <ContentMetadataDisplay
              category={content.category}
              metadata={content.metadata}
              subtype={content.subtype}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
  // #endregion
}
