"use client";

import { useTranslations } from "next-intl";

import CreatorNames from "@/components/shared/content/creatorLink/CreatorNames";
import MetadataField from "@/components/shared/content/MetadataField";
import type { ContentMetadata } from "@/types/content";
import MusicPreviewPlayer from "./MusicPreviewPlayer";
import { ExternalLink } from "lucide-react";

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 text-sm font-medium text-text-secondary">{children}</h4>;
}

export function VideoDetails({ metadata }: { metadata: ContentMetadata }) {
  const t = useTranslations("contentDetail");
  const cast = metadata.cast ?? [];
  if (!metadata.director && !metadata.runtime && cast.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {metadata.director && (
        <MetadataField label={t("director")} value={<CreatorNames text={metadata.director} />} />
      )}
      {metadata.runtime && (
        <MetadataField label={t("runtime")} value={t("runtimeMinutes", { minutes: metadata.runtime })} />
      )}
      {cast.length > 0 && (
        <MetadataField
          className="col-span-full"
          label={t("cast")}
          value={
            <CreatorNames
              text={cast
                .map((actor) => (actor.character ? `${actor.name} (${actor.character})` : actor.name))
                .join(" · ")}
            />
          }
        />
      )}
    </div>
  );
}

function formatDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1_000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function MusicDetails({
  metadata,
  mediaEnabled = true,
}: {
  metadata: ContentMetadata;
  mediaEnabled?: boolean;
}) {
  const t = useTranslations("contentDetail");
  const tShared = useTranslations("shared.content");
  const tMusic = useTranslations("contentDetail.appleMusic");
  const performers = metadata.artists?.length
    ? metadata.artists
    : metadata.performer
      ? [metadata.performer]
      : [];
  const listenLink = metadata.itunesUrl
    ? { url: metadata.itunesUrl, label: t("listenOnApple") }
    : null;
  const tracks = metadata.tracks ?? [];

  return (
    <div data-music-details className="min-w-0 space-y-4">
      <dl className="flex min-w-0 flex-wrap gap-x-6 gap-y-2 text-sm">
        {performers.length > 0 && (
          <div className="flex w-full min-w-0 gap-3">
            <dt className="shrink-0 whitespace-nowrap text-text-tertiary">{tShared("artist")}</dt>
            <dd className="min-w-0 break-words font-medium text-text-primary"><CreatorNames text={performers.join(" · ")} /></dd>
          </div>
        )}
        {metadata.albumType && <div className="flex min-w-0 gap-3">
          <dt className="shrink-0 whitespace-nowrap text-text-tertiary">{tShared("albumType")}</dt>
          <dd className="min-w-0 break-words text-text-secondary">{metadata.albumType === "track" ? tMusic("track") : metadata.albumType}</dd>
        </div>}
        {metadata.genre && <div className="flex min-w-0 gap-3">
          <dt className="shrink-0 whitespace-nowrap text-text-tertiary">{tShared("genre")}</dt>
          <dd className="min-w-0 break-words text-text-secondary">{metadata.genre}</dd>
        </div>}
      </dl>
      {metadata.previewUrl && (mediaEnabled ? (
        <MusicPreviewPlayer key={metadata.previewUrl} src={metadata.previewUrl} appleMusicUrl={metadata.itunesUrl} />
      ) : <div aria-hidden className="h-[116px] rounded-xl border border-accent/20 bg-accent/[0.04]" />)}
        {!metadata.previewUrl && listenLink && (
          <a
            href={listenLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-accent/20 px-3 py-2 text-sm text-accent hover:border-accent/50 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {listenLink.label}
            <ExternalLink size={14} aria-hidden />
          </a>
        )}

      {tracks.length > 0 && (
        <div>
          <SubHeading>{t("trackList")}</SubHeading>
          <div className="custom-scrollbar max-h-[300px] space-y-1 overflow-y-auto rounded-lg border border-white/5">
            {tracks.map((track, index) => (
              <div
                key={`${track.name}-${index}`}
                className="flex items-center justify-between border-b border-white/5 bg-white/5 px-3 py-2 text-xs last:border-0"
              >
                <span className="min-w-0 text-text-secondary">
                  <span className="mr-3 inline-block w-4 text-right text-text-tertiary">{track.trackNumber}.</span>
                  {track.name}
                </span>
                <span className="ms-2 shrink-0 font-mono text-text-tertiary">{formatDuration(track.durationMs)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {metadata.label && <p className="text-xs text-text-tertiary">{t("label")} · {metadata.label}</p>}
    </div>
  );
}
