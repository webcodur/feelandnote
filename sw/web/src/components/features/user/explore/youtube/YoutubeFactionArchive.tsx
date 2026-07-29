/*
  파일명: /components/features/user/explore/youtube/YoutubeFactionArchive.tsx
  기능: 세력도감 영상 보관소
  책임: 출간된 세력 태그에 연결된 본편·쇼츠를 중복 없이 진열한다.
*/

import { ArrowRight } from "lucide-react";
import type {
  YoutubeFactionVideo,
  YoutubeFactionVideos,
} from "@/actions/home/getYoutubeFactions";
import { Link } from "@/i18n/navigation";
import LiteYoutubeEmbed from "@/components/features/youtube/LiteYoutubeEmbed";

interface YoutubeFactionArchiveCopy {
  eyebrow: string;
  title: string;
  description: string;
  longformTitle: string;
  longformSub: string;
  shortsTitle: string;
  shortsSub: string;
  openFaction: string;
  moreJoiner: string;
  moreUnit: string;
}

interface YoutubeFactionArchiveProps {
  copy: YoutubeFactionArchiveCopy;
  locale: string;
  videos: YoutubeFactionVideos;
}

function displayName(
  video: YoutubeFactionVideo,
  locale: string,
  moreJoiner: string,
  moreUnit: string,
) {
  const names = locale === "en" ? video.namesEn : video.names;
  const first = names[0] ?? video.title ?? video.videoId;
  if (names.length <= 1) return first;
  return `${first}${moreJoiner}${names.length - 1}${moreUnit}`;
}

export default function YoutubeFactionArchive({
  copy,
  locale,
  videos,
}: YoutubeFactionArchiveProps) {
  if (videos.longform.length === 0 && videos.shorts.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl space-y-10 border-t border-white/10 pt-12">
      <header className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="font-cinzel text-[10px] font-semibold tracking-[0.24em] text-accent">
            {copy.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-text-primary sm:text-3xl">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/90">
            {copy.description}
          </p>
        </div>
        <Link
          href="/explore/faction"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-text-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {copy.openFaction}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </header>

      {videos.longform.length > 0 ? (
        <section className="space-y-5">
          <header className="space-y-1">
            <h3 className="font-serif text-xl text-text-primary">
              {copy.longformTitle}
            </h3>
            <p className="text-xs text-text-primary/75">{copy.longformSub}</p>
          </header>
          <div className="grid gap-5 sm:grid-cols-2">
            {videos.longform.map((video) => {
              const name = displayName(
                video,
                locale,
                copy.moreJoiner,
                copy.moreUnit,
              );
              return (
                <div
                  key={video.videoId}
                  className="space-y-2 [content-visibility:auto] [contain-intrinsic-size:auto_320px]"
                >
                  <div className="aspect-video overflow-hidden rounded-[2px] bg-bg-secondary ring-1 ring-accent/10 hover:ring-accent/40">
                    <LiteYoutubeEmbed videoId={video.videoId} title={name} />
                  </div>
                  <p className="px-0.5 font-serif text-sm text-text-primary">
                    {name}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {videos.shorts.length > 0 ? (
        <section className="space-y-5">
          <header className="space-y-1">
            <h3 className="font-serif text-xl text-text-primary">
              {copy.shortsTitle}
            </h3>
            <p className="text-xs text-text-primary/75">{copy.shortsSub}</p>
          </header>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
            {videos.shorts.map((video) => {
              const name = displayName(
                video,
                locale,
                copy.moreJoiner,
                copy.moreUnit,
              );
              return (
                <div
                  key={video.videoId}
                  className="w-[148px] flex-shrink-0 snap-start space-y-1.5 [content-visibility:auto] [contain-intrinsic-size:auto_320px] sm:w-[176px]"
                >
                  <div className="aspect-[9/16] overflow-hidden rounded-[2px] bg-bg-secondary ring-1 ring-accent/10 hover:ring-accent/40">
                    <LiteYoutubeEmbed videoId={video.videoId} title={name} />
                  </div>
                  <p className="line-clamp-2 px-0.5 text-xs leading-5 text-text-primary">
                    {name}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}
