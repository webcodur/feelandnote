"use client";

import { useTranslations, useLocale } from "next-intl";
import { useMemo } from "react";

export function useProfessionLabel() {
  const t = useTranslations("profession");
  return (value: string) => t.has(value) ? t(value) : value;
}

export function useContentTypeLabel() {
  const t = useTranslations("content.category");
  return (value: string) => {
    const key = value === "all" ? "all" : value.toLowerCase();
    return t.has(key) ? t(key) : value;
  };
}

export function useNationalityLabel() {
  const locale = useLocale();
  const t = useTranslations("home.ui");
  const displayNames = useMemo(
    () => typeof Intl !== "undefined" ? new Intl.DisplayNames([locale], { type: "region" }) : null,
    [locale]
  );
  return (value: string) => {
    if (value === "all") return t("all");
    if (value === "none") return t("nationalityNone");
    try { return displayNames?.of(value) ?? value; } catch { return value; }
  };
}

export function useGenderLabel() {
  const t = useTranslations("home.ui");
  const GENDER_KEYS: Record<string, string> = { all: "all", male: "genderMale", female: "genderFemale" };
  return (value: string) => GENDER_KEYS[value] ? t(GENDER_KEYS[value]) : value;
}
