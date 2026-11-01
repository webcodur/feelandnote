"use client";

import { History, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useContentTypeLabel, useGenderLabel, useNationalityLabel, useProfessionLabel } from "@/hooks/useFilterLabels";
import type { useCelebFilters } from "./useCelebFilters";

export default function RecentExploreFilters({ filters, onInteraction }: {
  filters: ReturnType<typeof useCelebFilters>;
  onInteraction?: () => void;
}) {
  const t = useTranslations("home.ui");
  const year = useTranslations("home.ui.birthYear");
  const profession = useProfessionLabel();
  const nationality = useNationalityLabel();
  const contentType = useContentTypeLabel();
  const gender = useGenderLabel();
  if (!filters.recentFilters.length) return null;

  const label = (entry: string) => {
    const saved = new URLSearchParams(entry);
    const value = (key: string) => saved.get(key)!;
    if (saved.has("profession")) return `${t("filterProfession")}: ${profession(value("profession"))}`;
    if (saved.has("nationality")) return `${t("filterNationality")}: ${nationality(value("nationality"))}`;
    if (saved.has("contentType")) return `${t("filterContent")}: ${contentType(value("contentType"))}`;
    if (saved.has("contentPresence")) return t(`compactFilters.reviews.${value("contentPresence")}`);
    if (saved.has("gender")) return `${t("filterGender")}: ${gender(value("gender"))}`;
    if (saved.has("reality")) {
      const values = value("reality").split(",");
      const reality = values.length === 1 && values[0] === "BOTH" ? "mixed"
        : values.includes("REAL") && values.includes("FICTION") ? "all" : values.includes("FICTION") ? "fiction" : "real";
      return `${t("filterReality")}: ${t(`reality.${reality}`)}`;
    }
    if (saved.has("byMin") || saved.has("byMax")) {
      const format = (value: number) => value < 0 ? year("bc", { year: -value }) : String(value);
      const label = !saved.has("byMin") ? year("toYear", { year: format(Number(value("byMax"))) })
        : !saved.has("byMax") ? year("fromYear", { year: format(Number(value("byMin"))) })
        : year("range", { min: format(Number(value("byMin"))), max: format(Number(value("byMax"))) });
      return `${t("filterBirthYear")}: ${label}`;
    }
    return "";
  };

  return (
    <div className="space-y-2" role="group" aria-label={t("recentFilters.title")}>
      <p className="flex items-center justify-center gap-1.5 text-xs text-text-tertiary"><History size={13} aria-hidden />{t("recentFilters.title")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {filters.recentFilters.map(entry => {
          const description = label(entry);
          const current = filters.currentFilterEntries.includes(entry);
          return (
            <div key={entry} className={`flex max-w-full min-w-0 items-stretch rounded-control border text-xs ${current ? "border-accent/35 bg-accent/5 text-accent" : "border-line text-text-secondary"}`}>
              <button type="button" disabled={filters.isLoading} aria-pressed={current} title={description}
                aria-label={t("recentFilters.apply", { label: description })}
                onClick={() => { onInteraction?.(); filters.handleRecentFilterApply(entry); }}
                className="min-h-9 min-w-0 rounded-s-control px-3 py-2 text-left hover:bg-accent/10 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
                <span className="line-clamp-2 break-words">{description}</span>
              </button>
              <button type="button" aria-label={t("recentFilters.remove", { label: description })}
                onClick={() => filters.removeRecentFilter(entry)}
                className="flex min-w-9 shrink-0 items-center justify-center rounded-e-control border-s border-line px-2 hover:bg-accent/10 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <X size={12} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
