"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, AudioLines, Search } from "lucide-react";
import type { CelebBookShelf } from "@/actions/celebs/getCelebBookShelf";
import { getCelebVirtualMonologue } from "@/actions/celebs/getCelebVirtualMonologue";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import Modal, { ModalBody } from "@/components/ui/Modal";
import { loadMonologueDetail } from "./loadMonologueDetail";

const VoicedMonologueCard = dynamic(() => import("./VoicedMonologueCard"));
const PAGE_SIZE = 12;
/** 책장 콜드 조회가 서버 재시도까지 20초를 넘길 수 있다 — 한 번에 넉넉히, 실패 땐 한 번 더 읽는다 */
const SHELF_TIMEOUT_MS = 25_000;
const SHELF_ATTEMPTS = 2;

interface MonologueDetail {
  id: string;
  text: string;
  shelf: CelebBookShelf | null;
  shelfFailed: boolean;
}

export default function MonologueDeck({ items }: { items: VirtualMonologueCeleb[] }) {
  const t = useTranslations("explore.monologue");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<VirtualMonologueCeleb | null>(null);
  const [detail, setDetail] = useState<MonologueDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const requestId = useRef(0);
  const shelfAbort = useRef<AbortController | null>(null);

  const matched = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return q ? items.filter((celeb) => `${celeb.nickname} ${celeb.title ?? ""}`.toLocaleLowerCase().includes(q)) : items;
  }, [items, query]);
  const visible = matched.slice(0, visibleCount);

  const fetchShelf = useCallback(async (celeb: VirtualMonologueCeleb, currentRequest: number) => {
    const url = `/api/monologue-bookshelf?id=${encodeURIComponent(celeb.id)}&locale=${locale}`;
    let lastError: unknown = new Error("Bookshelf unavailable");
    for (let attempt = 0; attempt < SHELF_ATTEMPTS; attempt++) {
      if (currentRequest !== requestId.current) throw new Error("Selection changed");
      const attemptController = new AbortController();
      shelfAbort.current = attemptController;
      const timeout = window.setTimeout(() => attemptController.abort(), SHELF_TIMEOUT_MS);
      try {
        const response = await fetch(url, { cache: "no-store", signal: attemptController.signal });
        if (!response.ok) throw new Error(`Bookshelf HTTP ${response.status}`);
        return await response.json() as CelebBookShelf;
      } catch (error) {
        if (currentRequest !== requestId.current) throw error;
        lastError = error;
      } finally {
        window.clearTimeout(timeout);
      }
    }
    throw lastError;
  }, [locale]);

  const loadDetail = useCallback(async (celeb: VirtualMonologueCeleb) => {
    shelfAbort.current?.abort();
    const currentRequest = ++requestId.current;
    setDetail(null);
    setLoadFailed(false);
    try {
      // 본문은 음원 언어, 책장은 화면 언어의 판본으로 읽는다.
      await loadMonologueDetail(
        () => getCelebVirtualMonologue(celeb.id, celeb.voiceLocale),
        () => fetchShelf(celeb, currentRequest),
        (text) => {
          if (currentRequest === requestId.current) setDetail({ id: celeb.id, text, shelf: null, shelfFailed: false });
        },
        ({ shelf, error }) => {
          if (currentRequest !== requestId.current) return;
          if (error) console.error("[MonologueDeck] 책장 조회 실패:", error);
          setDetail((previous) => previous?.id === celeb.id ? { ...previous, shelf, shelfFailed: error !== null } : previous);
        },
      );
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      console.error("[MonologueDeck] 독백 열기 실패:", error);
      setLoadFailed(true);
    }
  }, [fetchShelf]);

  /** 책장만 다시 읽는다 — 본문·낭독은 그대로 둔다 */
  const retryShelf = useCallback(async (celeb: VirtualMonologueCeleb) => {
    const currentRequest = ++requestId.current;
    setDetail((previous) => previous?.id === celeb.id ? { ...previous, shelfFailed: false } : previous);
    try {
      const shelf = await fetchShelf(celeb, currentRequest);
      setDetail((previous) => previous?.id === celeb.id ? { ...previous, shelf } : previous);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      console.error("[MonologueDeck] 책장 재조회 실패:", error);
      setDetail((previous) => previous?.id === celeb.id ? { ...previous, shelfFailed: true } : previous);
    }
  }, [fetchShelf]);

  const closeDetail = useCallback(() => {
    requestId.current += 1;
    shelfAbort.current?.abort();
    setSelected(null);
    setDetail(null);
    setLoadFailed(false);
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-7">
        <div className="relative w-full max-w-sm">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="w-full rounded-xl border border-white/15 bg-white/[0.035] py-3 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-tertiary hover:border-accent/45 focus:border-accent focus:outline-none"
          />
        </div>
        <p className="text-xs tabular-nums text-text-tertiary" aria-live="polite">
          {t("showing", { shown: visible.length, total: matched.length })}
        </p>
      </div>

      {matched.length === 0 ? (
        <p className="rounded-xl border border-white/10 px-5 py-14 text-center text-sm text-text-secondary">{t("noResults")}</p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {visible.map((celeb) => (
              <li key={celeb.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => { setSelected(celeb); void loadDetail(celeb); }}
                  aria-label={t("openMonologue", { name: celeb.nickname })}
                  className="group relative flex h-full w-full min-h-72 flex-col overflow-hidden rounded-2xl border border-accent/20 bg-[linear-gradient(155deg,#1a1813_0%,#11110f_75%)] p-5 text-start shadow-[0_14px_32px_-20px_rgba(0,0,0,0.8)] hover:border-accent/65 hover:bg-[#1c1913] active:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:p-6"
                >
                  <span aria-hidden className="pointer-events-none absolute -right-2 -top-9 font-serif text-[9rem] leading-none text-accent/[0.07]">“</span>
                  <span className="relative flex items-center gap-3.5">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-full border border-accent/35 bg-black/35">
                      {celeb.avatar_url ? <CelebAvatarImage src={celeb.avatar_url} alt="" boxPx={56} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-lg font-bold text-text-primary group-hover:text-accent">{celeb.nickname}</span>
                      {celeb.title ? <span className="mt-0.5 block truncate text-xs text-text-secondary">{celeb.title}</span> : null}
                    </span>
                  </span>
                  <span className="relative mt-5 line-clamp-4 flex-1 break-keep font-serif text-sm leading-7 text-text-primary/80 md:text-[15px]">
                    {celeb.excerpt}
                  </span>
                  <span className="relative mt-5 flex w-full items-center justify-between border-t border-white/10 pt-4 text-xs font-semibold text-accent">
                    <span className="inline-flex items-center gap-2"><AudioLines size={16} aria-hidden />{t("listen")}</span>
                    <ArrowUpRight size={17} aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {visibleCount < matched.length ? (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="rounded-full border border-accent/45 px-6 py-2.5 text-sm font-semibold text-accent hover:border-accent hover:bg-accent/10 active:bg-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t("loadMore")}
              </button>
            </div>
          ) : null}
        </>
      )}

      <Modal
        isOpen={selected !== null}
        onClose={closeDetail}
        title={selected ? t("monologueTitle", { name: selected.nickname }) : t("voicedTitle")}
        titleClassName="font-serif font-bold text-accent"
        titleAction={selected ? (
          <Link
            href={`${getCelebProfileUrl(selected)}#reading`}
            prefetch={false}
            aria-label={t("openProfile")}
            title={t("openProfile")}
            className="flex shrink-0 items-center rounded-md p-1 text-accent/70 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowUpRight size={18} aria-hidden />
          </Link>
        ) : undefined}
        stickyHeader
        size="full"
        frame="plain"
        boxClassName="overflow-hidden rounded-2xl border border-accent/30 bg-[#11110f] shadow-2xl"
        animateHeight={false}
        maxHeightClassName="max-h-[calc(100dvh-2rem)]"
      >
        <ModalBody className="p-3 sm:p-5">
          {selected && detail?.id === selected.id ? (
            <VoicedMonologueCard celeb={selected} text={detail.text} shelf={detail.shelf} shelfFailed={detail.shelfFailed} onShelfRetry={() => void retryShelf(selected)} />
          ) : loadFailed ? (
            <div className="py-16 text-center">
              <p className="text-sm text-text-secondary">{t("loadFailed")}</p>
              <button type="button" onClick={() => selected && void loadDetail(selected)} className="mt-4 rounded-full border border-accent/50 px-5 py-2 text-sm text-accent hover:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {t("retry")}
              </button>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-text-secondary" role="status">{t("loading")}</p>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}
