"use client";
import { useTranslations } from "next-intl";
import { User, Calendar, Clock } from "lucide-react";
import CreatorNames from "@/components/shared/content/creatorLink/CreatorNames";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentMetadata as Metadata } from "@/types/content";
import styles from "./ContentDetail.module.css";

export default function ContentMetadata({ content }: { content: ContentDetailData["content"] }) {
  const t = useTranslations("contentDetail");
  const tCore = useTranslations("shared.content");
  const metadata = content.metadata as unknown as Metadata | null;
  const isMovieOrTv = content.type === "VIDEO";
  const genres = metadata?.genres;
  const runtime = metadata?.runtime;
  const creatorRoleLabel = t({ BOOK: "author", VIDEO: "director", GAME: "developer", MUSIC: "artist" }[content.type]);
  return (
  <div className={styles.metadata}>
    {content.creator && (
      <div className="flex items-center gap-1 text-text-primary font-medium">
        <User size={13} className="text-accent shrink-0" />
        <span className="shrink-0 whitespace-nowrap text-text-secondary">{creatorRoleLabel}:</span>
        <CreatorNames text={content.creator} />
      </div>
    )}

    {content.releaseDate && (
      <span className="flex items-center gap-1 text-text-secondary">

        <Calendar size={12} className="text-text-secondary shrink-0" />
        {content.releaseDate}
      </span>
    )}

    {/* 도서 스펙 */}
    {content.type === "BOOK" && metadata?.publisher && (
      <span className="flex items-center gap-1">

        <span>{metadata.publisher}</span>
      </span>
    )}
    {content.type === "BOOK" && metadata?.isbn && (
      <span className="flex items-center gap-1">

        <span className="font-mono text-text-secondary">ISBN {metadata.isbn}</span>
      </span>
    )}

    {/* 영상 스펙 */}
    {isMovieOrTv && runtime && (
      <span className="flex items-center gap-1">

        <Clock size={12} className="text-text-secondary shrink-0" />
        {t("runtimeMinutes", { minutes: runtime })}
      </span>
    )}
    {genres && genres.length > 0 && (
      <span>

        {genres.join(" · ")}
      </span>
    )}

    {/* 게임 스펙 */}
    {content.type === "GAME" && metadata?.platforms && metadata.platforms.length > 0 && (
      <span className="flex items-center gap-1">

        <span>{metadata.platforms.join(", ")}</span>
      </span>
    )}

    {/* 음악 스펙 */}
    {content.type === "MUSIC" && (
      <>
        {metadata?.albumType && (
          <span>

            {metadata.albumType}
          </span>
        )}
        {metadata?.totalTracks !== undefined && (
          <span>

            {tCore("tracks", { count: metadata.totalTracks })}
          </span>
        )}
        {metadata?.label && (
          <span>

            {metadata.label}
          </span>
        )}
      </>
    )}
  </div>

  );
}
