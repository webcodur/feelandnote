/*
  파일명: /app/(main)/explore/works/curated/[curator]/[list]/page.tsx
  기능: 선정 목록 상세
  책임: 목록에 담긴 작품을 원문 순서대로 진열한다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCuratedList } from "@/actions/library";
import { getLocalizedAlternates, toSeoSummary } from "@/lib/seo";
import { curatedListSubject, leadDescription } from "@/lib/library/curatedMeta";
import CuratedListView from "@/components/features/library/curated/CuratedListView";
import SetLibraryCrumbs from "@/components/features/library/hub/LibraryCrumbs";

/** 주소의 기관과 목록이 실제로 맺어진 짝인지 확인한다 — 어긋난 주소는 없는 화면으로 돌린다 */
async function loadPaired(curatorSlug: string, listSlug: string) {
  const list = await getCuratedList(listSlug)
  if (!list || list.curator.slug !== curatorSlug) return null
  return list
}

export async function generateMetadata({ params }: { params: Promise<{ curator: string; list: string }> }) {
  const { curator, list: listSlug } = await params;
  const [list, t] = await Promise.all([loadPaired(curator, listSlug), getTranslations("library.curated.meta")]);
  if (!list) return {};
  // 설명은 「누가 낸 무슨 목록에 몇 편」을 먼저 말하고 소개문 요약을 잇는다. 게임·음악 수상 목록의 소개문은
  // 상 이름 없이 연도로 시작해(「2014–2025년 수상작을 …」) 소개문만으로는 무슨 상인지 몰랐다(26.09.29 전수 점검).
  // 수의 단위는 매체를 따른다(편·개·장 / films·games·albums)
  const subject = curatedListSubject(list.curator.name, list.title);
  const counted = { title: subject.title, count: list.itemCount, type: list.contentType };
  const lead = subject.curator
    ? t("listFallback", { ...counted, curator: subject.curator })
    : t("listLead", counted);
  return {
    title: `${list.title} · ${list.curator.name}`,
    // 소개문 전문(170~690자)을 싣지 않는다 — 검색 결과가 첫 문장 중간에서 잘린다
    description: leadDescription(lead, list.description, toSeoSummary),
    alternates: await getLocalizedAlternates(`/explore/works/curated/${curator}/${listSlug}`),
  };
}

export default async function CuratedListPage({
  params,
}: {
  params: Promise<{ curator: string; list: string }>;
}) {
  const { curator, list: listSlug } = await params;
  const list = await loadPaired(curator, listSlug);
  if (!list) notFound();

  return (
    <div className="pb-20">
      {/* 배너 breadcrumb에 「서가 > 기관 선정 > 기관명 > 목록명」을 만들어 준다 */}
      <SetLibraryCrumbs
        crumbs={[
          { label: list.curator.name, href: `/explore/works/curated/${curator}` },
          { label: list.title, href: `/explore/works/curated/${curator}/${listSlug}` },
        ]}
      />
      <CuratedListView list={list} />
    </div>
  );
}
