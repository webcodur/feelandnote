/*
  파일명: /app/(main)/explore/works/curated/page.tsx
  기능: 기관 선정
  책임: 대학·언론·시상 기관 등이 발표한 선정 목록을 카드로 진열한다. 작품 모드 아래 「주제별 탐색」에서 들어온다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
// getTranslations는 generateMetadata와 로딩 문구에만 쓴다
import { getCuratedHub } from "@/actions/library";
import type { CuratedHub } from "@/actions/library/types";
import { LIST_PAGE_SIZE } from "@/components/features/library/hub/curatorExplore";
import { CURATED_DEFAULT_MEDIA, resolveCuratedHubMeta } from "@/lib/library/curatedMeta";
import { getLocalizedAlternates } from "@/lib/seo";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import { CuratedSection } from "../sections";

export const maxDuration = 30;

/** 매체 화면 설명문에 이름을 싣는 기관 수 */
const META_CURATOR_NAMES = 3;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const [params, t, locale] = await Promise.all([searchParams, getTranslations("library.curated"), getLocale()]);
  // 허브 조회가 실패하면 화면은 다시 시도 칸을 띄운다(CuratedSection). 메타는 기본 화면 값으로 물러난다
  const hub: CuratedHub = await getCuratedHub().catch(() => ({ curators: [] }));

  const listCountByMedia = new Map<string, number>();
  for (const curator of hub.curators) {
    for (const list of curator.lists) listCountByMedia.set(list.contentType, (listCountByMedia.get(list.contentType) ?? 0) + 1);
  }
  const state = resolveCuratedHubMeta(params, listCountByMedia, LIST_PAGE_SIZE);

  // 화면에 서는 것은 고른 매체의 목록뿐이다(기본은 도서) — 제목·설명도 그 매체로 쓴다.
  // 영화·게임·음악은 자기 주소가 정본이라 도서 화면과 같은 문구를 나눠 쓰면 서로 중복 페이지로 읽힌다
  const media = state.media ?? CURATED_DEFAULT_MEDIA;
  const heading = t(`metaTitleByMedia.${media}`);
  const title = state.page > 1 ? `${heading} · ${t("meta.page", { page: state.page })}` : heading;
  const curators = hub.curators.filter((curator) => curator.lists.some((list) => list.contentType === media));
  // 설명에 싣는 기관은 1쪽 앞머리 카드와 같게 이름순으로 고른다(filterCurators의 진열 순서)
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const names = curators.map((curator) => curator.name).sort(collator.compare).slice(0, META_CURATOR_NAMES);
  const description = curators.length > 0
    ? t("meta.mediaDescription", {
      // 한국어는 뒤에 「등」이 붙으므로 쉼표로만 잇고, 영어는 「A, B, and C」로 잇는다
      curators: locale === "en" ? new Intl.ListFormat("en", { type: "conjunction" }).format(names) : names.join(", "),
      count: curators.length,
      lists: listCountByMedia.get(media) ?? 0,
      media: t(`meta.mediaNoun.${media}`),
    })
    // 허브 조회가 실패했을 때만 쓰는 매체 공통 문구
    : t("metaDescription");
  return {
    title,
    description,
    alternates: await getLocalizedAlternates(state.path),
  };
}

export default async function CuratedPage() {
  const t = await getTranslations("pending");

  // 제목은 배너 breadcrumb(탐색 › 기관 선정)이 맡는다. 여기서 또 쓰면 같은 말이 두 번 나온다
  return (
    <div className="pb-20">
      <Lane fallback={<PendingBlock variant="grid" count={12} label={t("loading")} />}><CuratedSection /></Lane>
    </div>
  );
}
