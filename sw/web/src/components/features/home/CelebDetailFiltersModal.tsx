"use client";

import { useProfessions } from "@feelandnote/shared/hooks/use-professions";
import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import CountryFlag from "@/components/ui/CountryFlag";
import { getCountryFlagCode } from "@/lib/utils/countryFlag";

import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";
import { BirthYearSliderCore } from "./CelebBirthYearFilter";
import type { useCelebFilters, CelebRealityFilter } from "./useCelebFilters";
import { useCelebDetailConditions, type DetailFilter } from "./useCelebDetailConditions";
import { useCelebDetailDraft } from "./useCelebDetailDraft";
import { useVisitorCountry } from "@/hooks/useVisitorCountry";
import { countryFirst } from "@/lib/visitorCountry";
import { CELEB_FILTER_SELECTION_LIMITS, filterSelection } from "@/constants/celebFilterSelection";

export type { DetailFilter } from "./useCelebDetailConditions";
const DETAIL_FILTERS: { value: DetailFilter; label: string }[] = [
  { value: "profession", label: "filterProfession" },
  { value: "nationality", label: "filterNationality" },
  { value: "contentType", label: "filterContent" },
  { value: "gender", label: "filterGender" },
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
  const a11y = useTranslations("shared.accessibility");
  const getProfession = useProfessionLabel();
  const getNationality = useNationalityLabel();
  const getContentType = useContentTypeLabel();
  const getGender = useGenderLabel();
  const [active, setActive] = useState<DetailFilter>(initial ?? "profession");
  const [countrySearch, setCountrySearch] = useState("");
  const draftFilters = useCelebDetailDraft(filters);
  const conditions = useCelebDetailConditions(draftFilters);
  const visitorCountry = useVisitorCountry();

  const choices: Record<Exclude<DetailFilter, "birthYear">, { value: string; label: string }[]> = {
    profession: CELEB_PROFESSION_FILTERS.map(({ value }) => ({ value, label: getProfession(value) })),
    nationality: ["all", "none", ...countryFirst([...new Set([...draftFilters.nationalityOptions, ...filterSelection(draftFilters.nationality)])].filter(value => value !== "all" && value !== "none")
      .sort((a, b) => getNationality(a).localeCompare(getNationality(b))), visitorCountry, value => value)].map(value => ({ value, label: getNationality(value) })),
    contentType: CONTENT_TYPE_FILTERS.map(({ value }) => ({ value, label: getContentType(value) })),
    gender: ["all", "male", "female"].map(value => ({ value, label: getGender(value) })),
    reality: REALITY_OPTIONS.map((v) => ({ value: v, label: t(`reality.${v}`) })),
  };
  const handlers: Record<Exclude<DetailFilter, "birthYear">, (value: string) => void> = {
    profession: draftFilters.toggleProfession,
    nationality: draftFilters.toggleNationality,
    contentType: draftFilters.handleContentTypeChange,
    gender: draftFilters.handleGenderChange,
    reality: (value) => draftFilters.handleRealityChange(value as CelebRealityFilter),
  };
  const currentValue: Record<Exclude<DetailFilter, "birthYear">, string> = {
    profession: draftFilters.profession,
    nationality: draftFilters.nationality,
    contentType: draftFilters.contentType,
    gender: draftFilters.gender,
    reality: draftFilters.realityValue,
  };
  const options = active === "birthYear" ? [] : choices[active];
  const multiple = active === "profession" || active === "nationality";
  const visibleOptions = active === "nationality" && countrySearch.trim()
    ? options.filter(option => option.value === "all" || option.label.toLowerCase().includes(countrySearch.trim().toLowerCase()) || option.value.toLowerCase().includes(countrySearch.trim().toLowerCase()))
    : options;
  const allOption = visibleOptions.find(option => option.value === "all");
  const remainingOptions = visibleOptions.filter(option => option.value !== "all");

  const renderOption = (option: { value: string; label: string }) => {
    if (active === "birthYear") return null;
    const selectedValues = filterSelection(currentValue[active]);
    const selected = multiple ? (option.value === "all" ? selectedValues.length === 0 : selectedValues.includes(option.value)) : currentValue[active] === option.value;
    const condition = conditions.find(condition => condition.key === active);
    const select = !multiple && selected && condition ? condition.clear : () => handlers[active](option.value);
    const optionButton = (
      <button key={option.value} type="button" role={multiple ? "checkbox" : undefined} aria-checked={multiple ? selected : undefined} aria-pressed={multiple ? undefined : selected}
        disabled={draftFilters.isLoading || (multiple && !selected && option.value !== "all" && selectedValues.length >= CELEB_FILTER_SELECTION_LIMITS.items)}
        onClick={select}
        className={`flex min-h-11 min-w-0 w-full items-center gap-2 rounded-control border px-2.5 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35 ${selected ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20" : `${multiple ? "border-line" : "border-transparent"} text-text-primary hover:border-line-strong hover:bg-white/5`}`}>
        {multiple && <span className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${selected ? "border-accent bg-accent text-bg-main" : "border-white/30"}`} aria-hidden>{selected && <Check size={12} />}</span>}
        <span className="min-w-0 flex-1">
          <span className="block break-words">{option.label}</span>
          {active === "reality" && option.value === "mixed" && <span className="mt-1 block text-xs leading-5 text-text-secondary">{t("reality.mixedDescription")}</span>}
        </span>
      </button>
    );
    const flagCode = active === "nationality" ? getCountryFlagCode(option.value) : null;
    if (!flagCode) return optionButton;
    return <div key={option.value} className="flex min-w-0 items-center gap-1">
      <CountryFlag code={flagCode} className="text-sm" />
      <div className="min-w-0 flex-1">{optionButton}</div>
    </div>;
  };

  const footer = (
    <>
      <div className="space-y-2 border-t border-white/10 p-3" role="group" aria-label={t("compactFilters.selected")}>
        <p className="text-xs font-medium text-text-secondary">
          {t("compactFilters.selected")} <span className="tabular-nums text-accent">{conditions.length}</span>
        </p>
        {conditions.length === 0 && <p className="text-xs text-text-tertiary">{t("compactFilters.empty")}</p>}
        {conditions.length > 0 && (
          <div className="flex max-h-[16dvh] flex-wrap gap-2 overflow-y-auto overscroll-contain">
            {conditions.map(condition => (
              <button key={`${condition.key}:${condition.value ?? ""}`} type="button" disabled={draftFilters.isLoading}
                onClick={() => { condition.clear(); }}
                aria-label={t("compactFilters.remove", { label: condition.label })}
                className="flex min-h-11 max-w-full items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-2 text-start text-xs text-accent hover:border-accent/60 hover:bg-accent/20 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50">
                <span className="min-w-0 break-words">{condition.label}</span><X size={13} className="shrink-0" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-white/10 p-3">
        <button type="button" disabled={draftFilters.isLoading} onClick={() => { if (draftFilters.hasChanges) onInteraction?.(); draftFilters.apply(); onClose(); }} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-accent/30 bg-accent/10 text-sm font-medium text-accent hover:border-accent/60 hover:bg-accent/20 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50">
          {t("compactFilters.apply")}
        </button>
        <button type="button" onClick={onClose} aria-label={a11y("close")} className="flex size-11 shrink-0 items-center justify-center rounded-control border border-line text-text-secondary hover:border-line-strong hover:bg-white/5 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={18} aria-hidden /></button>
      </div>
    </>
  );

  return (
    <Modal isOpen onClose={onClose} ariaLabel={t("compactFilters.open")} showCloseButton={false} size="lg" animateHeight={false} scrollAreaClassName="overflow-y-hidden! [scrollbar-gutter:auto]" footer={footer}>
      {/* 현재 여는 축은 면으로, 사용 중인 축은 아래 금색 선으로 구분한다. */}
      <div className="flex shrink-0 flex-wrap gap-2 border-b border-white/10 bg-bg-card p-3">
        {DETAIL_FILTERS.map(({ value, label }) => {
          const condition = conditions.find(condition => condition.key === value);
          return (
            <button key={value} type="button" aria-label={conditions.filter(item => item.key === value).map(item => item.label).join(", ") || t(label)} aria-pressed={active === value} onClick={() => setActive(value)}
              className={`relative flex min-h-11 min-w-0 grow basis-[calc(33.333%-_0.4rem)] items-center justify-center whitespace-nowrap rounded-control border px-1 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:px-1.5 ${active === value ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20" : condition ? "border-accent/30 text-accent hover:border-accent/60 hover:bg-accent/10" : "border-white/15 text-text-secondary hover:border-white/35 hover:bg-white/5 hover:text-text-primary"}`}>
              <span>{t(label)}</span>
              {condition && <span className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div key={active} className="h-80 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
        {active === "birthYear" ? (
          <div className={draftFilters.isLoading ? "pointer-events-none opacity-60" : ""} aria-busy={draftFilters.isLoading}>
            <BirthYearSliderCore min={draftFilters.birthYearMin} max={draftFilters.birthYearMax} onChange={(min, max) => { draftFilters.handleBirthYearChange(min, max); }} />
          </div>
        ) : (
          <>
            {multiple && <p className="px-3 pt-3 text-xs text-text-secondary">{t("compactFilters.multiple")}</p>}
            {!multiple && allOption && <div className="px-3 pt-3">{renderOption(allOption)}</div>}
            {active === "nationality" && (
              <div className="relative mx-3 mt-2">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input value={countrySearch} onChange={event => setCountrySearch(event.target.value)} placeholder={tExplore("searchFilter")} aria-label={tExplore("searchFilter")}
                  className="h-9 w-full rounded-md border border-white/15 bg-white/5 pl-9 pr-3 text-sm outline-none focus-visible:border-accent" />
              </div>
            )}
            <div className={multiple ? "grid grid-cols-2 items-start gap-2 p-3" : "space-y-1 p-3"}>{(multiple ? visibleOptions : remainingOptions).map(renderOption)}</div>
          </>
        )}
      </div>
    </Modal>
  );
}
