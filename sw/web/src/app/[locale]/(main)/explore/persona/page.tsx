/*
  파일명: /app/(main)/explore/persona/page.tsx
  기능: 비범한 기록가 전체 보기 페이지
  책임: persona 16축 극단 셀럽 + 10명 차순위를 표시한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getPersonaExtremes } from "@/actions/home/getPersonaExtremes";
import PersonaFullSection from "@/components/features/user/explore/sections/PersonaFullSection";

export const revalidate = 3600;

export async function generateMetadata() {
  const t = await getTranslations("explore.persona");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/persona"),
  };
}

async function PersonaServer() {
  const entries = await getPersonaExtremes({ runnersUpLimit: 10 });

  return (
    <AsyncIntlProvider>
      <PersonaFullSection entries={entries} />
    </AsyncIntlProvider>
  );
}

export default function PersonaPage() {
  return <PersonaServer />;
}
