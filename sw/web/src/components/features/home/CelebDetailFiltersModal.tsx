"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import { CELEB_TIERS } from "@feelandnote/shared/constants/celeb-tiers";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";
import { BirthYearSliderCore } from "./CelebBirthYearFilter";
import type { useCelebFilters, CelebRealityFilter } from "./useCelebFilters";

export type DetailFilter = "profession" | "nationality" | "contentType" | "gender" | "tier" | "birthYear" | "reality";
const DETAIL_FILTERS: { value: DetailFilter; label: string }[] = [
  { value: "profession", label: "filterProfession" },
  { value: "nationality", label: "filterNationality" },
  { value: "contentType", label: "filterContent" },
  { value: "gender", label: "filterGender" },
  { value: "tier", label: "filterTier" },
  { value: "birthYear", label: "filterBirthYear" },
  { value: "reality", label: "filterReality" },
];
const REALITY_OPTIONS: CelebRealityFilter[] = ["all", "real", "fiction"];

interface Props {
  filters: ReturnType<typeof useCelebFilters>;
  onClose: () => void;
  onInteraction?: () => void;
  /** 칩이 자기 차원을 곧바로 열게 한다 */
  initial?: DetailFilter;
}

export default function CelebDetailFiltersModal({ filters, onClose, onInteraction, initial }: Props) {
  const t = useTranslations("home.ui");
  const tExplore = useTranslations("explore.ui");
  const getProfession = useProfessionLabel();
  const getNationality = useNationalityLabel();
  const getContentType = useContentTypeLabel();
  const getGender = useGenderLabel();
  const [active, setActive] = useState<DetailFilter>(initial ?? "profession");
  const [countrySearch, setCountrySearch] = useState("");

  // 수록·사실·가상은 차원 카운트가 없다 — 선택지만 내린다
  const choices: Record<Exclude<DetailFilter, "birthYear">, { value: string; label: string; count?: number }[]> = {
    profession: CELEB_PROFESSION_FILTERS.map(({ value }) => ({ value, label: getProfession(value), count: filters.professionCounts[value] })),
    nationality: filters.nationalityCounts.map(({ value, count }) => ({ value, label: getNationality(value), count })),
    contentType: CONTENT_TYPE_FILTERS.map(({ value }) => ({ value, label: getContentType(value), count: filters.contentTypeCounts[value] })),
    gender: filters.genderCounts.map(({ value, count }) => ({ value, label: getGender(value), count })),
    tier: [{ value: "all", label: t("tier.all") }, ...CELEB_TIERS.map((v) => ({ value: v, label: t(`tier.${v}`) }))],
    reality: REALITY_OPTIONS.map((v) => ({ value: v, label: t(`reality.${v}`) })),
  };
  const handlers: Record<Exclude<DetailFilter, "birthYear">, (value: string) => void> = {
    profession: filters.handleProfessionChange,
    nationality: filters.handleNationalityChange,
    contentType: filters.handleContentTypeChange,
    gender: filters.handleGenderChange,
    tier: filters.handleTierValueChange,
    reality: (value) => filters.handleRealityChange(value as CelebRealityFilter),
  };
  const currentValue: Record<Exclude<DetailFilter, "birthYear">, string> = {
    profession: filters.profession,
    nationality: filters.nationality,
    contentType: filters.contentType,
    gender: filters.gender,
    tier: filters.tierValue,
    reality: filters.realityValue,
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
    return (
      <button key={option.value} type="button" aria-pressed={selected}
        disabled={filters.isLoading || (hasCounts && option.count === 0)}
        onClick={() => { onInteraction?.(); handlers[active](option.value); }}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35 ${selected ? "bg-accent/10 text-accent hover:bg-accent/20" : "text-text-primary hover:bg-white/5"}`}>
        <span className="flex-1">{option.label}</span>
        {hasCounts && option.count !== undefined && <span className="text-xs tabular-nums text-text-secondary">{option.count}</span>}
        {selected && <Check size={15} aria-hidden />}
      </button>
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={t("compactFilters.open")} titleClassName="text-center" size="lg" animateHeight={false}>
      <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
        {DETAIL_FILTERS.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={active === value} onClick={() => setActive(value)}
            className={`min-h-11 min-w-0 flex-1 whitespace-nowrap rounded-md border px-2.5 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${active === value ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20" : "border-transparent text-text-secondary hover:border-white/20 hover:bg-white/5 hover:text-text-primary"}`}>
            {t(label)}
          </button>
        ))}
      </div>
      <div className="min-h-64">
        {active === "birthYear" ? (
          <div className={filters.isLoading ? "pointer-events-none opacity-60" : ""} aria-busy={filters.isLoading}>
            <BirthYearSliderCore min={filters.birthYearMin} max={filters.birthYearMax} onChange={(min, max) => { onInteraction?.(); filters.handleBirthYearChange(min, max); }} />
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
      <div className="border-t border-white/10 p-3">
        <button type="button" onClick={onClose} className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-accent/30 bg-accent/10 text-sm font-medium text-accent hover:border-accent/60 hover:bg-accent/20 outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {t("compactFilters.results")} <span className="tabular-nums">{filters.total.toLocaleString()}</span>
        </button>
      </div>
    </Modal>
  );
}
