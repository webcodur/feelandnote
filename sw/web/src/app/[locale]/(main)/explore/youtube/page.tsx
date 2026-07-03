/*
  파일명: /app/(main)/explore/youtube/page.tsx
  기능: 유튜브 채널 모음 페이지
  책임: 서재 탐방 영상(본편·쇼츠)을 인물 페이지와 연결하여 진열한다.
*/ // ------------------------------

import { getTranslations, getLocale } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { getYoutubeCelebs } from "@/actions/home/getYoutubeCelebs";
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
  const locale = await getLocale();
  const celebs = await getYoutubeCelebs();

  return <YoutubeChannelContent celebs={celebs} locale={locale} />;
}
