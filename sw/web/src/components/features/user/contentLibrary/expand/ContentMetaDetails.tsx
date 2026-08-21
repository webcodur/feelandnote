"use client";

import { useTranslations } from "next-intl";

import MetadataField from "@/components/shared/content/MetadataField";
import type { ContentMetadata } from "@/types/content";

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
        <MetadataField label={t("director")} value={metadata.director} />
      )}
      {metadata.runtime && (
        <MetadataField label={t("runtime")} value={t("runtimeMinutes", { minutes: metadata.runtime })} />
      )}
      {cast.length > 0 && (
        <MetadataField
          className="col-span-full"
          label={t("cast")}
          value={cast.map((actor) => actor.character ? `${actor.name} (${actor.character})` : actor.name).join(" · ")}
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
    <div className="space-y-4">
      <div className="space-y-3">
        {performers.length > 0 && <MetadataField label={tShared("artist")} value={performers.join(" · ")} />}
        {metadata.albumType && <MetadataField label={tShared("albumType")} value={metadata.albumType} />}
        {metadata.genre && <MetadataField label={tShared("genre")} value={metadata.genre} />}
        {metadata.previewUrl && (
          mediaEnabled ? (
            <audio controls preload="none" src={metadata.previewUrl} className="h-10 w-full max-w-md">
              <track kind="captions" />
            </audio>
          ) : (
            <div aria-hidden className="h-10 w-full max-w-md rounded-md bg-white/[0.04]" />
          )
        )}
        {listenLink && (
          <a
            href={listenLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {listenLink.label}
          </a>
        )}
      </div>

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
      {metadata.label && <MetadataField label={t("label")} value={metadata.label} />}
    </div>
  );
}
