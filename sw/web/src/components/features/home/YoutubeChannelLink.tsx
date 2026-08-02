/*
  파일명: /components/features/home/YoutubeChannelLink.tsx
  기능: 홈 영상관 바로가기
  책임: 필앤노트 오리지널 영상 시리즈를 소개하고 내부 영상관으로 연결한다.
*/

import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getYoutubeChannel,
  getYoutubeSeriesPlaylists,
} from "@/constants/youtube";
import YoutubeHeroOverlay from "./YoutubeHeroOverlay";

export default async function YoutubeChannelLink() {
  const t = await getTranslations("home.youtube");
  const ts = await getTranslations("explore.youtube");
  const locale = await getLocale();
  const channel = getYoutubeChannel(locale);
  const playlists = getYoutubeSeriesPlaylists(locale);

  return (
    <section>
      <div className="overflow-hidden rounded-xl border border-white/20 bg-bg-main">
        <div className="relative aspect-video border-b border-white/20 bg-bg-main">
          <Image
            src="/images/home/youtube-channel-main-hero.webp"
            alt={t("imageAlt")}
            fill
            sizes="(max-width: 768px) 100vw, 1024px"
            className="object-cover"
          />

          <YoutubeHeroOverlay
            channelUrl={channel.url}
            playLabel={t("playChannel")}
            openSeriesLabel={t("openSeries")}
            fullPlaylistLabel={ts("fullPlaylist")}
            shortsPlaylistLabel={ts("shortsPlaylist")}
            library={{
              key: "library",
              index: ts("series.library.index"),
              title: t("libraryTour"),
              tagline: ts("series.library.tagline"),
              description: ts("series.library.description"),
              fullPlaylistUrl: playlists.libraryTour.full,
              shortsPlaylistUrl: playlists.libraryTour.shorts,
              siteHref: "/explore/figures",
              siteLabel: ts("series.library.siteLink"),
            }}
            faction={{
              key: "faction",
              index: ts("series.faction.index"),
              title: t("faction"),
              tagline: ts("series.faction.tagline"),
              description: ts("series.faction.description"),
              fullPlaylistUrl: playlists.faction.full,
              shortsPlaylistUrl: playlists.faction.shorts,
              siteHref: "/explore/faction",
              siteLabel: ts("series.faction.siteLink"),
              languageNote: locale === "en" ? ts("koreanPlaylist") : undefined,
            }}
          />

          <span
            aria-hidden="true"
            className="absolute left-5 top-5 size-8 border-l border-t border-accent/60 md:left-7 md:top-7"
          />
          <span
            aria-hidden="true"
            className="absolute right-5 top-5 size-8 border-r border-t border-accent/60 md:right-7 md:top-7"
          />
        </div>

        <div className="grid gap-7 bg-bg-main p-5 sm:p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8 lg:p-10">
          <div>
            <p className="flex items-center gap-3 font-cinzel text-xs font-semibold tracking-[0.22em] text-accent">
              <span className="h-px w-8 bg-accent" aria-hidden="true" />
              {t("eyebrow")}
            </p>
            <h2 className="mt-5 font-serif text-3xl font-semibold leading-tight text-text-primary md:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-3 font-serif text-lg leading-snug text-text-primary md:text-xl">
              {t("headline")}
            </p>
          </div>

          <div className="md:border-l md:border-white/15 md:pl-8">
            <p className="text-sm leading-7 text-text-primary/90 md:text-base">
              {t("description")}
            </p>

            <Link
              href="/explore/youtube"
              className="mt-7 inline-flex w-full items-center justify-between gap-3 rounded-full border border-white/40 bg-bg-main px-5 py-3 text-left text-sm font-semibold leading-5 text-text-primary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main sm:w-fit sm:justify-start"
            >
              {t("visitArchive")}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
