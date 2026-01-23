/*
  파일명: /components/features/contents/ContentMetadataDisplay.tsx
  기능: 콘텐츠 타입별 메타데이터 표시
  책임: API에서 가져온 메타데이터를 타입별로 적절한 UI로 표시한다.
*/ // ------------------------------
"use client";

import {
  Book,
  Building2,
  Tv,
  Star,
  Gamepad2,
  Music,
  Award,
  FileText,
  Disc3,
  ExternalLink,
  Calendar,
} from "lucide-react";
import type { ContentMetadata } from "@/types/content";

interface ContentMetadataDisplayProps {
  category: string;
  metadata: ContentMetadata | null;
  subtype?: string;
  compact?: boolean;
  hideLink?: boolean;
}

export default function ContentMetadataDisplay({
  category,
  metadata,
  subtype,
  compact = false,
  hideLink = false,
}: ContentMetadataDisplayProps) {
  if (!metadata) return null;

  // 정보 아이템
  const InfoItem = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
  }) => (
    <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <Icon size={compact ? 12 : 14} className="text-text-primary/60 shrink-0" />
      <span className="text-text-primary/60">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );

  // 태그 리스트
  const TagList = ({ items, label }: { items: string[]; label: string }) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`${compact ? "text-xs" : "text-sm"} text-text-primary/60`}>{label}</span>
      {items.slice(0, compact ? 3 : 5).map((item, i) => (
        <span
          key={i}
          className={`px-2 py-0.5 bg-white/10 rounded-md ${compact ? "text-[10px]" : "text-xs"} text-white`}
        >
          {item}
        </span>
      ))}
      {items.length > (compact ? 3 : 5) && (
        <span className="text-xs text-text-primary/60">+{items.length - (compact ? 3 : 5)}</span>
      )}
    </div>
  );

  // metadata에서 값 추출
  const {
    publisher,
    publishDate,
    isbn,
    link,
    voteAverage,
    genres,
    developer,
    rating,
    platforms,
    albumType,
    totalTracks,
    artists,
    spotifyUrl,
    qualificationType,
    series,
    majorField,
  } = metadata;

  switch (category.toLowerCase()) {

    // 책
    case "book":
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {publisher && <InfoItem icon={Building2} label="출판사" value={publisher} />}
          {publishDate && <InfoItem icon={Calendar} label="출판일" value={publishDate} />}
          {!compact && isbn && <InfoItem icon={Book} label="ISBN" value={isbn} />}
          {!hideLink && link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-accent hover:underline ${compact ? "text-[11px]" : "text-xs"}`}
            >
              <ExternalLink size={compact ? 10 : 12} />
              상세정보 보기
            </a>
          )}
        </div>
      );

    // 영화/TV 프로그램
    case "video":
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {subtype && (
            <InfoItem icon={Tv} label="유형" value={subtype === "movie" ? "영화" : "TV 프로그램"} />
          )}
          {voteAverage !== undefined && (
            <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
              <Star size={compact ? 12 : 14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-text-primary/60">평점</span>
              <span className="text-white font-medium">{voteAverage.toFixed(1)}</span>
            </div>
          )}
          {genres && genres.length > 0 && <TagList items={genres} label="장르" />}
        </div>
      );

    // 게임
    case "game":
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {developer && <InfoItem icon={Gamepad2} label="개발사" value={developer} />}
          {!compact && publisher && <InfoItem icon={Building2} label="퍼블리셔" value={publisher} />}
          {rating !== undefined && (
            <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
              <Star size={compact ? 12 : 14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-text-primary/60">평점</span>
              <span className="text-white font-medium">{rating}점</span>
            </div>
          )}
          {platforms && platforms.length > 0 && <TagList items={platforms} label="플랫폼" />}
          {!compact && genres && genres.length > 0 && <TagList items={genres} label="장르" />}
        </div>
      );

    // 음악
    case "music":
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {albumType && <InfoItem icon={Disc3} label="앨범 유형" value={albumType} />}
          {totalTracks !== undefined && (
            <InfoItem icon={Music} label="수록곡" value={`${totalTracks}곡`} />
          )}
          {!compact && artists && artists.length > 1 && <TagList items={artists} label="아티스트" />}
          {!compact && spotifyUrl && (
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <ExternalLink size={14} />
              Spotify에서 듣기
            </a>
          )}
        </div>
      );

    // 자격증
    case "certificate":
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {qualificationType && (
            <InfoItem icon={Award} label="자격 유형" value={qualificationType} />
          )}
          {series && <InfoItem icon={Building2} label="계열" value={series} />}
          {!compact && majorField && <InfoItem icon={FileText} label="직무분야" value={majorField} />}
        </div>
      );

    default:
      return null;
  }
}
