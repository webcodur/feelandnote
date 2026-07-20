/*
  파일명: /app/(main)/library/museum/page.tsx
  기능: 지혜의 서가 - 전시관 페이지
  책임: 타임라인 컴포넌트를 호출하여 매체 역사 정보를 표시한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import MuseumTimeline from "@/components/features/scriptures/museum/MuseumTimeline";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.museum");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: await getLocalizedAlternates("/library/museum") };
}

async function MuseumContent({ cat, sub }: { cat?: string; sub?: string }) {
  return (
    <AsyncIntlProvider>
      <MuseumTimeline categoryId={cat} subCategoryId={sub} />
    </AsyncIntlProvider>
  );
}

export default async function MuseumPage({ searchParams }: { searchParams: Promise<{ cat?: string; sub?: string }> }) {
  const { cat, sub } = await searchParams;

  return (
    <div className="w-full pb-20">
      <MuseumContent cat={cat} sub={sub} />
    </div>
  );
}
