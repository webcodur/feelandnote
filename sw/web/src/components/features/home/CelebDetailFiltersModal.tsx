"use client";

import { useProfessions } from "@feelandnote/shared/hooks/use-professions";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";

import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import { CELEB_TIERS } from "@feelandnote/shared/constants/celeb-tiers";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";
import { BirthYearSliderCore } from "./CelebBirthYearFilter";
import type { useCelebFilters, CelebRealityFilter } from "./useCelebFilters";
import { useCelebDetailConditions, type DetailFilter } from "./useCelebDetailConditions";
import { useCelebDetailDraft } from "./useCelebDetailDraft";
import { useVisitorCountry } from "@/hooks/useVisitorCountry";
import { countryFirst } from "@/lib/visitorCountry";

export type { DetailFilter } from "./useCelebDetailConditions";
const DETAIL_FILTERS: { value: DetailFilter; label: string }[] = [
  { value: "profession", label: "filterProfession" },
  { value: "nationality", label: "filterNationality" },
  { value: "contentType", label: "filterContent" },
  { value: "gender", label: "filterGender" },
  { value: "tier", label: "filterTier" },
  { value: "birthYear", label: "filterBirthYear" },
  { value: "reality", label: "filterReality" },
];
const REALITY_OPTIONS: CelebRealityFilter[] = ["all", "real", "fiction", "mixed"];

interface Props {
  filters: ReturnType<typeof useCelebFilters>;
  onClose: () => void;
  onInteraction?: () => void;
  /** 칩이 자기 차원을 곧바로 열게 한다 */
  initial?: DetailFilter;
}

export default function CelebDetailFiltersModal({ filters, onClose, onInteraction, initial }: Props) {
  const { filters: CELEB_PROFESSION_FILTERS } = useProfessions();
  const t = useTranslations("home.ui");
  const tExplore = useTranslations("explore.ui");
  const getProfession = useProfessionLabel();
  const getNationality = useNationalityLabel();
  const getContentType = useContentTypeLabel();
  const getGender = useGenderLabel();
  const [active, setActive] = useState<DetailFilter>(initial ?? "profession");
  const [countrySearch, setCountrySearch] = useState("");
  const draftFilters = useCelebDetailDraft(filters);
  const conditions = useCelebDetailConditions(draftFilters);
  const visitorCountry = useVisitorCountry();

  // 수록·실존 여부는 집계 없이 선택한다.
  const choices: Record<Exclude<DetailFilter, "birthYear">, { value: string; label: string; count?: number }[]> = {
    profession: CELEB_PROFESSION_FILTERS.map(({ value }) => ({ value, label: getProfession(value), count: draftFilters.professionCounts[value] })),
    nationality: countryFirst(draftFilters.nationalityCounts, visitorCountry, item => item.value).map(({ value, count }) => ({ value, label: getNationality(value), count })),
    contentType: CONTENT_TYPE_FILTERS.map(({ value }) => ({ value, label: getContentType(value), count: draftFilters.contentTypeCounts[value] })),
    gender: draftFilters.genderCounts.map(({ value, count }) => ({ value, label: getGender(value), count })),
    tier: [{ value: "all", label: t("tier.all") }, ...CELEB_TIERS.map((v) => ({ value: v, label: t(`tier.${v}`) }))],
    reality: REALITY_OPTIONS.map((v) => ({ value: v, label: t(`reality.${v}`) })),
  };
  const handlers: Record<Exclude<DetailFilter, "birthYear">, (value: string) => void> = {
    profession: draftFilters.handleProfessionChange,
    nationality: draftFilters.handleNationalityChange,
    contentType: draftFilters.handleContentTypeChange,
    gender: draftFilters.handleGenderChange,
    tier: draftFilters.handleTierValueChange,
    reality: (value) => draftFilters.handleRealityChange(value as CelebRealityFilter),
  };
  const currentValue: Record<Exclude<DetailFilter, "birthYear">, string> = {
    profession: draftFilters.profession,
    nationality: draftFilters.nationality,
    contentType: draftFilters.contentType,
    gender: draftFilters.gender,
    tier: draftFilters.tierValue,
    reality: draftFilters.realityValue,
  };
  const options = active === "birthYear" ? [] : choices[active];
  const hasCounts = options.some(option => (option.count ?? 0) > 0);
  const visibleOptions = active === "nationality" && countrySearch.trim()
    ? options.filter(option => option.value === "all" || option.label.toLowerCase().includes(countrySearch.trim().toLowerCase()) || option.value.toLowerCase().includes(countrySearch.trim().toLowerCase()))
    : options;
  const allOption = visibleOptions.find(option => option.value === "all");
  const remainingOptions = visibleOptions.filter(option => option.value !== "all");

  const renderOption = (option: { value: string; label: string; count?: number }) => {
    if (active === "birthYear") return null;
    const selected = currentValue[active] === option.value;
    const condition = conditions.find(condition => condition.key === active);
    const select = selected && condition ? condition.clear : () => handlers[active](option.value);
    return (
      <button key={option.value} type="button" aria-pressed={selected}
        disabled={draftFilters.isLoading || (!selected && option.value !== "all" && hasCounts && option.count === 0)}
        onClick={select}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35 ${selected ? "bg-accent/10 text-accent hover:bg-accent/20" : "text-text-primary hover:bg-white/5"}`}>
        <span className="flex-1">
          <span className="block">{option.label}</span>
          {active === "reality" && option.value === "mixed" && <span className="mt-1 block text-xs leading-5 text-text-secondary">{t("reality.mixedDescription")}</span>}
        </span>
        {hasCounts && option.count !== undefined && <span className="text-xs tabular-nums text-text-secondary">{option.count}</span>}
      </button>
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={t("compactFilters.open")} titleClassName="text-center" size="lg" animateHeightDuration={200}>
      {/* 좁은 화면은 세 칸씩, 넓은 화면은 네 칸씩 배치한다. */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
        {DETAIL_FILTERS.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={active === value} onClick={() => setActive(value)}
            className={`min-h-9 min-w-0 grow basis-[calc(33.333%-_0.4rem)] truncate whitespace-nowrap rounded-md border px-1 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:basis-[calc(25%-_0.4rem)] md:px-1.5 ${active === value ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20" : "border-white/15 text-text-secondary hover:border-white/35 hover:bg-white/5 hover:text-text-primary"}`}>
            {t(label)}
          </button>
        ))}
      </div>
      <div className="min-h-64">
        {active === "birthYear" ? (
          <div className={draftFilters.isLoading ? "pointer-events-none opacity-60" : ""} aria-busy={draftFilters.isLoading}>
            <BirthYearSliderCore min={draftFilters.birthYearMin} max={draftFilters.birthYearMax} onChange={(min, max) => { draftFilters.handleBirthYearChange(min, max); }} />
          </div>
        ) : (
          <>
            {allOption && <div className="px-3 pt-3">{renderOption(allOption)}</div>}
            {active === "nationality" && (
              <div className="relative mx-3 mt-2">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input value={countrySearch} onChange={event => setCountrySearch(event.target.value)} placeholder={tExplore("searchFilter")}
                  className="h-9 w-full rounded-md border border-white/15 bg-white/5 pl-9 pr-3 text-sm outline-none focus-visible:border-accent" />
              </div>
            )}
            <div className="max-h-[38vh] space-y-1 overflow-y-auto p-3">{remainingOptions.map(renderOption)}</div>
          </>
        )}
      </div>
      <div className="space-y-2 border-t border-white/10 p-3" role="group" aria-label={t("compactFilters.selected")}>
        <p className="text-xs font-medium text-text-secondary">
          {t("compactFilters.selected")} <span className="tabular-nums text-accent">{conditions.length}</span>
        </p>
        {conditions.length === 0 && <p className="text-xs text-text-tertiary">{t("compactFilters.empty")}</p>}
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {conditions.map(condition => (
              <button key={condition.key} type="button" disabled={draftFilters.isLoading}
                onClick={() => { condition.clear(); }}
                aria-label={t("compactFilters.remove", { label: condition.label })}
                className="flex min-h-11 max-w-full items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-2 text-start text-xs text-accent hover:border-accent/60 hover:bg-accent/20 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50">
                <span className="min-w-0 break-words">{condition.label}</span><X size={13} className="shrink-0" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-white/10 p-3">
        <button type="button" disabled={draftFilters.isLoading} onClick={() => { if (draftFilters.hasChanges) onInteraction?.(); draftFilters.apply(); onClose(); }} className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-accent/30 bg-accent/10 text-sm font-medium text-accent hover:border-accent/60 hover:bg-accent/20 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50">
          {t("compactFilters.apply")}
        </button>
      </div>
    </Modal>
  );
}
