/*
  파일명: /app/(main)/explore/monologue/page.tsx
  기능: 가상독백 수집 페이지
  책임: 낭독 음원이 있는 인물을 앞세우고, 글로 읽는 독백은 명부로 모은다.
*/ // ------------------------------

import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { getVirtualMonologueCelebs } from "@/actions/celebs/getVirtualMonologueCelebs";
import MonologueScreen from "@/components/features/user/explore/monologue/MonologueScreen";

export async function generateMetadata() {
  const t = await getTranslations("explore.monologue");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/monologue"),
    openGraph: { title: t("metaTitle"), description: t("metaDescription") },
  };
}

export default async function MonologuePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const celebs = await getVirtualMonologueCelebs(locale);
  const voiced = celebs.filter((celeb) => celeb.hasVoice);
  const silent = celebs.filter((celeb) => !celeb.hasVoice);
  return <MonologueScreen voiced={voiced} silent={silent} />;
}
