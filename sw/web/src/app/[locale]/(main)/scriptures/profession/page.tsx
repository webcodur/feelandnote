/*
  파일명: /app/(main)/scriptures/profession/page.tsx
  기능: 길의 갈래 페이지
  책임: 분야별 인물들의 필독서를 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import ProfessionSection from "@/components/features/scriptures/sections/ProfessionSection";
import { getProfessionContentCounts } from "@/actions/scriptures";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.profession");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

async function ProfessionContent({ initialProfession }: { initialProfession?: string }) {
  const professionCounts = await getProfessionContentCounts();
  return (
    <AsyncIntlProvider>
      <ProfessionSection professionCounts={professionCounts} initialProfession={initialProfession} />
    </AsyncIntlProvider>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  return <ProfessionContent initialProfession={p} />;
}
