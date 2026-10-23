"use client";

/*
  작품 첫 화면의 선정 목록 — 매체 칩 → 검색 → [국가 | 주제 | 기관] → 결과 수 → 목록 카드 격자 → 페이지.
  기관마다 로고·이름을 한 번 세우고, 고른 매체의 선정 목록을 그 아래에서 바로 연다.
  조건 셋은 한 단추(필터) 안에 접지 않고 검색창 아래 줄에 펼쳐 둔다. 단추가 지금 고른 값을 직접 보이므로 따로 조건 칩을 달지 않는다.
  정렬은 두지 않는다(curatorExplore.ts). 조건은 URL에 남긴다.
*/

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import CategoryChip from "@/components/ui/CategoryChip";
import { ChevronDown, Globe, Landmark, Tags, type LucideIcon } from "lucide-react";
import type { CuratedHub } from "@/actions/library/types";
import { Pagination } from "@/components/ui/Pagination";
import ExploreSearchControls, { EXPLORE_CONTROL_CHANGED_CLASS, EXPLORE_CONTROL_CLASS, EXPLORE_PANEL_CLASS } from "@/components/shared/ExploreSearchControls";
import { FilterModal } from "@/components/shared/filters";
import { summarizeBrowse } from "./useCuratedBrowse";
import { CuratedInstitutionCard } from "./CuratedListCard";
import { CURATOR_FACETS, CURATOR_PAGE_SIZE, filterCurators, getCuratorCountries, hasFacetChoice, parseCuratorFilters, shownLists, type CuratorExploreFilters, type CuratorFacet } from "../hub/curatorExplore";
import { getCountryNameByLocale } from "@/lib/countries";
import { countryFirst } from "@/lib/visitorCountry";

const FACET_ICONS: Record<CuratorFacet, LucideIcon> = { country: Globe, topic: Tags, kind: Landmark };
const FACET_TITLE_KEYS: Record<CuratorFacet, string> = { country: "filterCountry", topic: "filterTopic", kind: "filterKind" };

export default function CuratedHubView({ hub, visitorCountry = null }: { hub: CuratedHub; visitorCountry?: string | null }) {
  const t = useTranslations("library.hub");
  const curated = useTranslations("library.curated");
  const ui = useTranslations("home.ui");
  const locale = useLocale();
  const params = useSearchParams();
  const pathname = usePathname();
  const allSummary = summarizeBrowse(hub.curators);
  const initialFilters = parseCuratorFilters(params, { ...allSummary, countries: getCuratorCountries(hub.curators) });
  const mediaCurators = hub.curators.map(curator => ({ ...curator, lists: curator.lists.filter(list => list.contentType === initialFilters.media) })).filter(curator => curator.lists.length);
  const summary = summarizeBrowse(mediaCurators);
  const countries = getCuratorCountries(mediaCurators);
  const filters = parseCuratorFilters(params, { ...summary, medias: allSummary.medias, countries });
  const [draft, setDraft] = useState<string | undefined>();
  const [openFacet, setOpenFacet] = useState<CuratorFacet | null>(null);
  const shown = countryFirst(filterCurators(hub.curators, filters, locale), visitorCountry, curator => curator.country);
  const lists = shownLists(shown);
  const totalPages = Math.max(1, Math.ceil(shown.length / CURATOR_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const search = draft ?? filters.search;

  // 조건마다 선택지 — 국가는 이름 가나다순, 주제는 많은 순, 기관 종류는 진열 순서(KIND_ORDER)
  const facetOptions: Record<CuratorFacet, string[]> = {
    country: countryFirst([...countries].sort((a, b) => getCountryNameByLocale(a, locale).localeCompare(getCountryNameByLocale(b, locale), locale)), visitorCountry, code => code),
    topic: summary.topics,
    kind: summary.kinds,
  };
  const valueLabel = (facet: CuratorFacet, value: string) => {
    if (value === "all") return curated("filterAll");
    if (facet === "country") return getCountryNameByLocale(value, locale);
    if (facet === "kind") return curated(`kind.${value}`);
    return curated.has(`topicLabel.${value}`) ? curated(`topicLabel.${value}`) : value;
  };
  // 선택지 옆 수는 다른 조건·검색을 그대로 둔 채 그 값을 골랐을 때 남는 선정 목록 수다(화면의 카드 수) — 0인 값은 창에서 잠긴다
  const countWith = (facet: CuratorFacet, value: string) => shownLists(filterCurators(hub.curators, { ...filters, [facet]: value, page: 1 }, locale)).length;
  // 이 매체에서 골라도 목록이 그대로인 조건(게임·음악의 주제·기관)은 단추를 잠근다. 이미 고른 값이 있으면 풀 수 있게 연다
  const facetCounts: Record<CuratorFacet, number[]> = {
    country: facetOptions.country.map(value => mediaCurators.filter(curator => curator.country === value).length),
    topic: facetOptions.topic.map(value => summary.topicCounts.get(value) ?? 0),
    kind: facetOptions.kind.map(value => summary.kindCounts.get(value) ?? 0),
  };

  const queryFor = (patch: Partial<CuratorExploreFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const query = new URLSearchParams();
    if (next.search) query.set("search", next.search);
    for (const key of ["media", "country", "topic", "kind"] as const) if (next[key] !== "all") query.set(key, next[key]);
    if (next.page > 1) query.set("page", String(next.page));
    return query.size ? `?${query}` : "";
  };
  const update = (patch: Partial<CuratorExploreFilters>) => {
    window.history.pushState(null, "", `${window.location.pathname}${queryFor(patch)}`);
    setDraft(undefined);
  };
  const cardQuery = new URLSearchParams();
  if (filters.media !== "all") cardQuery.set("media", filters.media);
  if (filters.topic !== "all") cardQuery.set("topic", filters.topic);

  return (
    <div>
      <div className={EXPLORE_PANEL_CLASS}>
        {/* 매체 범주 — 랭킹과 같은 아이콘·대표색 칩 */}
        <nav aria-label={t("media")} className="flex flex-wrap items-center justify-center gap-2">
          {allSummary.medias.map(media => <CategoryChip key={media} media={media} selected={filters.media === media}
            href={`${pathname}${queryFor({ media, kind: "all", topic: "all", country: "all" })}`} onClick={event => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault(); update({ media, kind: "all", topic: "all", country: "all" });
            }}>
            {t.has(`mediaShort.${media}`) ? t(`mediaShort.${media}`) : curated(`mediaLabel.${media}`)}
          </CategoryChip>)}
        </nav>
        <ExploreSearchControls value={search} placeholder={t("searchPlaceholder")} searchLabel={ui("searchButton")}
          clearLabel={ui("compactFilters.remove", { label: search })} onChange={setDraft}
          onSubmit={() => update({ search: search.trim() })} onClear={() => update({ search: "" })}>
          {CURATOR_FACETS.map(facet => {
            const Icon = FACET_ICONS[facet];
            const changed = filters[facet] !== "all";
            const title = curated(FACET_TITLE_KEYS[facet]);
            // 고르기 전에는 조건 이름(국가), 고른 뒤에는 값(영국)을 금색으로 보인다
            const label = changed ? valueLabel(facet, filters[facet]) : t(`facet.${facet}`);
            return (
              <button key={facet} type="button" onClick={() => setOpenFacet(facet)} aria-haspopup="dialog"
                disabled={!changed && !hasFacetChoice(facetCounts[facet], mediaCurators.length)}
                aria-label={`${title}: ${valueLabel(facet, filters[facet])}`}
                className={`${EXPLORE_CONTROL_CLASS} ${changed ? EXPLORE_CONTROL_CHANGED_CLASS : ""}`}>
                {/* 좁은 세 칸에서는 이름·선택값을 읽을 공간을 확보한다. */}
                <Icon size={15} className="hidden shrink-0 sm:block" aria-hidden /><span className="truncate leading-5">{label}</span>
                <ChevronDown size={14} className="shrink-0 text-text-tertiary" aria-hidden />
              </button>
            );
          })}
        </ExploreSearchControls>
        {/* 결과 수 — 인물 모드와 같이 조작 바로 아래 한 줄 */}
        <p role="status" className="text-center text-xs tabular-nums text-text-secondary">
          {t("listResults", { lists: lists.length, count: shown.length })}
        </p>
      </div>
      {lists.length ? <div className="grid grid-cols-1 items-start gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
        {shown.slice((page - 1) * CURATOR_PAGE_SIZE, page * CURATOR_PAGE_SIZE).map(curator => (
          <CuratedInstitutionCard key={curator.slug} curator={curator} curatorQuery={cardQuery.size ? `?${cardQuery}` : ""} />
        ))}
      </div> : <div className="space-y-3 py-12 text-center">
        <p className="text-sm text-text-secondary">{t("noResults")}</p>
        <button type="button" className={`${EXPLORE_CONTROL_CLASS} mx-auto`} onClick={() => update({ search: "", kind: "all", topic: "all", country: "all" })}>{t("resetFilters")}</button>
      </div>}
      <div className="mt-8"><Pagination presentation="quiet" currentPage={page} totalPages={totalPages}
        getPageHref={next => `${pathname}${queryFor({ page: next })}`} onPageChange={next => update({ page: next })} /></div>
      {openFacet && <FilterModal isOpen title={curated(FACET_TITLE_KEYS[openFacet])} current={filters[openFacet]}
        options={["all", ...facetOptions[openFacet]].map(value => ({ value, label: valueLabel(openFacet, value), count: countWith(openFacet, value) }))}
        onChange={value => update({ [openFacet]: value })} onClose={() => setOpenFacet(null)} />}
    </div>
  );
}
