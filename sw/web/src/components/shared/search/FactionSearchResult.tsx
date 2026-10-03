"use client";

import { Castle, BookOpen, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FactionSearchResult as Result } from "@/actions/search/searchFactions";

export default function FactionSearchResult({ result, selected = false, onNavigate }: {
  result: Result;
  selected?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shared.search");
  const Icon = result.isMyth ? BookOpen : Castle;
  return (
    <Link
      href={result.href}
      prefetch={false}
      onClick={onNavigate}
      className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        selected ? "border-accent/40 bg-accent/10" : "border-line bg-bg-card hover:border-accent/40 hover:bg-accent/5"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text-primary">{result.title}</span>
          <span className="shrink-0 text-xs text-text-secondary">{t(result.isMyth ? "kindMyth" : "kindFaction")}</span>
        </span>
        {result.subtitle && <span className="block truncate text-xs text-text-secondary">{result.subtitle}</span>}
      </span>
      <ArrowUpRight size={16} className="shrink-0 text-text-secondary" aria-hidden="true" />
    </Link>
  );
}
