/*
  파일명: /components/features/contents/ContentMetadataDisplay.tsx
  기능: 콘텐츠 타입별 메타데이터 표시
  책임: API에서 가져온 메타데이터를 타입별로 적절한 UI로 표시한다.
*/ // ------------------------------
"use client";

import {
  Building2,
  Tv,
  Star,
  Gamepad2,
  Music,
  Disc3,
  ExternalLink,
} from "lucide-react";
import type { ContentMetadata } from "@/types/content";
import { useTranslations } from "next-intl";
import BookMetadata from "./contentMetadata/BookMetadata";

interface ContentMetadataDisplayProps {
  category: string;
  metadata: ContentMetadata | null;
  subtype?: string;
  compact?: boolean;
  hideLink?: boolean;
  /** 펼침 보기의 책 정보처럼 넓은 화면에서 두 칸으로 배치할 때 사용 */
  bookGrid?: boolean;
  /** 서비스 내부 작품 상세 주소. 있으면 외부 링크와 분리된 두 버튼을 그린다 */
  internalHref?: string;
}

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  compact: boolean;
}

function InfoItem({ icon: Icon, label, value, compact }: InfoItemProps) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <Icon size={compact ? 12 : 14} className="shrink-0 text-text-primary/60" />
      <span className="text-text-primary/60">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

interface TagListProps {
  items: string[];
  label: string;
  compact: boolean;
}

function TagList({ items, label, compact }: TagListProps) {
  const visibleCount = compact ? 3 : 5;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`${compact ? "text-xs" : "text-sm"} text-text-primary/60`}>{label}</span>
      {items.slice(0, visibleCount).map((item, i) => (
        <span
          key={i}
          className={`rounded-md bg-white/10 px-2 py-0.5 ${compact ? "text-[10px]" : "text-xs"} text-white`}
        >
          {item}
        </span>
      ))}
      {items.length > visibleCount && (
        <span className="text-xs text-text-primary/60">+{items.length - visibleCount}</span>
      )}
    </div>
  );
}

export default function ContentMetadataDisplay({
  category,
  metadata,
  subtype,
  compact = false,
  hideLink = false,
  bookGrid = false,
  internalHref,
}: ContentMetadataDisplayProps) {
  const t = useTranslations("shared.content");
  if (!metadata) return null;

  // metadata에서 값 추출
  const {
    publisher,
    voteAverage,
    genres,
    developer,
    rating,
    platforms,
    albumType,
    totalTracks,
    artists,
    itunesUrl,
  } = metadata;

  switch (category.toLowerCase()) {

    // 책
    case "book":
      return (
        <BookMetadata
          metadata={metadata}
          compact={compact}
          hideLink={hideLink}
          bookGrid={bookGrid}
          internalHref={internalHref}
        />
      );

    // 영화/TV 프로그램
    case "video":
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {subtype && (
            <InfoItem icon={Tv} label={t("type")} value={subtype === "movie" ? t("movie") : t("tvProgram")} compact={compact} />
          )}
          {voteAverage !== undefined && (
            <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
              <Star size={compact ? 12 : 14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-text-primary/60">{t("rating")}</span>
              <span className="text-white font-medium">{voteAverage.toFixed(1)}</span>
            </div>
          )}
          {genres && genres.length > 0 && <TagList items={genres} label={t("genre")} compact={compact} />}
        </div>
      );

    // 게임
    case "game":
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {developer && <InfoItem icon={Gamepad2} label={t("developer")} value={developer} compact={compact} />}
          {!compact && publisher && <InfoItem icon={Building2} label={t("gamePublisher")} value={publisher} compact={compact} />}
          {rating !== undefined && (
            <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
              <Star size={compact ? 12 : 14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-text-primary/60">{t("rating")}</span>
              <span className="text-white font-medium">{t("ratingScore", { score: rating })}</span>
            </div>
          )}
          {platforms && platforms.length > 0 && <TagList items={platforms} label={t("platform")} compact={compact} />}
          {!compact && genres && genres.length > 0 && <TagList items={genres} label={t("genre")} compact={compact} />}
        </div>
      );

    // 음악
    case "music": {
      const listenLink = itunesUrl
        ? { url: itunesUrl, label: t("listenOnApple") }
        : null;
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {albumType && <InfoItem icon={Disc3} label={t("albumType")} value={albumType} compact={compact} />}
          {totalTracks !== undefined && (
            <InfoItem icon={Music} label={t("tracks", { count: totalTracks })} value={totalTracks} compact={compact} />
          )}
          {!compact && artists && artists.length > 1 && <TagList items={artists} label={t("artist")} compact={compact} />}
          {!compact && listenLink && (
            <a
              href={listenLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <ExternalLink size={14} />
              {listenLink.label}
            </a>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
