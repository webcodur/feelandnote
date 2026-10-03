/*
  파일명: /app/(main)/explore/monologue/page.tsx
  기능: 가상독백 수집 페이지
  책임: 가상독백이 있는 인물 명부를 제공한다. 소개·본문·책장은 인물을 선택할 때 읽는다.
*/ // ------------------------------

import { getTranslations, setRequestLocale } from "next-intl/server";
import { after } from "next/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { getVirtualMonologueCelebs } from "@/actions/celebs/getVirtualMonologueCelebs";
import { getCelebVirtualMonologue } from "@/actions/celebs/getCelebVirtualMonologue";
import { getCelebBookShelf } from "@/actions/celebs/getCelebBookShelf";
import MonologueScreen from "@/components/features/user/explore/monologue/MonologueScreen";

export const revalidate = 604800;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("explore.monologue");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/monologue"),
  };
}

/** 선택할 인물의 자료를 미리 채우는 수 상한 — 낭독 인물이 늘어도 배후 조회가 서버를 밀지 않게 둔다 */
const PREWARM_LIMIT = 4;

export default async function MonologuePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const celebs = await getVirtualMonologueCelebs(locale);
  /* 얼굴을 골라 본문에 펼치는 독백·책장은 인물별 상세 캐시다. 명부가 만들어지는 이 한 번에
     미리 채워 두면 첫 클릭도 콜드 조회(책장은 체인이 깊어 20초까지 간다)를 기다리지 않는다.
     공유 풀 캐시를 동시에 타지 않게 인물별로 순차로 채운다. */
  after(async () => {
    for (const celeb of celebs.slice(0, PREWARM_LIMIT)) {
      try {
        await Promise.all([
          getCelebVirtualMonologue(celeb.id, celeb.voiceLocale),
          getCelebBookShelf(celeb.id, locale),
        ]);
      } catch (error) {
        console.error("[가상독백] 독백·책장 미리 채우기 실패:", celeb.id, error);
      }
    }
  });
  return <MonologueScreen celebs={celebs} locale={locale} />;
}
