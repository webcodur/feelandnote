/* ─────────────────────────────────────────────
 * [celeb 상세] 책장 아래 감상한 책 표지 목록
 * - 책장은 한 권씩 펼친다. 나머지 책의 표지·제목을 원문에 싣는다(검색·이미지 검색이 읽는다)
 * - 누르면 책장이 그 책으로 넘어간다. 새 창으로 열면 작품 페이지다
 * - 함께 보기: ReviewsSection.tsx, CelebDataSections.tsx(표지 고르기)
 * ───────────────────────────────────────────── */
"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import ContentCover from "@/components/ui/ContentCover";

/** 표지는 서버가 화면 언어에 맞춰 고른다. */
export interface CelebBookCover { contentId: string; title: string; thumbnail: string | null }

export default function CelebBookCovers({ nickname, items, total, onSelect }: {
  nickname: string;
  items: readonly CelebBookCover[];
  total: number;
  onSelect: (contentId: string) => void;
}) {
  const t = useTranslations("celebPage.bookCovers");
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
    </section>
  );
}
