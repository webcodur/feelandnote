/*
  파일명: /app/(main)/explore/today/page.tsx
  기능: 오늘의 인물 페이지
  책임: 매일 새로운 인물의 서재를 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import TodayFigureSection from "@/components/features/figure/TodayFigureSection";
import { getTodayFigure } from "@/actions/scriptures";

export async function generateMetadata() {
  const t = await getTranslations("explore.today");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: await getLocalizedAlternates("/explore/today") };
}

async function FigureContent() {
  const { figure, contents, source } = await getTodayFigure();
  if (!figure) return null;
  return (
    <AsyncIntlProvider>
      <TodayFigureSection figure={figure} contents={contents} source={source} />
    </AsyncIntlProvider>
  );
}

export default function Page() {
  return <FigureContent />;
}
