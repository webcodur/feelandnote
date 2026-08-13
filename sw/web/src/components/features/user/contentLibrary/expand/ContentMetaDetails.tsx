"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import ContentImage from "@/components/ui/ContentImage";
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
        <div>
          <SubHeading>{t("director")}</SubHeading>
          <p className="text-sm text-text-primary">{metadata.director}</p>
        </div>
      )}
      {metadata.runtime && (
        <div>
          <SubHeading>{t("runtime")}</SubHeading>
          <p className="text-sm text-text-secondary">
            {t("runtimeMinutes", { minutes: metadata.runtime })}
          </p>
        </div>
      )}
      {cast.length > 0 && (
        <div className="col-span-full">
          <SubHeading>{t("cast")}</SubHeading>
          <div className="flex flex-wrap gap-2">
            {cast.map((actor, index) => (
              <span
                key={`${actor.name}-${index}`}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs"
              >
                {actor.name}
                {actor.character && <span className="text-text-tertiary"> ({actor.character})</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1_000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function MusicDetails({ metadata }: { metadata: ContentMetadata }) {
  const t = useTranslations("contentDetail");
  const tShared = useTranslations("shared.content");
  const performers = metadata.artists?.length
    ? metadata.artists
    : metadata.performer
      ? [metadata.performer]
      : [];
  const listenLink = metadata.itunesUrl
    ? { url: metadata.itunesUrl, label: t("listenOnApple") }
    : metadata.spotifyUrl
      ? { url: metadata.spotifyUrl, label: tShared("listenOnSpotify") }
      : null;
  const tracks = metadata.tracks ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {performers.length > 0 && <MetadataLine label={tShared("artist")} value={performers.join(", ")} />}
        {metadata.albumType && <MetadataLine label={tShared("albumType")} value={metadata.albumType} />}
        {metadata.genre && <MetadataLine label={tShared("genre")} value={metadata.genre} />}
        {metadata.previewUrl && (
          <audio controls preload="none" src={metadata.previewUrl} className="w-full max-w-md">
            <track kind="captions" />
          </audio>
        )}
        {listenLink && (
          <a
            href={listenLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover hover:underline"
          >
            <ExternalLink size={14} aria-hidden />
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
      {metadata.label && <MetadataLine label={t("label")} value={metadata.label} />}
    </div>
  );
}

function MetadataLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </p>
  );
}

export function GameScreenshots({ screenshots }: { screenshots: string[] }) {
  const t = useTranslations("contentDetail");
  if (screenshots.length === 0) return null;

  return (
    <div>
      <SubHeading>{t("screenshots")}</SubHeading>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {screenshots.slice(0, 6).map((url, index) => (
          <div key={url} className="relative aspect-video overflow-hidden rounded-lg border border-white/10">
            <ContentImage
              src={url}
              alt={`${index + 1}`}
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
