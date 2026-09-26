"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ArrowDownWideNarrow, SlidersHorizontal, X } from "lucide-react";
import type { CuratedHub } from "@/actions/library/types";
import { Pagination } from "@/components/ui/Pagination";
import ExploreSearchControls, { EXPLORE_CONTROL_CLASS, EXPLORE_PANEL_CLASS } from "@/components/shared/ExploreSearchControls";
import { FilterModal } from "@/components/shared/filters";
import { summarizeBrowse } from "./useCuratedBrowse";
import CuratorLogoCard from "../hub/CuratorLogoCard";
import CuratorFiltersModal from "../hub/CuratorFiltersModal";
import { CURATOR_PAGE_SIZE, CURATOR_SORTS, filterCurators, parseCuratorFilters, type CuratorExploreFilters } from "../hub/curatorExplore";

const CuratorPreviewModal = dynamic(() => import("../hub/CuratorPreviewModal"));

export default function CuratedHubView({ hub }: { hub: CuratedHub }) {
  const t = useTranslations("library.hub");
  const curated = useTranslations("library.curated");
  const ui = useTranslations("home.ui");
  const locale = useLocale();
  const params = useSearchParams();
  const pathname = usePathname();
  const allSummary = summarizeBrowse(hub.curators);
  const initialFilters = parseCuratorFilters(params, allSummary);
  const mediaCurators = hub.curators.map(curator => ({ ...curator, lists: curator.lists.filter(list => list.contentType === initialFilters.media) })).filter(curator => curator.lists.length);
  const summary = summarizeBrowse(mediaCurators);
  const filters = parseCuratorFilters(params, { ...summary, medias: allSummary.medias });
  const [draft, setDraft] = useState<string | undefined>();
  const [dialog, setDialog] = useState<"sort" | "detail" | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const shown = filterCurators(hub.curators, filters, locale);
  const totalPages = Math.max(1, Math.ceil(shown.length / CURATOR_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const search = draft ?? filters.search;
  const detailCount = Number(filters.kind !== "all") + Number(filters.topic !== "all");
  const topicLabel = (value: string) => curated.has(`topicLabel.${value}`) ? curated(`topicLabel.${value}`) : value;
  const previewCurator = shown.find(curator => curator.slug === previewSlug);

  const queryFor = (patch: Partial<CuratorExploreFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const query = new URLSearchParams();
    if (next.search) query.set("search", next.search);
    for (const key of ["media", "kind", "topic"] as const) if (next[key] !== "all") query.set(key, next[key]);
    if (next.sort !== "name") query.set("sort", next.sort);
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
  const conditions = [
    ...(filters.kind !== "all" ? [{ key: "kind" as const, label: curated(`kind.${filters.kind}`) }] : []),
    ...(filters.topic !== "all" ? [{ key: "topic" as const, label: topicLabel(filters.topic) }] : []),
  ];

  return (
    <div>
      <div className={EXPLORE_PANEL_CLASS}>
          <nav aria-label={t("media")} className="flex min-h-11 items-stretch gap-1 border-b border-white/10 pb-2">
            {allSummary.medias.map(media => <Link key={media} href={`${pathname}${queryFor({ media, kind: "all", topic: "all" })}`} prefetch={false}
              aria-current={filters.media === media ? "page" : undefined} onClick={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault(); update({ media, kind: "all", topic: "all" });
              }} className={`flex min-h-9 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-md px-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent ${filters.media === media ? "bg-accent/10 text-accent hover:bg-accent/20" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}>
              {t.has(`mediaShort.${media}`) ? t(`mediaShort.${media}`) : curated(`mediaLabel.${media}`)}
            </Link>)}
          </nav>
        <ExploreSearchControls controlColumns={2} value={search} placeholder={t("searchPlaceholder")} searchLabel={ui("searchButton")}
          clearLabel={ui("compactFilters.remove", { label: search })} onChange={setDraft}
          onSubmit={() => update({ search: search.trim() })} onClear={() => update({ search: "" })}>

          <button type="button" onClick={() => setDialog("sort")} aria-haspopup="dialog" aria-label={`${ui("filterSort")}: ${t(`sort.${filters.sort}`)}`} className={EXPLORE_CONTROL_CLASS}>
            <ArrowDownWideNarrow size={15} className="hidden shrink-0 sm:block" aria-hidden /><span className="truncate leading-5">{t(`sort.${filters.sort}`)}</span>
          </button>
          <button type="button" onClick={() => setDialog("detail")} aria-haspopup="dialog" className={EXPLORE_CONTROL_CLASS}>
            <SlidersHorizontal size={15} aria-hidden /><span>{ui("compactFilters.open")}</span>{detailCount > 0 && <span className="text-xs tabular-nums text-accent">{detailCount}</span>}
          </button>
        </ExploreSearchControls>
        {conditions.length > 0 && <div className="flex flex-wrap gap-2">{conditions.map(condition => (
          <button key={condition.key} type="button" onClick={() => update({ [condition.key]: "all" })} aria-label={ui("compactFilters.remove", { label: condition.label })}
            className="flex min-h-9 items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-text-secondary hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {condition.label}<X size={12} aria-hidden />
          </button>
        ))}</div>}
      </div>
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 md:mb-4">
          <h3 className="text-sm font-semibold text-text-primary">{t("institutionHeading")}</h3>
          <p role="status" className="text-xs tabular-nums text-text-secondary">{t("institutionResults", { count: shown.length, lists: shown.reduce((n, c) => n + c.lists.length, 0) })}</p>
        </div>
        {shown.length ? <div className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {shown.slice((page - 1) * CURATOR_PAGE_SIZE, page * CURATOR_PAGE_SIZE).map(curator => <CuratorLogoCard key={curator.slug} curator={curator} query={cardQuery.size ? `?${cardQuery}` : ""} onSelect={() => setPreviewSlug(curator.slug)} />)}
        </div> : <div className="space-y-3 py-12 text-center">
          <p className="text-sm text-text-secondary">{t("noResults")}</p>
          <button type="button" className={`${EXPLORE_CONTROL_CLASS} mx-auto`} onClick={() => update({ search: "", kind: "all", topic: "all", sort: "name" })}>{t("resetFilters")}</button>
        </div>}
      </div>
      <div className="mt-8"><Pagination presentation="quiet" currentPage={page} totalPages={totalPages}
        getPageHref={next => `${pathname}${queryFor({ page: next })}`} onPageChange={next => update({ page: next })} /></div>
      {dialog === "sort" && <FilterModal isOpen title={ui("filterSort")} current={filters.sort} options={CURATOR_SORTS.map(value => ({ value, label: t(`sort.${value}`) }))}
        onChange={sort => update({ sort: sort as CuratorExploreFilters["sort"] })} onClose={() => setDialog(null)} />}
      {dialog === "detail" && <CuratorFiltersModal kind={filters.kind} topic={filters.topic} kinds={summary.kinds} topics={summary.topics}
        onChange={(key, value) => update({ [key]: value })} onClose={() => setDialog(null)} />}
      {previewCurator && <CuratorPreviewModal curator={previewCurator} query={cardQuery.size ? `?${cardQuery}` : ""} onClose={() => setPreviewSlug(null)} />}
    </div>
  );
}
