import type { CuratedHub } from "@/actions/library/types";

/*
  작품 첫 화면 선정 목록의 조건. 화면에 서는 단위는 선정 목록이다(기관 44곳 중 39곳이 목록을 하나만 내서
  기관 층은 한 번 더 누르는 단계일 뿐이었다). 거르기는 기관 단위로 하고(국가·기관 종류는 기관의 성질),
  남은 기관의 목록을 기관 이름순 → 기관 안 목록 순서로 늘어놓는다 — 같은 기관의 목록이 나란히 선다.
  정렬은 두지 않는다. 조건은 국가·주제·기관 종류 셋이며 조작 줄에 셋 다 펼쳐 둔다(한 단추 안에 접지 않는다).
*/
/** 한 쪽에 싣는 선정 목록 수 — 카드 열 수(2·3·4)로 나눠 떨어지게 12 */
export const LIST_PAGE_SIZE = 12;
/** 조작 줄의 조건 순서 — 국가 | 주제 | 기관 */
export const CURATOR_FACETS = ["country", "topic", "kind"] as const;
export type CuratorFacet = typeof CURATOR_FACETS[number];

export interface CuratorExploreFilters {
  search: string;
  media: string;
  kind: string;
  topic: string;
  country: string;
  page: number;
}

export function getCuratorCountries(curators: CuratedHub["curators"]): string[] {
  return [...new Set(curators.flatMap(curator => curator.country ? [curator.country] : []))].sort();
}

export function parseCuratorFilters(params: { get: (key: string) => string | null }, available: { medias: string[]; kinds: string[]; topics: string[]; countries: string[] }): CuratorExploreFilters {
  const page = Number(params.get("page"));
  return {
    search: params.get("search")?.trim() ?? "",
    media: available.medias.includes(params.get("media") ?? "") ? params.get("media")! : available.medias[0] ?? "BOOK",
    kind: available.kinds.includes(params.get("kind") ?? "") ? params.get("kind")! : "all",
    topic: available.topics.includes(params.get("topic") ?? "") ? params.get("topic")! : "all",
    country: available.countries.includes(params.get("country") ?? "") ? params.get("country")! : "all",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function filterCurators(curators: CuratedHub["curators"], filters: CuratorExploreFilters, locale: string) {
  const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase(locale).replace(/\s+/g, " ").trim();
  const query = normalize(filters.search);
  const shown = curators.flatMap(curator => {
    if (filters.kind !== "all" && curator.kind !== filters.kind) return [];
    if (filters.country !== "all" && curator.country !== filters.country) return [];
    const matchesInstitution = !query || normalize(curator.name).includes(query);
    const lists = curator.lists.filter(list =>
      list.contentType === filters.media
      && (filters.topic === "all" || list.topics.includes(filters.topic))
      && (matchesInstitution || normalize(list.title).includes(query)));
    return lists.length ? [{ ...curator, lists, listCount: lists.length }] : [];
  });
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  return shown.sort((a, b) => collator.compare(a.name, b.name));
}

/** 거른 기관들의 목록을 화면에 설 순서대로 편다 — 기관 이름순, 기관 안에서는 목록 순서 */
export function shownLists(curators: ReturnType<typeof filterCurators>) {
  return curators.flatMap(curator => curator.lists);
}

/** 한 조건에서 고를 거리가 있는가 — 골랐을 때 기관이 줄어드는 선택지가 하나라도 있어야 한다.
 *  게임·음악은 기관이 모두 시상 기관이고 주제가 없어, 골라도 목록이 그대로인 단추는 잠근다.
 *  counts는 선택지마다 해당하는 기관 수, total은 지금 매체의 기관 수다 */
export function hasFacetChoice(counts: readonly number[], total: number): boolean {
  return counts.some(count => count > 0 && count < total);
}
