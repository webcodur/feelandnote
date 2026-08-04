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
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/20 bg-bg-main">
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

        <Link
          href="/explore/youtube"
          className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/30 bg-black/40 px-4 py-2 text-xs font-semibold text-text-primary backdrop-blur-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:bottom-7 md:text-sm"
        >
          {t("visitArchive")}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
