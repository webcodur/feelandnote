"use client";

import { Loader2, Search, User, X } from "lucide-react";

import CelebAvatarImage from "@/components/ui/CelebAvatarImage";

export interface RelationSearchHit {
  id: string;
  nickname: string;
  nickname_en?: string | null;
  avatar_url: string | null;
  title?: string | null;
}

interface RelationSearchProps {
  query: string;
  hits: RelationSearchHit[];
  searching: boolean;
  placeholder: string;
  clearLabel: string;
  nameOf: (celeb: RelationSearchHit) => string;
  onQueryChange: (value: string) => void;
  onSelect: (celebId: string) => void;
}

export default function RelationSearch({
  query,
  hits,
  searching,
  placeholder,
  clearLabel,
  nameOf,
  onQueryChange,
  onSelect,
}: RelationSearchProps) {
  return (
    <div className="relative mb-6">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-main px-3 py-2.5 focus-within:border-accent/50">
        <Search aria-hidden size={16} className="shrink-0 text-text-secondary" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/70"
        />
        {searching && <Loader2 aria-hidden size={15} className="shrink-0 animate-spin text-accent" />}
        {query && !searching && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label={clearLabel}
            className="shrink-0 text-text-secondary hover:text-text-primary"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {hits.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-main p-1 shadow-xl">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => onSelect(hit.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-accent/10"
              >
                <span className="relative block size-8 shrink-0 overflow-hidden rounded-full bg-card">
                  {hit.avatar_url ? (
                    <CelebAvatarImage
                      src={hit.avatar_url}
                      alt={nameOf(hit)}
                      boxPx={32}
                      className="size-full object-cover"
                    />
                  ) : (
                    <User
                      aria-hidden
                      size={14}
                      className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary">{nameOf(hit)}</span>
                  {hit.title && (
                    <span className="block truncate text-xs text-text-secondary">{hit.title}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
