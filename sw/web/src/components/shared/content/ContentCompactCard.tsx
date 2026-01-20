/*
  파일명: /components/shared/content/ContentCompactCard.tsx
  기능: 컨텐츠 정보 컴팩트 카드
  책임: 컨텐츠 기본 정보(썸네일, 제목, 작가, 메타데이터)를 컴팩트하게 표시
*/ // ------------------------------
"use client";

import Link from "next/link";
import Image from "next/image";
import { Book, Star, Bookmark, Check } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";
import AddContentPopover from "./AddContentPopover";
import type { ContentStatus } from "@/types/database";

// #region 타입
export interface ContentCompactCardData {
  id: string;
  title: string;
  creator?: string;
  category: string;
  thumbnail?: string;
  subtype?: string;
  metadata?: Record<string, unknown>;
}

interface ContentCompactCardProps {
  data: ContentCompactCardData;
  href: string;
  onBeforeNavigate?: () => void;
  // 상태 표시
  isSaved?: boolean;
  // 추가 버튼
  showAddButton?: boolean;
  isAdding?: boolean;
  isAdded?: boolean;
  onAddWithStatus?: (status: ContentStatus) => void;
}
// #endregion

// #region 상수
const CATEGORY_ICONS: Record<string, React.ElementType> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.icon])
);
// #endregion

// #region 메타데이터 헬퍼
type MetadataValue = string | number | string[] | undefined;

const getMetaValue = (metadata: Record<string, unknown> | undefined, key: string): MetadataValue => {
  if (!metadata) return undefined;
  const val = metadata[key];
  if (typeof val === "string" || typeof val === "number") return val;
  if (Array.isArray(val) && val.every((v) => typeof v === "string")) return val as string[];
  return undefined;
};

function MetadataLine({ category, metadata, subtype }: { category: string; metadata?: Record<string, unknown>; subtype?: string }) {
  if (!metadata) return null;

  switch (category) {
    case "book": {
      const publisher = getMetaValue(metadata, "publisher");
      return publisher ? <span className="truncate">{publisher}</span> : null;
    }
    case "video": {
      const vote = getMetaValue(metadata, "voteAverage");
      const typeLabel = subtype === "movie" ? "영화" : subtype === "tv" ? "TV" : null;
      return (
        <span className="flex items-center gap-1">
          {vote && (
            <>
              <Star size={8} className="text-yellow-400 fill-yellow-400" />
              <span>{Number(vote).toFixed(1)}</span>
            </>
          )}
          {typeLabel && <span className="text-text-tertiary">· {typeLabel}</span>}
        </span>
      );
    }
    case "game": {
      const rating = getMetaValue(metadata, "rating");
      const platforms = getMetaValue(metadata, "platforms");
      return (
        <span className="flex items-center gap-1 truncate">
          {rating && (
            <>
              <Star size={8} className="text-yellow-400 fill-yellow-400" />
              <span>{Number(rating).toFixed(0)}</span>
            </>
          )}
          {Array.isArray(platforms) && platforms.length > 0 && (
            <span className="text-text-tertiary truncate">· {platforms.slice(0, 2).join(", ")}</span>
          )}
        </span>
      );
    }
    case "music": {
      const albumType = getMetaValue(metadata, "albumType");
      const tracks = getMetaValue(metadata, "totalTracks");
      return (
        <span className="truncate">
          {albumType}
          {tracks && <span className="text-text-tertiary"> · {tracks}곡</span>}
        </span>
      );
    }
    case "certificate": {
      const type = getMetaValue(metadata, "qualificationType");
      const series = getMetaValue(metadata, "series");
      return <span className="truncate">{type || series}</span>;
    }
    default:
      return null;
  }
}
// #endregion

// #region 컴포넌트
export default function ContentCompactCard({
  data,
  href,
  onBeforeNavigate,
  isSaved = false,
  showAddButton = false,
  isAdding = false,
  isAdded = false,
  onAddWithStatus,
}: ContentCompactCardProps) {
  const CategoryIcon = CATEGORY_ICONS[data.category] || Book;

  return (
    <Link
      href={href}
      onClick={() => onBeforeNavigate?.()}
      className="group relative bg-bg-card rounded overflow-hidden"
    >
      {/* 썸네일 */}
      <div className="relative aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden">
        {data.thumbnail ? (
          <Image src={data.thumbnail} alt={data.title} fill unoptimized className="object-cover" />
        ) : (
          <CategoryIcon size={24} className="text-gray-500" />
        )}

        {/* 보관됨 뱃지 */}
        {isSaved && (
          <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1 py-0.5 rounded bg-accent/90 text-white text-[9px] font-medium">
            <Bookmark size={8} className="fill-current" />
            <span>보관됨</span>
          </div>
        )}

        {/* 추가 버튼 */}
        {showAddButton && onAddWithStatus && (
          <div className="absolute top-1 right-1 hidden group-hover:block">
            {(isAdded || isSaved) ? (
              <div className="p-1 rounded-md bg-green-500/80 text-white">
                <Check size={12} />
              </div>
            ) : (
              <AddContentPopover
                onAdd={onAddWithStatus}
                isAdding={isAdding}
                isAdded={isAdded}
                size="sm"
              />
            )}
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="px-1 py-0.5">
        <h3 className="text-[11px] font-medium text-text-primary truncate">{data.title}</h3>
        <p className="text-[10px] text-text-secondary truncate">{data.creator?.replace(/\^/g, ', ')}</p>
        {/* 메타데이터 */}
        <div className="text-[9px] text-text-tertiary">
          <MetadataLine category={data.category} metadata={data.metadata} subtype={data.subtype} />
        </div>
      </div>
    </Link>
  );
}
// #endregion

// #region 그리드 컨테이너
interface ContentCompactGridProps {
  children: React.ReactNode;
}

export function ContentCompactGrid({ children }: ContentCompactGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-1">
      {children}
    </div>
  );
}
// #endregion
