/*
  파일명: /app/(main)/explore/today/page.tsx
  기능: 오늘의 인물 페이지
  책임: 매일 새로운 인물의 서재를 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import TodayFigureSection from "@/components/features/figure/TodayFigureSection";
import { getTodayFigure } from "@/actions/library";

export async function generateMetadata() {
  const t = await getTranslations("explore.today");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: await getLocalizedAlternates("/explore/today") };
}

async function FigureContent() {
  const { figure, contents, date, source } = await getTodayFigure();
  if (!figure) return null;
  return (
    <>
      <TodayFigureSection figure={figure} contents={contents} date={date} source={source} />
    </>
  );
}

export default function Page() {
  return <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-80" />}><FigureContent /></Lane>;
}
