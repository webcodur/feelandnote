"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import AffiliateBookList from "@/components/features/home/AffiliateBookList";
import {
  getAffiliateBooksForTag,
  type AffiliateBook,
  type FactionBookSource,
} from "@/actions/home/getAffiliateBooks";

interface TagOriginBooksProps {
  tagId: string;
}

interface Loaded {
  tagId: string;
  books: AffiliateBook[];
  source: FactionBookSource;
}

const HEADING: Record<FactionBookSource, string> = {
  origin: "headingFactionOrigin",
  about: "headingFactionAbout",
  read: "headingFactionRead",
};

/**
 * 진영 화면 아래에 그 진영에 어울리는 책을 낸다.
 *
 * 진영을 바꾸면 다시 불러온다 — 아스가르드에는 에다가, 카멜롯에는 아서 왕의 죽음이,
 * 실존 인물 진영에는 그들이 쓴 책이 뜬다. 걸린 책이 없으면 아무것도 그리지 않는다.
 * 불러온 결과에 진영을 함께 담아 두어, 진영을 바꾸는 순간 이전 진영의 책이 남지 않게 한다.
 */
export default function TagOriginBooks({ tagId }: TagOriginBooksProps) {
  const locale = useLocale();
  const t = useTranslations("popularBooks");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (locale !== "ko" || !tagId) return;
    let alive = true;
    getAffiliateBooksForTag(tagId, "coupang", 6)
      .then((result) => {
        if (alive) setLoaded({ tagId, books: result.books, source: result.source });
      })
      .catch((e) => {
        console.error("[TagOriginBooks] 진영 도서 조회 실패:", e);
        if (alive) setLoaded({ tagId, books: [], source: "read" });
      });
    return () => {
      alive = false;
    };
  }, [tagId, locale]);

  if (!loaded || loaded.tagId !== tagId || loaded.books.length === 0) return null;

  return <AffiliateBookList books={loaded.books} heading={t(HEADING[loaded.source])} buyLabel={t("buyOnCoupang")} />;
}
