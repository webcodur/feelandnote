/*
  파일명: /app/(main)/explore/works/popular/page.tsx
  기능: 불후의 명작(시대·직군별 고전)
  책임: 인물들이 거듭 선택한 고전만 조회한다.
        베스트셀러는 작품 모드 첫 화면(/explore/works)으로 옮겼다(26.09.28). 옛 주소(?mode 없음)는 분야·출처 조건을 그대로 들고
        그 화면으로 영구 이동한다 — 외부 링크·검색 색인에 남은 주소가 빈 화면이나 명작으로 떨어지지 않게.
*/ // ------------------------------

import { permanentRedirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import PopularSection from "@/components/features/library/sections/PopularSection";
import { getChosenLibrary, getProfessionContentCounts } from "@/actions/library";
import { getPathname } from "@/i18n/navigation";
import { getLocalizedAlternates } from "@/lib/seo";

type SearchParams = Promise<{ mode?: string; category?: string; source?: string }>;

export async function generateMetadata() {
  // 「주제별 탐색」 카드 문구(library.hub.classics*)는 짧은 안내라 검색 제목·설명으로는 모자란다 — 따로 쓴다
  const t = await getTranslations("library.popular");
  const title = t("classicsMetaTitle");
  const description = t("classicsMetaDescription");
  return {
    title,
    description,
    alternates: await getLocalizedAlternates("/explore/works/popular?mode=classics"),
  };
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { mode, category, source } = await searchParams;
  if (mode !== "classics") {
    const query: Record<string, string> = {};
    if (category) query.category = category;
    if (source) query.source = source;
    // 조건이 없으면 문자열 주소로 넘긴다 — 빈 query 객체는 주소 끝에 「?」를 남긴다
    const href = Object.keys(query).length ? { pathname: "/explore/works", query } : "/explore/works";
    permanentRedirect(getPathname({ href, locale: await getLocale() }));
  }

  return <Lane fallback={<PendingBlock variant="grid" count={12} />}><PopularContent /></Lane>;
}

async function PopularContent() {
  const [initialClassicsData, professionCounts] = await Promise.all([
    getChosenLibrary({ page: 1, limit: 12 }),
    getProfessionContentCounts(),
  ]);
  return (
    <>
      <PopularSection initialClassicsData={initialClassicsData} professions={professionCounts.map(p => ({ profession: p.profession, count: p.count }))} />
    </>
  );
}
