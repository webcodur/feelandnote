"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getCelebReferenceBooks, type CelebReferenceBooks } from "@/actions/celebs/getCelebReferenceBooks";
import CelebBookShelf from "@/components/features/celeb/CelebBookShelf";
import CelebSectionSkeleton from "@/components/features/celeb/CelebSectionSkeleton";
import { RetryBlock } from "@/components/ui/pending";
import { FACTION_PERSON_LAYOUT as layout } from "./factionPersonLayout";

export default function FactionPersonBooks({ celebId }: { celebId: string }) {
  const t = useTranslations("celebPage");
  const locale = useLocale();
  const [data, setData] = useState<CelebReferenceBooks | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

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


  return (
    <section className={layout.shelf} data-person-books data-books-ready={Boolean(data)}>
      {failed && <RetryBlock onRetry={() => { setFailed(false); setAttempt(value => value + 1); }} />}
      {!failed && !data && <CelebSectionSkeleton kind="books" english={locale === "en"} />}
      {data && <CelebBookShelf key={celebId} celebId={celebId} {...data} title={t("relatedProducts")} />}
    </section>
  );
}
