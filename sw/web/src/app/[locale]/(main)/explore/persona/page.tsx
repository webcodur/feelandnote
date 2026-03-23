/*
  파일명: /app/(main)/explore/persona/page.tsx
  기능: 비범한 기록가 전체 보기 페이지
  책임: persona 16축 극단 셀럽 + 10명 차순위를 표시한다.
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getPersonaExtremes } from "@/actions/home/getPersonaExtremes";
import PersonaFullSection from "@/components/features/user/explore/sections/PersonaFullSection";

export const revalidate = 300;

export async function generateMetadata() {
  const t = await getTranslations("explore.persona");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/explore/persona"),
  };
}

function PersonaSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-24 bg-bg-card rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-80 bg-bg-card rounded-2xl" />
        ))}
      </div>
    </div>
  );
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
  return (
    <Suspense fallback={<PersonaSkeleton />}>
      <PersonaServer />
    </Suspense>
  );
}
