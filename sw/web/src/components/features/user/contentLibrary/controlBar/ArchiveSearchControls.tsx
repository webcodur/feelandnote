"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface ArchiveSearchControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  hasAppliedSearch: boolean;
  compact: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function ArchiveSearchControls({
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
  hasAppliedSearch,
  compact,
  fullWidth = false,
  className,
}: ArchiveSearchControlsProps) {
  const t = useTranslations("archiveSearch");
  const trimmedQuery = searchQuery.trim();
  const canSearch = trimmedQuery.length >= 2 || (trimmedQuery.length === 0 && hasAppliedSearch);

  return (
    <div className={cn(
      "flex min-w-0 items-center gap-2",
      fullWidth || !compact ? "flex-1" : "w-[268px] shrink",
      className,
    )}>
      <div className="group/search relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-0 rounded-md bg-accent/5 opacity-0 blur-sm transition-opacity group-focus-within/search:opacity-100" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSearch) onSearch();
          }}
          placeholder={t("placeholder")}
          className="relative z-10 min-h-[2.5rem] w-full min-w-0 rounded-md border border-white/10 bg-black/40 ps-3 pe-9 font-sans text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent/40 focus:bg-black/60 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            aria-label={t("clearSearch")}
            className="absolute end-2 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary hover:bg-white/10 hover:text-text-primary"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onSearch}
        disabled={!canSearch}
        aria-label={t("search")}
        className="flex min-h-[2.5rem] w-[2.5rem] shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/10 text-accent hover:border-accent/60 hover:bg-accent/20 disabled:opacity-50"
      >
        <Search size={16} />
      </button>
    </div>
  );
}
