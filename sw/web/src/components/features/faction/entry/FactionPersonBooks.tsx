"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getCelebReferenceBooks, type CelebReferenceBooks } from "@/actions/celebs/getCelebReferenceBooks";
import { CELEB_REFERENCE_BOOK_MODES } from "@/lib/celeb/authoredBooks";
import FigureBookWorksSection from "@/app/[locale]/(main)/celeb/[slug]/FigureBookWorksSection";
import CelebReadBooks from "@/components/features/celeb/CelebReadBooks";
import CelebSectionSkeleton from "@/components/features/celeb/CelebSectionSkeleton";
import { RetryBlock } from "@/components/ui/pending";
import { FACTION_PERSON_LAYOUT as layout } from "./factionPersonLayout";

type BookMode = (typeof CELEB_REFERENCE_BOOK_MODES)[number]["key"];

// 신화와 일반 팩션은 인물 상세와 같은 자료·작품 선택기·감상 선반을 쓴다.
export default function FactionPersonBooks({ celebId }: { celebId: string }) {
  const t = useTranslations("celebPage");
  const locale = useLocale();
  const id = useId();
  const [data, setData] = useState<CelebReferenceBooks | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<BookMode | null>(null);

  useEffect(() => {
    let alive = true;
    getCelebReferenceBooks(celebId, locale)
      .then((result) => { if (alive) setData(result); })
      .catch((error) => {
        console.error("[FactionPersonBooks] 참고도서 조회 실패:", error);
        if (alive) setFailed(true);
      });
    return () => { alive = false; };
  }, [celebId, locale, attempt]);

  const modes = CELEB_REFERENCE_BOOK_MODES.filter(({ key }) => data && (
    key === "read" ? data.read.books.length > 0 : data[key].length > 0
  ));
  const active = modes.find(({ key }) => key === tab)?.key ?? modes[0]?.key;
  if (data && !modes.length) return null;

  return (
    <section className={layout.shelf} aria-labelledby={`${id}-heading`} data-person-books data-books-ready={Boolean(data)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 id={`${id}-heading`} className="text-lg font-bold text-text-primary">{t("relatedProducts")}</h3>
        {active && <div role="tablist" aria-label={t("relatedProducts")} className="inline-flex rounded-lg border border-white/15 bg-bg-secondary p-1">
          {modes.map(({ key, label }, index) => <button key={key} type="button" role="tab" id={`${id}-${key}`}
            aria-selected={active === key} aria-controls={`${id}-panel`} tabIndex={active === key ? 0 : -1} data-book-mode={key}
            onClick={() => setTab(key)} onKeyDown={(event) => {
              const direction = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: modes.length - 1 - index }[event.key];
              if (direction === undefined) return;
              event.preventDefault();
              const next = modes[(index + direction + modes.length) % modes.length].key;
              setTab(next);
              document.getElementById(`${id}-${next}`)?.focus();
            }}
            className={`min-h-10 rounded-md px-4 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent ${active === key ? "bg-accent/15 text-accent hover:bg-accent/25" : "text-text-secondary hover:bg-accent/10 hover:text-accent"}`}>
            {t(label)}
          </button>)}
        </div>}
      </div>
      {failed && <RetryBlock onRetry={() => { setFailed(false); setAttempt((value) => value + 1); }} />}
      {!failed && !data && <CelebSectionSkeleton kind="books" english={locale === "en"} />}
      {data && active && <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${active}`}>
        {active === "appeared" && <FigureBookWorksSection sources={data.appeared} intro={t("sourceWorksIntro")} />}
        {active === "read" && <CelebReadBooks userId={celebId} initialBooks={data.read.books} initialNextPage={data.read.nextPage} initialHasMore={data.read.hasMore} />}
        {active === "authored" && <FigureBookWorksSection sources={data.authored} intro={t("authoredWorksIntro")} />}
      </div>}
    </section>
  );
}
