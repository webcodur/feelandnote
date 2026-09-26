/*
  파일명: /app/(main)/explore/works/curated/page.tsx
  기능: 기관 선정 허브
  책임: 대학·언론·시상 기관 등이 발표한 작품 목록을 성격별로 진열한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getCuratedHub } from "@/actions/library";
// getTranslations는 generateMetadata에서만 쓴다
import { getLocalizedAlternates } from "@/lib/seo";
import CuratedHubView from "@/components/features/library/curated/CuratedHubView";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";

export async function generateMetadata() {
  const t = await getTranslations("library.curated");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/works/curated"),
  };
}

export default async function CuratedPage() {
  const hub = await getCuratedHub();
  const t = await getTranslations("pending");

  // 제목은 배너 breadcrumb(서가 > 기관 선정)이 맡는다. 여기서 또 쓰면 같은 말이 두 번 나온다
  return (
    <div className="pb-20">
      <Lane fallback={<PendingBlock variant="grid" count={12} label={t("loading")} />}><CuratedHubView hub={hub} /></Lane>
    </div>
  );
}
