/*
  파일명: /app/(main)/library/curated/[curator]/[list]/page.tsx
  기능: 선정 목록 상세
  책임: 목록에 담긴 작품을 원문 순서대로 진열한다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getCuratedList } from "@/actions/library";
import { getLocalizedAlternates } from "@/lib/seo";
import CuratedListView from "@/components/features/library/curated/CuratedListView";
import SetLibraryCrumbs from "@/components/features/library/hub/LibraryCrumbs";

/** 주소의 기관과 목록이 실제로 맺어진 짝인지 확인한다 — 어긋난 주소는 없는 화면으로 돌린다 */
async function loadPaired(curatorSlug: string, listSlug: string, showAll = false) {
  const list = await getCuratedList(listSlug, showAll)
  if (!list || list.curator.slug !== curatorSlug) return null
  return list
}

export async function generateMetadata({ params }: { params: Promise<{ curator: string; list: string }> }) {
  const { curator, list: listSlug } = await params;
  const list = await loadPaired(curator, listSlug);
  if (!list) return {};
  return {
    title: `${list.title} · ${list.curator.name}`,
    description: list.description ?? undefined,
    alternates: await getLocalizedAlternates(`/library/curated/${curator}/${listSlug}`),
  };
}

export default async function CuratedListPage({
  params,
  searchParams,
}: {
  params: Promise<{ curator: string; list: string }>;
  searchParams: Promise<{ all?: string }>;
}) {
  const { curator, list: listSlug } = await params;
  const { all } = await searchParams;
  const list = await loadPaired(curator, listSlug, all === "1");
  if (!list) notFound();

  return (
    <div className="pb-20">
      {/* 배너 breadcrumb에 「서가 > 기관 선정 > 기관명 > 목록명」을 만들어 준다 */}
      <SetLibraryCrumbs
        crumbs={[
          { label: list.curator.name, href: `/library/curated/${curator}` },
          { label: list.title, href: `/library/curated/${curator}/${listSlug}` },
        ]}
      />
      <CuratedListView list={list} />
    </div>
  );
}
