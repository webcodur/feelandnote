/* ─────────────────────────────────────────────
 * [celeb 상세] 책장 아래 감상한 책 표지 목록
 * - 책장은 한 권씩 펼친다. 나머지 책의 표지·제목을 원문에 싣는다(검색·이미지 검색이 읽는다)
 * - 누르면 책장이 그 책으로 넘어간다. 새 창으로 열면 작품 페이지다
 * - 첫 화면에는 앞의 일부만 싣고 나머지는 이어 붙인다(제목의 권수와 보이는 권수가 어긋나지 않게).
 *   단추는 참여 작품 목록(FilmographyList)과 같은 문법이다 — 「+N」(PC는 휴대폰의 두 배)과 「전체 보기」
 * - 함께 보기: ReviewsSection.tsx, CelebDataSections.tsx(표지 고르기)
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { CELEB_BOOK_COVER_LIMIT } from "@/actions/contents/getInitialCelebContents";

import { Link } from "@/i18n/navigation";
import ContentCover from "@/components/ui/ContentCover";
import { BREAKPOINT_MD } from "@/constants/breakpoints";

/** 표지는 서버가 화면 언어에 맞춰 고른다. */
export interface CelebBookCover { contentId: string; title: string; thumbnail: string | null }

/** 「+N」 한 번에 이어 붙이는 장 수(한 장 = 첫 화면과 같은 권수). PC는 한 줄에 두 배가 들어가 두 장씩 붙인다 */
const PAGES_PER_LOAD = { mobile: 1, desktop: 2 } as const;
const MORE_BUTTON_CLASS = "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line bg-bg-raised px-3 py-2 text-sm font-medium tabular-nums text-text-secondary hover:border-accent/60 hover:bg-accent/10 hover:text-accent active:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-70";

export default function CelebBookCovers({ userId, nickname, items: initialItems, total, onSelect }: {
  userId: string;
  nickname: string;
  items: readonly CelebBookCover[];
  total: number;
  onSelect: (contentId: string) => void;
}) {
  const t = useTranslations("celebPage.bookCovers");
  const locale = useLocale();
  const [items, setItems] = useState<readonly CelebBookCover[]>(initialItems);
  const [loadedPages, setLoadedPages] = useState(1);
  const [loading, setLoading] = useState<"more" | "all" | null>(null);
  const totalPages = Math.ceil(total / CELEB_BOOK_COVER_LIMIT);
  const remaining = Math.max(0, total - items.length);

  const nextCount = (pages: number) => Math.min(remaining, pages * CELEB_BOOK_COVER_LIMIT);

  const load = async (kind: "more" | "all") => {
    if (loading) return;
    setLoading(kind);
    try {
      const step = kind === "all" ? totalPages
        : PAGES_PER_LOAD[window.matchMedia(`(min-width: ${BREAKPOINT_MD}px)`).matches ? "desktop" : "mobile"];
      const pages = Array.from({ length: Math.min(step, totalPages - loadedPages) }, (_, i) => loadedPages + 1 + i);
      const results = await Promise.all(pages.map((page) =>
        getPublicUserContents({ userId, type: "BOOK", page, limit: CELEB_BOOK_COVER_LIMIT, sortBy: "recent" }, locale)));
      const seen = new Set(items.map((item) => item.contentId));
      const added: CelebBookCover[] = [];
      for (const result of results) for (const { content_id, content } of result.items) {
        if (seen.has(content_id)) continue;
        seen.add(content_id);
        added.push({ contentId: content_id, title: content.title,
          thumbnail: locale === "en" && content.thumbnail_en ? content.thumbnail_en : content.thumbnail_url });
      }
      setItems([...items, ...added]);
      setLoadedPages(loadedPages + pages.length);
    } catch {
      // 실패하면 단추가 그대로 남아 다시 누를 수 있다
    } finally {
      setLoading(null);
    }
  };

  return (
    <section aria-labelledby="celeb-book-covers-title" className="mt-8">
      <h3 id="celeb-book-covers-title" className="mb-4 text-center text-sm font-semibold text-text-secondary md:text-base">
        {t("title", { name: nickname, count: total })}
      </h3>
      <ul className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {items.map((item) => <li key={item.contentId} className="min-w-0">
          <Link
            href={`/content/${item.contentId}`}
            prefetch={false}
            title={t("open", { title: item.title })}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onSelect(item.contentId);
            }}
            className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="relative block aspect-[2/3] overflow-hidden rounded border border-white/10 bg-bg-secondary group-hover:border-accent group-active:opacity-80">
              <ContentCover src={item.thumbnail} alt={item.title} sizes="(min-width: 1024px) 96px, 22vw" />
            </span>
            <span className="mt-1.5 line-clamp-2 text-center text-xs leading-4 text-text-secondary group-hover:text-accent">
              {item.title}
            </span>
          </Link>
        </li>)}
      </ul>
      {remaining > 0 && loadedPages < totalPages && (
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={() => load("more")} disabled={loading !== null} aria-busy={loading === "more"} className={MORE_BUTTON_CLASS}>
            <span className="md:hidden">+{nextCount(PAGES_PER_LOAD.mobile)}</span>
            <span className="hidden md:inline">+{nextCount(PAGES_PER_LOAD.desktop)}</span>
            <span className="sr-only"> {t("loadMore")}</span>
            {loading === "more" && <Loader2 size={16} aria-hidden className="animate-spin" />}
          </button>
          <button type="button" onClick={() => load("all")} disabled={loading !== null} aria-busy={loading === "all"} className={MORE_BUTTON_CLASS}>
            {t("showAll")}
            {loading === "all" && <Loader2 size={16} aria-hidden className="animate-spin" />}
          </button>
        </div>
      )}
    </section>
  );
}
