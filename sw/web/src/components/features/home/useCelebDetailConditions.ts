"use client";

import { useTranslations } from "next-intl";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";
import { BIRTH_YEAR_MIN, BIRTH_YEAR_MAX } from "@/lib/celeb/birthYearScale";
import type { useCelebFilters } from "./useCelebFilters";

export type DetailFilter = "profession" | "nationality" | "contentType" | "gender" | "birthYear" | "reality";

/** 목록과 필터 창에서 같은 선택 조건·해제 동작을 사용한다. */
export function useCelebDetailConditions(filters: ReturnType<typeof useCelebFilters>) {
  const t = useTranslations("home.ui");
  const year = useTranslations("home.ui.birthYear");
  const getProfession = useProfessionLabel();
  const getNationality = useNationalityLabel();
  const getContentType = useContentTypeLabel();
  const getGender = useGenderLabel();
  const conditions: { key: DetailFilter; label: string; clear: () => void }[] = [];

  if (filters.profession !== "all") conditions.push({ key: "profession", label: `${t("filterProfession")}: ${getProfession(filters.profession)}`, clear: () => filters.handleProfessionChange("all") });
  if (filters.nationality !== "all") conditions.push({ key: "nationality", label: `${t("filterNationality")}: ${getNationality(filters.nationality)}`, clear: () => filters.handleNationalityChange("all") });
  if (filters.contentType !== "all") conditions.push({ key: "contentType", label: `${t("filterContent")}: ${getContentType(filters.contentType)}`, clear: () => filters.handleContentTypeChange("all") });
  if (filters.gender !== "all") conditions.push({ key: "gender", label: `${t("filterGender")}: ${getGender(filters.gender)}`, clear: () => filters.handleGenderChange("all") });
  if (filters.birthYearMin !== undefined || filters.birthYearMax !== undefined) {
    const formatYear = (value: number) => value < 0 ? year("bc", { year: -value }) : String(value);
    conditions.push({ key: "birthYear", label: `${t("filterBirthYear")}: ${year("range", { min: formatYear(filters.birthYearMin ?? BIRTH_YEAR_MIN), max: formatYear(filters.birthYearMax ?? BIRTH_YEAR_MAX) })}`, clear: () => filters.handleBirthYearChange(undefined, undefined) });
  }
  // 사실은 명부 기본값이다. 해제하면 같은 기본값으로 돌아간다.
  if (filters.realityValue !== "real") conditions.push({ key: "reality", label: `${t("filterReality")}: ${t(`reality.${filters.realityValue}`)}`, clear: () => filters.handleRealityChange("real") });

  return conditions;
}
