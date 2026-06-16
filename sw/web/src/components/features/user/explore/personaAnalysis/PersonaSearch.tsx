/*
  파일명: /components/features/user/explore/personaAnalysis/PersonaSearch.tsx
  기능: 성향 분석 인물 검색
  책임: 영향력과 무관하게 전체 인물에서 이름 매칭, 결과 선택 시 콜백.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { SEARCH_LIMIT, initials } from "./constants";
import type { PersonaPerson } from "@/actions/persona/getPersonaDistribution";

interface PersonaSearchProps {
  people: PersonaPerson[];
  onSelect: (person: PersonaPerson) => void;
}

export default function PersonaSearch({ people, onSelect }: PersonaSearchProps) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = q
    ? people
        .filter(
          (p) =>
            p.nickname.toLowerCase().includes(q) ||
            (p.nickname_en?.toLowerCase().includes(q) ?? false),
        )
        .slice(0, SEARCH_LIMIT)
    : [];

  const handleSelect = (person: PersonaPerson) => {
    onSelect(person);
    setQuery("");
  };

  return (
    <div className="relative mx-auto max-w-md">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="인물 검색"
        className="w-full rounded-full border border-border/50 bg-bg-card/40 py-2.5 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent/40 focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
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
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt={p.nickname} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[10px] font-bold text-text-secondary">
                      {initials(p.nickname)}
                    </div>
                  )}
                </div>
                <span className="flex-1 truncate text-sm font-semibold text-text-primary">{p.nickname}</span>
                <span className="shrink-0 text-xs tabular-nums text-text-secondary/60">영향력 {p.influence}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && matches.length === 0 && (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-border/50 bg-bg-card px-4 py-3 text-sm text-text-secondary shadow-2xl">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
}
