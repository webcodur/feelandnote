/*
  파일명: /app/(main)/explore/youtube/page.tsx
  기능: 필앤노트 영상관
  책임: 서재 탐방·세력도감을 소개하고 각 재생목록과 서비스 내부 기록으로 연결한다.
*/ // ------------------------------

import { getTranslations, getLocale } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { getYoutubeCelebs } from "@/actions/home/getYoutubeCelebs";
import { getYoutubeFactionVideos } from "@/actions/home/getYoutubeFactions";
import YoutubeChannelContent from "@/components/features/user/explore/youtube/YoutubeChannelContent";

export async function generateMetadata() {
  const t = await getTranslations("explore.youtube");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/youtube"),
  };
}

export default async function YoutubePage() {
  const [locale, celebs, factionVideos] = await Promise.all([
    getLocale(),
    getYoutubeCelebs(),
    getYoutubeFactionVideos(),
  ]);

  return (
    <YoutubeChannelContent
      celebs={celebs}
      factionVideos={factionVideos}
      locale={locale}
    />
  );
}
