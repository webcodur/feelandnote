"use client";

import { useTranslations } from "next-intl";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";
import { BIRTH_YEAR_MIN, BIRTH_YEAR_MAX } from "@/lib/celeb/birthYearScale";
import type { useCelebFilters } from "./useCelebFilters";
import { filterSelection, serializeFilterSelection } from "@/constants/celebFilterSelection";

export type DetailFilter = "profession" | "nationality" | "contentType" | "gender" | "birthYear" | "reality";

/** 목록과 필터 창에서 같은 선택 조건·해제 동작을 사용한다. */
export function useCelebDetailConditions(filters: ReturnType<typeof useCelebFilters>) {
  const t = useTranslations("home.ui");
  const year = useTranslations("home.ui.birthYear");
  const getProfession = useProfessionLabel();
  const getNationality = useNationalityLabel();
  const getContentType = useContentTypeLabel();
  const getGender = useGenderLabel();
  const conditions: { key: DetailFilter; value?: string; label: string; clear: () => void }[] = [];

  const professions = filterSelection(filters.profession);
  const nationalities = filterSelection(filters.nationality);
  for (const value of professions) conditions.push({ key: "profession", value, label: `${t("filterProfession")}: ${getProfession(value)}`, clear: () => filters.handleProfessionChange(serializeFilterSelection(professions.filter(item => item !== value))) });
  for (const value of nationalities) conditions.push({ key: "nationality", value, label: `${t("filterNationality")}: ${getNationality(value)}`, clear: () => filters.handleNationalityChange(serializeFilterSelection(nationalities.filter(item => item !== value))) });
  if (filters.contentType !== "all") conditions.push({ key: "contentType", label: `${t("filterContent")}: ${getContentType(filters.contentType)}`, clear: () => filters.handleContentTypeChange("all") });
  if (filters.gender !== "all") conditions.push({ key: "gender", label: `${t("filterGender")}: ${getGender(filters.gender)}`, clear: () => filters.handleGenderChange("all") });
  if (filters.birthYearMin !== undefined || filters.birthYearMax !== undefined) {
    const formatYear = (value: number) => value < 0 ? year("bc", { year: -value }) : String(value);
    const label = filters.birthYearMin === undefined ? year("toYear", { year: formatYear(filters.birthYearMax!) })
      : filters.birthYearMax === undefined ? year("fromYear", { year: formatYear(filters.birthYearMin) })
      : year("range", { min: formatYear(filters.birthYearMin ?? BIRTH_YEAR_MIN), max: formatYear(filters.birthYearMax ?? BIRTH_YEAR_MAX) });
    conditions.push({ key: "birthYear", label: `${t("filterBirthYear")}: ${label}`, clear: () => filters.handleBirthYearChange(undefined, undefined) });
  }
  // 기본 실존·복합도 실제 제외 조건이다. 표시하고, 해제하면 전체로 넓힌다.
  if (filters.realityValue !== "all") conditions.push({ key: "reality", label: `${t("filterReality")}: ${t(`reality.${filters.realityValue}`)}`, clear: () => filters.handleRealityChange("all") });

  return conditions;
}
