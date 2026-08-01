/*
  파일명: /app/(main)/library/curated/[curator]/page.tsx
  기능: 선정 주체 상세
  책임: 한 기관의 소개와 그 기관이 발표한 목록 전부를 보여준다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getCuratorBySlug } from "@/actions/library";
import { getLocalizedAlternates } from "@/lib/seo";
import CuratorView from "@/components/features/library/curated/CuratorView";
import SetLibraryCrumbs from "@/components/features/library/hub/LibraryCrumbs";

export async function generateMetadata({ params }: { params: Promise<{ curator: string }> }) {
  const { curator: slug } = await params;
  const curator = await getCuratorBySlug(slug);
  if (!curator) return {};
  return {
    title: curator.name,
    description: curator.description ?? undefined,
    alternates: await getLocalizedAlternates(`/library/curated/${slug}`),
  };
}

export default async function CuratorPage({ params }: { params: Promise<{ curator: string }> }) {
  const { curator: slug } = await params;
  const curator = await getCuratorBySlug(slug);
  if (!curator) notFound();

  return (
    <div className="pb-20">
      {/* 배너 breadcrumb에 「서가 > 기관 선정 > 기관명」을 만들어 준다 */}
      <SetLibraryCrumbs crumbs={[{ label: curator.name, href: `/library/curated/${slug}` }]} />
      <CuratorView curator={curator} />
    </div>
  );
}
