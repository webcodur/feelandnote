"use client";
import { useTranslations } from "next-intl";
import { Disc } from "lucide-react";
import ContentImage from "@/components/ui/ContentImage";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import CreatorNames from "@/components/shared/content/creatorLink/CreatorNames";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentMetadata } from "@/types/content";
import MediaEmbed from "./MediaEmbed";

export default function ContentMediaDetails({ content }: { content: ContentDetailData["content"] }) {
  const t = useTranslations("contentDetail");
  const metadata = content.metadata as unknown as ContentMetadata | null;
  const isMovieOrTv = content.type === "VIDEO";
  return <div className="space-y-6">
      <MediaEmbed contentId={content.id} type={content.type} />

      {/* 영상 전용: 출연진 (Cast) 캡슐 칩 리스트 */}
      {isMovieOrTv && metadata?.cast && metadata.cast.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
          <DecorativeLabel label={t("cast")} />
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {metadata.cast.map((actor, idx) => {
              const displayName = actor.character
                ? `${actor.name} (${actor.character})`
                : actor.name;
              return (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-white/[0.035] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 text-xs text-text-primary"
                >
                  <CreatorNames text={displayName} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 음악 전용: 트랙 목록 */}
      {content.type === "MUSIC" && metadata?.tracks && metadata.tracks.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
          <DecorativeLabel label={t("trackList")} />
          <div className="space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar border border-white/10 rounded-xl bg-black/20 p-1">
            {metadata.tracks.map((track, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06]"
              >
                <span className="text-text-primary flex items-center gap-2.5 truncate">
                  <Disc size={12} className="text-accent/70 shrink-0" />
                  <span className="text-text-secondary w-5 text-right font-mono text-[11px] shrink-0">
                    {track.trackNumber}.
                  </span>
                  <span className="truncate font-medium">{track.name}</span>
                </span>
                <span className="font-mono text-text-secondary text-[11px] ml-2 shrink-0">
                  {Math.floor(track.durationMs / 60000)}:
                  {String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 게임 전용: 스크린샷 갤러리 */}
      {content.type === "GAME" && metadata?.screenshots && metadata.screenshots.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
          <DecorativeLabel label={t("screenshots")} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {metadata.screenshots.map((url, i) => (
              <div
                key={i}
                className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group shadow-md"
              >
                <ContentImage
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      )}


  </div>;
}
