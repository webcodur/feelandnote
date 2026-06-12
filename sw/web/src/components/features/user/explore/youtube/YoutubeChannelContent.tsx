/*
  파일명: /components/features/user/explore/youtube/YoutubeChannelContent.tsx
  기능: 유튜브 채널 모음 화면
  책임: 인물 본편(롱폼)과 인물-책 단편(쇼츠)을 채널 안내와 함께 진열한다.
        현재 locale 영상을 우선 쓰고, 없으면 다른 언어 영상으로 채운다.
*/

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ExternalLink, Youtube } from "lucide-react";
import type { YoutubeCeleb, YoutubeVideoEntry } from "@/actions/home/getYoutubeCelebs";
import { getYoutubeChannel } from "@/constants/youtube";
import LiteYoutubeEmbed from "@/components/features/youtube/LiteYoutubeEmbed";

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
  locale: string;
}

export default async function YoutubeChannelContent({
  celebs,
  locale,
}: YoutubeChannelContentProps) {
  const t = await getTranslations("explore.youtube");
  const channel = getYoutubeChannel(locale);
  const { longform, shorts } = collectCards(celebs, locale);

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* 채널 안내 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <p className="text-sm text-text-secondary">{t("intro")}</p>
        <a
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-md border border-accent/40 text-accent text-sm hover:bg-accent/10 hover:border-accent transition-colors"
        >
          <Youtube size={16} />
          {t("visitChannel")}
          <ExternalLink size={12} className="opacity-60" />
        </a>
      </div>

      {/* 인물 본편 */}
      {longform.length > 0 && (
        <section className="space-y-5">
          <header className="space-y-1">
            <h2 className="font-serif text-xl text-text-primary">{t("longformTitle")}</h2>
            <p className="text-xs text-text-tertiary">{t("longformSub")}</p>
          </header>
          <div className="grid gap-6 sm:grid-cols-2">
            {longform.map((v) => (
              <div key={v.videoId} className="space-y-2">
                <div className="aspect-video rounded-[2px] overflow-hidden bg-bg-secondary ring-1 ring-accent/10 hover:ring-accent/40 transition-all duration-300">
                  <LiteYoutubeEmbed videoId={v.videoId} title={v.name} />
                </div>
                <div className="flex items-baseline justify-between px-0.5">
                  <span className="font-serif text-sm text-text-primary">{v.name}</span>
                  <Link
                    href={`/celeb/${v.slug}`}
                    className="text-xs text-accent/80 hover:text-accent transition-colors"
                  >
                    {t("viewShelf")} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 인물-책 쇼츠 */}
      {shorts.length > 0 && (
        <section className="space-y-5">
          <header className="space-y-1">
            <h2 className="font-serif text-xl text-text-primary">{t("shortsTitle")}</h2>
            <p className="text-xs text-text-tertiary">{t("shortsSub")}</p>
          </header>
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
            {shorts.map((v) => (
              <div key={v.videoId} className="flex-shrink-0 w-[150px] sm:w-[176px] snap-start space-y-1.5">
                <div className="aspect-[9/16] rounded-[2px] overflow-hidden bg-bg-secondary ring-1 ring-accent/10 hover:ring-accent/40 transition-all duration-300">
                  <LiteYoutubeEmbed videoId={v.videoId} title={v.name} />
                </div>
                <Link
                  href={`/celeb/${v.slug}`}
                  className="block px-0.5 text-xs text-text-secondary hover:text-accent transition-colors truncate"
                >
                  {v.name}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
