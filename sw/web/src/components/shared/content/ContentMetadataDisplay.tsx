/*
  파일명: /components/features/contents/ContentMetadataDisplay.tsx
  기능: 콘텐츠 타입별 메타데이터 표시
  책임: API에서 가져온 메타데이터를 타입별로 적절한 UI로 표시한다.
*/ // ------------------------------
"use client";

import type { ContentMetadata } from "@/types/content";
import { useTranslations } from "next-intl";
import BookMetadata from "./contentMetadata/BookMetadata";
import MetadataField from "./MetadataField";

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
  const tDetail = useTranslations("contentDetail");
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
            <MetadataField label={t("type")} value={subtype === "movie" ? t("movie") : t("tvProgram")} compact={compact} />
          )}
          {voteAverage !== undefined && (
            <MetadataField label={t("rating")} value={voteAverage.toFixed(1)} compact={compact} />
          )}
          {genres && genres.length > 0 && <MetadataField label={t("genre")} value={genres.join(" · ")} compact={compact} />}
        </div>
      );

    // 게임
    case "game":
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {developer && <MetadataField label={t("developer")} value={developer} compact={compact} />}
          {!compact && publisher && <MetadataField label={t("gamePublisher")} value={publisher} compact={compact} />}
          {rating !== undefined && (
            <MetadataField label={t("rating")} value={t("ratingScore", { score: rating })} compact={compact} />
          )}
          {platforms && platforms.length > 0 && <MetadataField label={t("platform")} value={platforms.join(" · ")} compact={compact} />}
          {!compact && genres && genres.length > 0 && <MetadataField label={t("genre")} value={genres.join(" · ")} compact={compact} />}
        </div>
      );

    // 음악
    case "music": {
      const listenLink = itunesUrl
        ? { url: itunesUrl, label: t("listenOnApple") }
        : null;
      return (
        <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
          {albumType && <MetadataField label={t("albumType")} value={albumType} compact={compact} />}
          {totalTracks !== undefined && (
            <MetadataField label={tDetail("trackList")} value={totalTracks} compact={compact} />
          )}
          {!compact && artists && artists.length > 1 && <MetadataField label={t("artist")} value={artists.join(" · ")} compact={compact} />}
          {!compact && listenLink && (
            <a
              href={listenLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline"
            >
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
