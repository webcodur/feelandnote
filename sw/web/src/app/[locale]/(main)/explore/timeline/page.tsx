/*
  파일명: /app/(main)/explore/timeline/page.tsx
  기능: 국가별 셀럽 연대기 페이지
  책임: 국가별로 셀럽을 시간순으로 보여준다. 별도 태그 없이 기존 데이터(nationality, birth_date)를 활용.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import { getCelebTimeline } from "@/actions/home";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import TimelineSection from "@/components/features/user/explore/sections/TimelineSection";

export const revalidate = 3600;

export async function generateMetadata() {
  const t = await getTranslations("explore.timelinePage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/explore/timeline"),
  };
}

async function TimelineContent() {
  const { celebs, countries } = await getCelebTimeline();

  return (
    <AsyncIntlProvider>
      <TimelineSection celebs={celebs} countries={countries} />
    </AsyncIntlProvider>
  );
}

export default function Page() {
  return <TimelineContent />;
}
