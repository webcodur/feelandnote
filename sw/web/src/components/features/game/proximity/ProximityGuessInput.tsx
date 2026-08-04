'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ProximityCeleb } from './types';

interface Props {
  celebs: ProximityCeleb[];
  guessedIds: Set<string>;
  onSelect: (celeb: ProximityCeleb) => void;
  disabled: boolean;
}

export default function ProximityGuessInput({ celebs, guessedIds, onSelect, disabled }: Props) {
  const t = useTranslations('gameProximity');
  const [query, setQuery] = useState('');
  const [focusIndex, setFocusIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return celebs
      .filter((c) => !guessedIds.has(c.id))
      .filter((c) =>
        c.nickname.toLowerCase().includes(q) ||
        (c.nickname_en?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 8);
  }, [celebs, guessedIds, query]);

  const handleSelect = useCallback((celeb: ProximityCeleb) => {
    onSelect(celeb);
    setQuery('');
    setFocusIndex(-1);
    setOpen(false);
    inputRef.current?.focus();
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusIndex >= 0 && focusIndex < filtered.length) {
      e.preventDefault();
      handleSelect(filtered[focusIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setFocusIndex(-1);
    }
  }, [filtered, focusIndex, handleSelect, open]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setFocusIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // 약간 지연해 클릭 이벤트가 먼저 발동하게
            setTimeout(() => setOpen(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          role="combobox"
          aria-expanded={open && filtered.length > 0}
          aria-controls="proximity-suggestions"
          aria-autocomplete="list"
          className="w-full rounded-xl border border-white/15 bg-bg-main/80 py-3 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {open && filtered.length > 0 && (
        <ul
          id="proximity-suggestions"
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/15 bg-bg-main/95 py-1 shadow-xl backdrop-blur-sm"
        >
          {filtered.map((celeb, idx) => (
            <li
              key={celeb.id}
              role="option"
              aria-selected={idx === focusIndex}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                idx === focusIndex
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-primary hover:bg-white/5'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(celeb);
              }}
            >
              {celeb.avatar_url ? (
                <Image
                  src={celeb.avatar_url}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] text-text-secondary">
                  {celeb.nickname.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{celeb.nickname}</p>
                {celeb.nickname_en && (
                  <p className="truncate text-[10px] text-text-secondary">{celeb.nickname_en}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
