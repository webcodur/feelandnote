/*
  파일명: /app/(main)/explore/timeline/page.tsx
  기능: 국가별 셀럽 연대기 페이지
  책임: 국가별로 셀럽을 시간순으로 보여준다. 별도 태그 없이 기존 데이터(nationality, birth_date)를 활용.
*/ // ------------------------------

import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { getCelebTimeline } from "@/actions/home";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import TimelineSection from "@/components/features/user/explore/sections/TimelineSection";

// 정적(ISR). 연표는 전체 인물을 싣는 큰 화면(HTML 수 MB)이라 방문마다 만들면 그 바이트가 원본 전송량이 된다.
// getLocale() 대신 params의 locale을 쓴다 — 요청 헤더를 읽는 순간 정적이 깨진다.
export const revalidate = 604800;

// [locale] 세그먼트는 generateStaticParams가 없으면 동적으로 취급된다(빌드 표의 ƒ). 빈 배열을 돌려주면
// 첫 요청에 ISR로 만들어져 다음부터 CDN에서 나간다(인물 상세와 같은 방식).
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("explore.timelinePage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/timeline"),
  };
}

async function TimelineContent({ locale }: { locale: "en" | "ko" }) {
  const { celebs, countries } = await getCelebTimeline(locale);

  return (
    <AsyncIntlProvider>
      <TimelineSection celebs={celebs} countries={countries} />
    </AsyncIntlProvider>
  );
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TimelineContent locale={locale === "en" ? "en" : "ko"} />;
}
