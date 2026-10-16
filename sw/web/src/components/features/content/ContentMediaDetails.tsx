"use client";
import { useTranslations } from "next-intl";
import { Disc } from "lucide-react";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentMetadata } from "@/types/content";
import { getContentGalleryImages } from "@/lib/contentBanner";
import MediaEmbed from "./MediaEmbed";
import ContentImageGallery from "./ContentImageGallery";
import ContentVideoPeople from "./ContentVideoPeople";

export default function ContentMediaDetails({ content }: { content: ContentDetailData["content"] }) {
  const t = useTranslations("contentDetail");
  const metadata = content.metadata as unknown as ContentMetadata | null;
  const isMovieOrTv = content.type === "VIDEO";
  const images = getContentGalleryImages(content.type, metadata);
  const galleryLabel = t(isMovieOrTv ? "stills" : "screenshots");
  return <div className="space-y-6">
      {isMovieOrTv && <ContentVideoPeople key={content.id} externalId={content.externalId || content.id} fallback={metadata?.cast} />}

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

      <ContentImageGallery key={content.id} images={images} title={content.title} label={galleryLabel} />
      <MediaEmbed contentId={content.id} type={content.type} />
  </div>;
}
