"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { Myth, MythWork } from "@/actions/home/mythTypes";
import { getFactionFigureBooks, type FactionFigureBook } from "@/actions/home/getFactionFigureBooks";
import { getThemeBookTextScope, isThemeBook } from "@/lib/figure-books/themeBooks";
import ThemeBookShelf from "@/components/features/faction/entry/ThemeBookShelf";
import DeveloperCommerceFallback from "@/components/features/commerce/DeveloperCommerceFallback";
import { RetryBlock } from "@/components/ui/pending";
import AtlasBookShelfSkeleton from "../myth/AtlasBookShelfSkeleton";
import type { AtlasWorld } from "../myth/atlasNavigationData";

interface Props {
  mode: AtlasWorld;
  theme: Myth;
  works: MythWork[];
  memberIds: string[];
  onCount: (count: number) => void;
}

/** 자료 취득 방식만 모드에 따라 다르며, 책장의 배치와 조작은 한 벌을 쓴다. */
export default function AtlasWorkShelf({ mode, theme, works, memberIds, onCount }: Props) {
  const locale = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  const [loaded, setLoaded] = useState<{ key: string; books: FactionFigureBook[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${theme.id}:${locale}`;

  useEffect(() => {
    if (mode !== "faction" || !root.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNearby(true); observer.disconnect(); }
    }, { rootMargin: "400px" });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    if (mode !== "faction" || !nearby) return;
    let alive = true;
    getFactionFigureBooks(theme.id, locale).then(books => {
      if (alive) { setLoaded({ key, books }); onCount(books.length); }
    }).catch(error => {
      console.error("[AtlasWorkShelf]", error);
      if (alive) setFailedKey(key);
    });
    return () => { alive = false; };
  }, [mode, nearby, theme.id, locale, key, attempt, onCount]);

  const books = useMemo(() => {
    if (mode === "faction") {
      if (loaded?.key !== key) return null;
      const ids = new Set(memberIds);
      return loaded.books.filter(book => book.memberIds.some(id => ids.has(id)) || isThemeBook(book, theme.name, false));
    }
    return works.filter(work => work.category === "book").map((work): FactionFigureBook => {
      const scope = getThemeBookTextScope(work.id, theme.slug);
      const volume = locale === "ko" && scope ? work.editions?.find(edition => edition.textScope === scope) : undefined;
      return {
        contentId: work.id, editionId: volume?.id ?? work.editionId,
        isTheme: work.themeIds?.includes(theme.id) ?? false,
        title: volume?.title ?? work.title, creator: (volume?.creator ?? work.creator) || undefined,
        thumbnail: (volume?.thumbnailUrl ?? work.thumbnailUrl) || undefined,
        url: volume?.coupangUrl ?? work.coupangUrl ?? "", titleBadge: work.titleBadge,
        memberIds: work.personIds, appearedIds: work.appearedIds, authoredIds: work.authorIds,
      };
    });
  }, [mode, loaded, key, memberIds, theme.id, theme.name, theme.slug, works, locale]);

  return (
    <div ref={root} data-atlas-bookshelf>
      {failedKey === key ? <RetryBlock onRetry={() => { setFailedKey(null); setAttempt(value => value + 1); }} />
        : books ? <ThemeBookShelf key={`${locale}:${memberIds.join(",")}`} books={books} memberIds={memberIds} name={theme.name} mode={mode} />
        : <AtlasBookShelfSkeleton />}
      {mode === "myth" && books?.every(book => !book.editionId && !book.url) && (
        <DeveloperCommerceFallback target={{ title: theme.name, type: "TOPIC" }} placement="myth-selection" />
      )}
    </div>
  );
}
