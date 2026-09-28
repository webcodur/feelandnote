/*
  파일명: /app/(main)/explore/works/curated/[curator]/page.tsx
  기능: 선정 주체 상세
  책임: 한 기관의 소개와 그 기관이 발표한 목록 전부를 보여준다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCuratorBySlug } from "@/actions/library";
import { buildCuratorMetaTitle } from "@/lib/library/curatedMeta";
import { getLocalizedAlternates, toSeoSummary } from "@/lib/seo";
import CuratorView from "@/components/features/library/curated/CuratorView";
import SetLibraryCrumbs from "@/components/features/library/hub/LibraryCrumbs";

export async function generateMetadata({ params }: { params: Promise<{ curator: string }> }) {
  const { curator: slug } = await params;
  const [curator, t] = await Promise.all([getCuratorBySlug(slug), getTranslations("library.curated.meta")]);
  if (!curator) return {};
  const listTitles = curator.lists.map((list) => list.title);
  return {
    // 기관명만 쓰면 무엇이 있는 페이지인지 모른다 — 검색어가 되는 목록 이름을 함께 싣는다
    title: buildCuratorMetaTitle(curator.name, listTitles, (count) => t("moreLists", { count })),
    description: curator.description
      ? toSeoSummary(curator.description)
      : t("curatorFallback", { name: curator.name, lists: listTitles.join(", ") }),
    alternates: await getLocalizedAlternates(`/explore/works/curated/${slug}`),
  };
}

export default async function CuratorPage({ params, searchParams }: { params: Promise<{ curator: string }>; searchParams: Promise<{ media?: string; topic?: string }> }) {
  const { curator: slug } = await params;
  const curator = await getCuratorBySlug(slug);
  if (!curator) notFound();

  return (
    <div className="pb-20">
      {/* 배너 breadcrumb에 「서가 > 기관 선정 > 기관명」을 만들어 준다 */}
      <SetLibraryCrumbs crumbs={[{ label: curator.name, href: `/explore/works/curated/${slug}` }]} />
      <CuratorView curator={curator} initialBrowse={await searchParams} />
    </div>
  );
}
