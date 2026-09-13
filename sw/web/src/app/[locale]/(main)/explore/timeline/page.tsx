/*
  파일명: /app/(main)/explore/timeline/page.tsx
  기능: 국가별 셀럽 연대기 페이지
  책임: 국가별로 셀럽을 시간순으로 보여준다. 별도 태그 없이 기존 데이터(nationality, birth_date)를 활용.
*/ // ------------------------------

import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { getAlternates } from "@/lib/seo";
import { getCelebTimeline } from "@/actions/home/getCelebTimeline";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import TimelineSection from "@/components/features/user/explore/sections/TimelineSection";
import { paginateTimeline } from "@/components/features/user/explore/sections/TimelineSection/pagination";
import { redirect } from "@/i18n/navigation";
import { getCountryNameByLocale } from "@/lib/countries";

// 국가·페이지 쿼리는 요청마다 읽고, 전체 목록 조회는 getCelebTimeline 캐시를 쓴다.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ country?: string | string[]; page?: string | string[] }>;
}

const readTimeline = cache(async (locale: "ko" | "en", country?: string, page?: string) => {
  const data = await getCelebTimeline(locale);
  return {
    ...paginateTimeline(data, country, page),
    countries: data.countries.map((item) => ({ ...item, name: getCountryNameByLocale(item.code, locale) })),
  };
});

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("explore.timelinePage");
  const data = await readTimeline(locale === "en" ? "en" : "ko", typeof search.country === "string" ? search.country : undefined, typeof search.page === "string" ? search.page : undefined);
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates(data.path, locale === "en" ? "en" : "ko"),
  };
}

async function TimelineContent({ locale, search }: { locale: "en" | "ko"; search: Awaited<PageProps["searchParams"]> }) {
  const country = typeof search.country === "string" ? search.country : undefined;
  const page = typeof search.page === "string" ? search.page : undefined;
  const data = await readTimeline(locale, country, page);
  if ((country !== undefined && country !== data.country) || (page !== undefined && page !== String(data.page))) {
    redirect({ href: data.path, locale });
  }

  return (
    <AsyncIntlProvider>
      <TimelineSection key={`${data.country}-${data.page}`} {...data} />
    </AsyncIntlProvider>
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TimelineContent locale={locale === "en" ? "en" : "ko"} search={await searchParams} />;
}
