/*
  파일명: /components/features/home/YoutubeShelf.tsx
  기능: 홈 유튜브 채널 선반
  책임: 서재 탐방 영상이 있는 인물을 모아 카드 줄로 보여주고,
        유튜브 채널과 영상 모음 페이지로 연결한다.
*/

import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Youtube } from "lucide-react";
import { getYoutubeCelebs, type YoutubeCeleb } from "@/actions/home/getYoutubeCelebs";
import { getYoutubeChannel } from "@/constants/youtube";
import YoutubeShelfStrip, { type ShelfItem } from "./YoutubeShelfStrip";

function latestUpload(celeb: YoutubeCeleb): string {
  return Object.values(celeb.youtube_videos)
    .map((v) => v.uploadedAt)
    .sort()
    .at(-1) ?? "";
}

/** locale 영상 우선 개수. 없으면 반대 언어 영상 개수 */
function videoCount(celeb: YoutubeCeleb, locale: string): number {
  const other = locale === "en" ? "ko" : "en";
  const count = (prefix: string) =>
    Object.keys(celeb.youtube_videos).filter((k) => k.startsWith(`${prefix}-`)).length;
  return count(locale) || count(other);
}

export default async function YoutubeShelf() {
  const [t, locale, celebs] = await Promise.all([
    getTranslations("home.youtube"),
    getLocale(),
    getYoutubeCelebs(),
  ]);

  if (celebs.length === 0) return null;

  const channel = getYoutubeChannel(locale);
  const items: ShelfItem[] = [...celebs]
    .sort((a, b) => latestUpload(b).localeCompare(latestUpload(a)))
    .map((celeb) => ({
      slug: celeb.slug,
      name: (locale === "en" && celeb.nickname_en) || celeb.nickname || celeb.slug,
      avatarUrl: celeb.avatar_url,
      videoCount: videoCount(celeb, locale),
    }));

  return (
    <section className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-baseline gap-3">
        <h2 className="flex items-center gap-2 font-serif text-base text-text-primary">
          <Youtube size={16} className="text-accent" />
          {t("title")}
        </h2>
        <span className="h-px flex-1 bg-gradient-to-r from-accent-dim/30 to-transparent" />
        <Link
          href="/explore/youtube"
          className="text-xs text-accent/80 hover:text-accent shrink-0"
        >
          {t("viewAll")} →
        </Link>
      </div>
      <p className="text-xs text-text-tertiary -mt-2">{t("subtitle")}</p>

      {/* 인물 카드 줄 */}
      <YoutubeShelfStrip items={items} moreLabel={t("more")} />

      {/* 채널 링크 */}
      <a
        href={channel.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent"
      >
        <Youtube size={13} />
        {t("channel")} {channel.handle}
      </a>
    </section>
  );
}
