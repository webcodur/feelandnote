/*
  파일명: /components/features/user/explore/spectrumAnalysis/SpectrumSearch.tsx
  기능: 성향 분석 인물 검색
  책임: 입력이 생겼을 때만 서버의 전체 인물 캐시를 검색하고, 결과 선택 시 콜백.
*/ // ------------------------------

"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import FadeAvatar from "./FadeAvatar";
import { searchSpectrumPeople, type SpectrumPerson } from "@/actions/spectrum/getSpectrumDistribution";
import { useLocale, useTranslations } from "next-intl";

interface SpectrumSearchProps {
  onSelect: (person: SpectrumPerson) => void;
}

export default function SpectrumSearch({ onSelect }: SpectrumSearchProps) {
  const locale = useLocale();
  const t = useTranslations("explore.ui.spectrumDistribution");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SpectrumPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  const q = query.trim();

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    const normalized = value.trim();
    const requestId = ++requestIdRef.current;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

    if (!normalized) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setMatches([]);
    setLoading(true);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      searchSpectrumPeople(normalized)
        .then((result) => {
          if (requestId === requestIdRef.current) setMatches(result);
        })
        .catch((error) => {
          console.error("[SpectrumSearch] 검색 실패:", error);
          if (requestId === requestIdRef.current) setMatches([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, 250);
  };

  const handleSelect = (person: SpectrumPerson) => {
    requestIdRef.current += 1;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    onSelect(person);
    setQuery("");
    setMatches([]);
    setLoading(false);
  };

  return (
    <div className="relative mx-auto max-w-md">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-busy={loading}
        className="w-full rounded-full border border-border/50 bg-bg-card/40 py-2.5 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent/40 focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => handleQueryChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/60 hover:text-text-primary"
        >
          <X size={16} />
        </button>
      )}

      {matches.length > 0 && (
        <ul className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-border/50 bg-bg-card shadow-2xl">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => handleSelect(p)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-bg-card-hover"
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-full border border-border/60 bg-bg-card">
                  <FadeAvatar src={p.avatar_url} name={p.nickname} />
                </div>
                <span className="flex-1 truncate text-sm font-semibold text-text-primary">{locale === "en" ? (p.nickname_en || p.nickname) : p.nickname}</span>
                <span className="shrink-0 text-xs tabular-nums text-text-secondary/60">{t("influence", { score: p.influence })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && !loading && matches.length === 0 && (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-border/50 bg-bg-card px-4 py-3 text-sm text-text-secondary shadow-2xl">
          {t("noResults")}
        </div>
      )}
    </div>
  );
}
