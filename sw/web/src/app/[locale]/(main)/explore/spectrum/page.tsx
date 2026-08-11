/*
  파일명: /app/(main)/explore/spectrum/page.tsx
  기능: 비범한 기록가 전체 보기 페이지
  책임: spectrum 16축 극단 셀럽 + 10명 차순위를 표시한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getSpectrumExtremes } from "@/actions/home/getSpectrumExtremes";
import SpectrumFullSection from "@/components/features/user/explore/sections/SpectrumFullSection";

export const revalidate = 3600;

export async function generateMetadata() {
  const t = await getTranslations("explore.spectrum");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/spectrum"),
  };
}

async function SpectrumServer() {
  const entries = await getSpectrumExtremes({ runnersUpLimit: 10 });

  return (
    <AsyncIntlProvider>
      <SpectrumFullSection entries={entries} />
    </AsyncIntlProvider>
  );
}

export default function SpectrumPage() {
  return <SpectrumServer />;
}
