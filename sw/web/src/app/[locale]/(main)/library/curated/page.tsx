/*
  파일명: /app/(main)/library/curated/page.tsx
  기능: 기관 선정 허브
  책임: 대학·언론·시상 기관 등이 발표한 작품 목록을 성격별로 진열한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getCuratedHub } from "@/actions/library";
// getTranslations는 generateMetadata에서만 쓴다
import { getLocalizedAlternates } from "@/lib/seo";
import CuratedHubView from "@/components/features/library/curated/CuratedHubView";

export async function generateMetadata() {
  const t = await getTranslations("library.curated");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/library/curated"),
  };
}

export default async function CuratedPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; media?: string; topic?: string }>;
}) {
  const { kind, media, topic } = await searchParams;
  const hub = await getCuratedHub();

  // 제목은 배너 breadcrumb(서가 > 기관 선정)이 맡는다. 여기서 또 쓰면 같은 말이 두 번 나온다
  return (
    <div className="pb-20">
      <CuratedHubView
        hub={hub}
        selectedKind={kind ?? null}
        selectedMedia={media ?? null}
        selectedTopic={topic ?? null}
      />
    </div>
  );
}
