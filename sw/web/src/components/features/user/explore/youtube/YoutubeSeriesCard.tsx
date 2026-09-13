/*
  파일명: /components/features/user/explore/youtube/YoutubeSeriesCard.tsx
  기능: 필앤노트 오리지널 영상 시리즈 소개 카드
  책임: 시리즈의 성격을 설명하고 본편·쇼츠 재생목록과 서비스 내부 화면으로 연결한다.
*/

import Image from "next/image";
import { ArrowRight, ExternalLink, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface YoutubeSeriesCardProps {
  index: string;
  image: string;
  imageAlt: string;
  title: string;
  tagline: string;
  description: string;
  fullPlaylistUrl: string;
  shortsPlaylistUrl: string;
  fullPlaylistLabel: string;
  shortsPlaylistLabel: string;
  siteHref: string;
  siteLabel: string;
  languageNote?: string;
}

export default function YoutubeSeriesCard({
  index,
  image,
  imageAlt,
  title,
  tagline,
  description,
  fullPlaylistUrl,
  shortsPlaylistUrl,
  fullPlaylistLabel,
  shortsPlaylistLabel,
  siteHref,
  siteLabel,
  languageNote,
}: YoutubeSeriesCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-white/20 bg-bg-secondary">
      <div className="relative isolate overflow-hidden bg-bg-main md:min-h-[360px]">
        <div className="relative aspect-video md:absolute md:inset-0 md:aspect-auto">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(max-width: 1280px) 100vw, 1152px"
            className="object-cover object-right"
          />
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-bg-main via-bg-main/90 to-transparent md:block"
        />

        <div className="relative p-5 sm:p-7 md:flex md:min-h-[360px] md:w-[58%] md:flex-col md:justify-center md:py-10 lg:p-10">
          <p className="font-cinzel text-[10px] font-semibold tracking-[0.24em] text-accent">
            {index}
          </p>
          <h3 className="mt-2 font-serif text-3xl font-semibold text-text-primary sm:text-4xl">
            {title}
          </h3>
          <p className="mt-5 break-keep font-serif text-xl leading-snug text-text-primary">
            {tagline}
          </p>
          <p className="mt-3 break-keep text-sm leading-7 text-text-primary/90">
            {description}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="absolute right-5 top-5 size-7 border-r border-t border-accent/60"
        />
      </div>

      <div className="flex flex-col border-t border-white/20 bg-bg-secondary p-5 sm:p-7 lg:px-10">
        {languageNote ? (
          <p className="mb-4 w-fit border-l-2 border-accent pl-3 text-xs text-text-primary/80">
            {languageNote}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={fullPlaylistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-white/40 bg-bg-main px-4 py-2.5 text-sm font-semibold text-text-primary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:justify-start"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-accent text-bg-main">
              <Play size={11} fill="currentColor" aria-hidden="true" />
            </span>
            {fullPlaylistLabel}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          <a
            href={shortsPlaylistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-white/30 bg-bg-main px-4 py-2.5 text-sm text-text-primary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:justify-start"
          >
            {shortsPlaylistLabel}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>

        <Link
          href={siteHref}
          className="mt-5 flex w-fit items-center gap-2 text-sm font-semibold text-text-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {siteLabel}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
