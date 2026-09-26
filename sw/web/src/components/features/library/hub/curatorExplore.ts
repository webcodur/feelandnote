import type { CuratedHub } from "@/actions/library/types";

export const CURATOR_PAGE_SIZE = 12;
export const CURATOR_SORTS = ["name", "lists", "works"] as const;
export type CuratorSort = typeof CURATOR_SORTS[number];
export interface CuratorExploreFilters {
  search: string;
  media: string;
  kind: string;
  topic: string;
  sort: CuratorSort;
  page: number;
}

export function parseCuratorFilters(params: { get: (key: string) => string | null }, available: { medias: string[]; kinds: string[]; topics: string[] }): CuratorExploreFilters {
  const sort = params.get("sort");
  const page = Number(params.get("page"));
  return {
    search: params.get("search")?.trim() ?? "",
    media: available.medias.includes(params.get("media") ?? "") ? params.get("media")! : available.medias[0] ?? "BOOK",
    kind: available.kinds.includes(params.get("kind") ?? "") ? params.get("kind")! : "all",
    topic: available.topics.includes(params.get("topic") ?? "") ? params.get("topic")! : "all",
    sort: CURATOR_SORTS.includes(sort as CuratorSort) ? sort as CuratorSort : "name",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function filterCurators(curators: CuratedHub["curators"], filters: CuratorExploreFilters, locale: string) {
  const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase(locale).replace(/\s+/g, " ").trim();
  const query = normalize(filters.search);
  const shown = curators.flatMap(curator => {
    if (filters.kind !== "all" && curator.kind !== filters.kind) return [];
    const matchesInstitution = !query || normalize(curator.name).includes(query);
    const lists = curator.lists.filter(list =>
      list.contentType === filters.media
      && (filters.topic === "all" || list.topics.includes(filters.topic))
      && (matchesInstitution || normalize(list.title).includes(query)));
    return lists.length ? [{ ...curator, lists, listCount: lists.length }] : [];
  });
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  return shown.sort((a, b) => {
    const rank = filters.sort === "lists" ? b.lists.length - a.lists.length
      : filters.sort === "works" ? b.lists.reduce((n, l) => n + l.itemCount, 0) - a.lists.reduce((n, l) => n + l.itemCount, 0) : 0;
    return rank || collator.compare(a.name, b.name);
  });
}
