/*
  파일명: /components/features/user/explore/youtube/YoutubeChannelContent.tsx
  기능: 필앤노트 영상관
  책임: 서재 탐방·세력도감을 소개하고 재생목록과 내부 기록, 기존 인물 영상을 함께 진열한다.
*/

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ExternalLink, Youtube } from "lucide-react";
import type { YoutubeCeleb, YoutubeVideoEntry } from "@/actions/home/getYoutubeCelebs";
import type { YoutubeFactionVideos } from "@/actions/home/getYoutubeFactions";
import {
  getYoutubeChannel,
  getYoutubeSeriesPlaylists,
} from "@/constants/youtube";
import LiteYoutubeEmbed from "@/components/features/youtube/LiteYoutubeEmbed";
import YoutubeFactionArchive from "./YoutubeFactionArchive";
import YoutubeSeriesCard from "./YoutubeSeriesCard";

interface VideoCard {
  videoId: string;
  uploadedAt: string;
  slug: string;
  name: string;
}

function displayName(celeb: YoutubeCeleb, locale: string) {
  return (locale === "en" && celeb.nickname_en) || celeb.nickname || celeb.slug;
}

/** locale 영상 우선, 없으면 반대 언어 영상 사용 */
function collectCards(celebs: YoutubeCeleb[], locale: string) {
  const other = locale === "en" ? "ko" : "en";
  const longform: VideoCard[] = [];
  const shorts: VideoCard[] = [];

  for (const celeb of celebs) {
    const videos = celeb.youtube_videos;
    const base = { slug: celeb.slug, name: displayName(celeb, locale) };

    const lf = videos[`${locale}-longform`] ?? videos[`${other}-longform`];
    if (lf) longform.push({ ...base, videoId: lf.videoId, uploadedAt: lf.uploadedAt });

    const pickShorts = (prefix: string): YoutubeVideoEntry[] =>
      Object.entries(videos)
        .filter(([key]) => key.startsWith(prefix))
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([, v]) => v);

    const localeShorts = pickShorts(`${locale}-shorts-`);
    const picked = localeShorts.length > 0 ? localeShorts : pickShorts(`${other}-shorts-`);
    for (const v of picked) shorts.push({ ...base, videoId: v.videoId, uploadedAt: v.uploadedAt });
  }

  const byNewest = (a: VideoCard, b: VideoCard) => b.uploadedAt.localeCompare(a.uploadedAt);
  longform.sort(byNewest);
  shorts.sort(byNewest);
  return { longform, shorts };
}

interface YoutubeChannelContentProps {
  celebs: YoutubeCeleb[];
  factionVideos: YoutubeFactionVideos;
  locale: string;
}

export default async function YoutubeChannelContent({
  celebs,
  factionVideos,
  locale,
}: YoutubeChannelContentProps) {
  const t = await getTranslations("explore.youtube");
  const channel = getYoutubeChannel(locale);
  const playlists = getYoutubeSeriesPlaylists(locale);
  const { longform, shorts } = collectCards(celebs, locale);
  const hasLibraryVideos = longform.length > 0 || shorts.length > 0;
  const factionLanguageNote =
    locale === "en" ? t("koreanPlaylist") : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-12 pb-8 sm:space-y-16">
      <header className="relative overflow-hidden border-b border-white/10 pb-10 pt-2">
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-px w-24 bg-accent"
        />
        <p className="pt-5 font-cinzel text-xs font-semibold tracking-[0.24em] text-accent">
          {t("eyebrow")}
        </p>

        <div className="mt-6 grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <h2 className="max-w-3xl font-serif text-3xl font-semibold leading-tight text-text-primary sm:text-5xl lg:text-6xl">
            {t("title")}
          </h2>
          <div className="space-y-5">
            <p className="text-sm leading-7 text-text-primary/90 sm:text-base">
              {t("intro")}
            </p>
            <a
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/40 bg-bg-main px-4 py-2.5 text-sm font-semibold text-text-primary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Youtube size={16} className="text-accent" aria-hidden="true" />
              {t("visitChannel")}
              <span className="hidden text-xs font-normal text-text-primary/80 sm:inline">
                {channel.handle}
              </span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <section aria-labelledby="youtube-original-series">
        <div className="mb-7 grid gap-3 md:grid-cols-[1fr_1fr] md:items-end">
          <div>
            <p className="font-cinzel text-[10px] font-semibold tracking-[0.24em] text-accent">
              {t("seriesEyebrow")}
            </p>
            <h2
              id="youtube-original-series"
              className="mt-2 font-serif text-2xl font-semibold text-text-primary sm:text-3xl"
            >
              {t("seriesTitle")}
            </h2>
          </div>
          <p className="text-sm leading-6 text-text-primary/90 md:justify-self-end md:text-right">
            {t("seriesIntro")}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <YoutubeSeriesCard
            index={t("series.library.index")}
            image="/images/home/youtube-library-tour-hero.webp"
            imageAlt={t("series.library.imageAlt")}
            title={t("series.library.title")}
            tagline={t("series.library.tagline")}
            description={t("series.library.description")}
            fullPlaylistUrl={playlists.libraryTour.full}
            shortsPlaylistUrl={playlists.libraryTour.shorts}
            fullPlaylistLabel={t("fullPlaylist")}
            shortsPlaylistLabel={t("shortsPlaylist")}
            siteHref="/explore/figures"
            siteLabel={t("series.library.siteLink")}
          />
          <YoutubeSeriesCard
            index={t("series.faction.index")}
            image="/images/home/youtube-faction-collection-hero.webp"
            imageAlt={t("series.faction.imageAlt")}
            title={t("series.faction.title")}
            tagline={t("series.faction.tagline")}
            description={t("series.faction.description")}
            fullPlaylistUrl={playlists.faction.full}
            shortsPlaylistUrl={playlists.faction.shorts}
            fullPlaylistLabel={t("fullPlaylist")}
            shortsPlaylistLabel={t("shortsPlaylist")}
            siteHref="/explore/faction"
            siteLabel={t("series.faction.siteLink")}
            languageNote={factionLanguageNote}
          />
        </div>
      </section>

      <YoutubeFactionArchive
        locale={locale}
        videos={factionVideos}
        copy={{
          eyebrow: t("factionArchiveEyebrow"),
          title: t("factionArchiveTitle"),
          description: t("factionArchiveDescription"),
          longformTitle: t("factionLongformTitle"),
          longformSub: t("factionLongformSub"),
          shortsTitle: t("factionShortsTitle"),
          shortsSub: t("factionShortsSub"),
          openFaction: t("openFaction"),
          moreJoiner: t("factionMoreJoiner"),
          moreUnit: t("factionMoreUnit"),
        }}
      />

      {hasLibraryVideos ? (
        <div className="mx-auto max-w-4xl space-y-12 border-t border-white/10 pt-12">
          <header>
            <p className="font-cinzel text-[10px] font-semibold tracking-[0.24em] text-accent">
              {t("archiveEyebrow")}
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-text-primary sm:text-3xl">
              {t("archiveTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-primary/90">
              {t("archiveDescription")}
            </p>
          </header>

          {longform.length > 0 ? (
            <section className="space-y-5">
              <header className="space-y-1">
                <h3 className="font-serif text-xl text-text-primary">
                  {t("longformTitle")}
                </h3>
                <p className="text-xs text-text-tertiary">{t("longformSub")}</p>
              </header>
              <div className="grid gap-6 sm:grid-cols-2">
                {longform.map((v) => (
                  <div
                    key={v.videoId}
                    className="space-y-2 [content-visibility:auto] [contain-intrinsic-size:auto_320px]"
                  >
                    <div className="aspect-video overflow-hidden rounded-[2px] bg-bg-secondary ring-1 ring-accent/10 hover:ring-accent/40">
                      <LiteYoutubeEmbed videoId={v.videoId} title={v.name} />
                    </div>
                    <div className="flex items-baseline justify-between px-0.5">
                      <span className="font-serif text-sm text-text-primary">
                        {v.name}
                      </span>
                      <Link
                        href={`/celeb/${v.slug}`}
                        className="text-xs text-accent/80 hover:text-accent"
                      >
                        {t("viewShelf")} →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {shorts.length > 0 ? (
            <section className="space-y-5">
              <header className="space-y-1">
                <h3 className="font-serif text-xl text-text-primary">
                  {t("shortsTitle")}
                </h3>
                <p className="text-xs text-text-tertiary">{t("shortsSub")}</p>
              </header>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
                {shorts.map((v) => (
                  <div
                    key={v.videoId}
                    className="w-[150px] flex-shrink-0 snap-start space-y-1.5 [content-visibility:auto] [contain-intrinsic-size:auto_320px] sm:w-[176px]"
                  >
                    <div className="aspect-[9/16] overflow-hidden rounded-[2px] bg-bg-secondary ring-1 ring-accent/10 hover:ring-accent/40">
                      <LiteYoutubeEmbed videoId={v.videoId} title={v.name} />
                    </div>
                    <Link
                      href={`/celeb/${v.slug}`}
                      className="block truncate px-0.5 text-xs text-text-secondary hover:text-accent"
                    >
                      {v.name}
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
