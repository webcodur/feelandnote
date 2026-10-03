"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { AudioLines } from "lucide-react";
import type { CelebBookShelf } from "@/actions/celebs/getCelebBookShelf";
import { getCelebVirtualMonologue, type MonologueProfile } from "@/actions/celebs/getCelebVirtualMonologue";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import { loadMonologueDetail } from "./loadMonologueDetail";
import MonologuePicker from "./MonologuePicker";
import MonologueIdentity from "./MonologueIdentity";
import type { MonologueBrowseOptions } from "./monologueBrowse";

const VoicedMonologueCard = dynamic(() => import("./VoicedMonologueCard"));
/** 책장 콜드 조회가 서버 재시도까지 20초를 넘길 수 있다 — 한 번에 넉넉히, 실패 땐 한 번 더 읽는다 */
const SHELF_TIMEOUT_MS = 25_000;
const SHELF_ATTEMPTS = 2;

interface MonologueDetail {
  id: string;
  text: string;
  profile: MonologueProfile;
  shelf: CelebBookShelf | null;
  shelfFailed: boolean;
}

export default function MonologueDeck({ items, browseOptions }: { items: VirtualMonologueCeleb[]; browseOptions: MonologueBrowseOptions }) {
  const t = useTranslations("explore.monologue");
  const locale = useLocale();
  const [selected, setSelected] = useState<VirtualMonologueCeleb | null>(null);
  const [detail, setDetail] = useState<MonologueDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const requestId = useRef(0);
  const shelfAbort = useRef<AbortController | null>(null);
  const playerRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => {
    requestId.current += 1;
    shelfAbort.current?.abort();
  }, []);

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
        () => getCelebVirtualMonologue(celeb.id, celeb.voiceLocale, locale),
        () => fetchShelf(celeb, currentRequest),
        (entry) => {
          if (currentRequest === requestId.current) {
            setDetail({ id: celeb.id, text: entry.text, profile: entry.profile, shelf: null, shelfFailed: false });
          }
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
  }, [fetchShelf, locale]);

  /** 책장만 다시 읽는다 — 본문·낭독은 그대로 둔다 */
  const retryShelf = useCallback(async (celeb: VirtualMonologueCeleb) => {
    shelfAbort.current?.abort();
    const currentRequest = ++requestId.current;
    setDetail((previous) => previous?.id === celeb.id ? { ...previous, shelfFailed: false } : previous);
    try {
      const shelf = await fetchShelf(celeb, currentRequest);
      if (currentRequest !== requestId.current) return;
      setDetail((previous) => previous?.id === celeb.id ? { ...previous, shelf } : previous);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      console.error("[MonologueDeck] 책장 재조회 실패:", error);
      setDetail((previous) => previous?.id === celeb.id ? { ...previous, shelfFailed: true } : previous);
    }
  }, [fetchShelf]);

  return (
    <div className="mx-auto max-w-6xl">
      <MonologuePicker items={items} options={browseOptions} selected={selected} onShowSelected={() => {
        playerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      }} onSelect={(celeb) => {
        if (selected?.id !== celeb.id) {
          setSelected(celeb);
          void loadDetail(celeb);
        }
        requestAnimationFrame(() => {
          const player = playerRef.current;
          if (player && player.getBoundingClientRect().top > window.innerHeight / 2) {
            player.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
          }
        });
      }} />

      <section ref={playerRef} id="monologue-player" aria-labelledby={selected ? "monologue-title" : undefined} className="mt-10 scroll-mt-24 border-t border-accent/25 pt-8 md:mt-12 md:pt-10">
        {selected ? (
          <>
            <MonologueIdentity celeb={selected} profile={detail?.id === selected.id ? detail.profile : null} />
            {detail?.id === selected.id ? (
              <VoicedMonologueCard key={`${selected.id}:${selected.voiceLocale}:${selected.voiceV}`} celeb={selected} text={detail.text} shelf={detail.shelf} shelfFailed={detail.shelfFailed} onShelfRetry={() => void retryShelf(selected)} />
            ) : loadFailed ? (
              <div className="py-16 text-center">
                <p className="text-sm text-text-secondary">{t("loadFailed")}</p>
                <button type="button" onClick={() => void loadDetail(selected)} className="mt-4 rounded-full border border-accent/50 px-5 py-2 text-sm text-accent hover:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  {t("retry")}
                </button>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-text-secondary" role="status">{t("loading")}</p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-text-tertiary">
            <AudioLines size={28} className="text-accent/60" aria-hidden />
            <p className="break-keep text-sm">{t("chooseFigure")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
