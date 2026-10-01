"use client";

import { useState } from "react";
import type { useCelebFilters, CelebDetailFilterValues } from "./useCelebFilters";

/** 선택 중에는 조회·URL을 바꾸지 않고, 적용할 때만 실제 필터에 전달한다. */
export function useCelebDetailDraft(filters: ReturnType<typeof useCelebFilters>) {
  const [draft, setDraft] = useState<CelebDetailFilterValues>(() => ({
    profession: filters.profession, nationality: filters.nationality,
    contentType: filters.contentType, gender: filters.gender,
    tierValue: filters.tierValue, realityValue: filters.realityValue,
    birthYearMin: filters.birthYearMin, birthYearMax: filters.birthYearMax,
  }));
  const update = <K extends keyof CelebDetailFilterValues>(key: K, value: CelebDetailFilterValues[K]) => {
    setDraft(previous => ({ ...previous, [key]: value }));
  };
  const hasChanges = (Object.keys(draft) as (keyof CelebDetailFilterValues)[])
    .some(key => draft[key] !== filters[key]);

  return {
    ...filters,
    ...draft,
    handleProfessionChange: (value: string) => update("profession", value),
    handleNationalityChange: (value: string) => update("nationality", value),
    handleContentTypeChange: (value: string) => update("contentType", value),
    handleGenderChange: (value: string) => update("gender", value),
    handleTierValueChange: (value: string) => update("tierValue", value),
    handleRealityChange: (value: CelebDetailFilterValues["realityValue"]) => update("realityValue", value),
    handleBirthYearChange: (min: number | undefined, max: number | undefined) => {
      setDraft(previous => ({ ...previous, birthYearMin: min, birthYearMax: max }));
    },
    hasChanges,
    apply: () => { if (hasChanges) filters.handleDetailFiltersApply(draft); },
  };
}
