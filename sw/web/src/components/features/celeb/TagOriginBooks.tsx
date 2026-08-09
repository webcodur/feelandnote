"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import AffiliateBookList from "@/components/features/home/AffiliateBookList";
import { getAffiliateBooksForTag, type FactionBooks } from "@/actions/home/getAffiliateBooks";

interface TagOriginBooksProps {
  tagId: string;
  tagName: string;
  /**
   * topic — 그 진영이 다루는 분야의 책. 진영 소개 화면에 둔다.
   * people — 그 인물들이 쓴 책이나 읽은 책. 서재 화면에 둔다(거기가 읽은 것을 보는 자리다).
   */
  variant: "topic" | "people";
}

/**
 * 진영에 어울리는 책을 낸다. 어느 묶음을 낼지는 놓이는 자리가 정한다.
 *
 * 분야의 책은 신화 진영이면 인물들이 나오는 원전이, 나머지는 분야 낱말로 찾은 책이 온다
 * (디지털 레지스탕스에 해커·감시 관련 책). 진영을 바꾸면 다시 불러오며,
 * 불러온 결과에 진영을 함께 담아 두어 바꾸는 순간 이전 진영의 책이 남지 않게 한다.
 */
export default function TagOriginBooks({ tagId, tagName, variant }: TagOriginBooksProps) {
  const locale = useLocale();
  const t = useTranslations("popularBooks");
  const [loaded, setLoaded] = useState<(FactionBooks & { tagId: string }) | null>(null);

  useEffect(() => {
    if (locale !== "ko" || !tagId) return;
    let alive = true;
    getAffiliateBooksForTag(tagId, tagName, "coupang", 6)
      .then((result) => {
        if (alive) setLoaded({ ...result, tagId });
      })
      .catch((e) => {
        console.error("[TagOriginBooks] 진영 도서 조회 실패:", e);
        if (alive) setLoaded({ topic: [], people: [], peopleSource: "read", tagId });
      });
    return () => {
      alive = false;
    };
  }, [tagId, tagName, locale]);

  if (!loaded || loaded.tagId !== tagId) return null;

  if (variant === "topic") {
    return (
      <AffiliateBookList
        books={loaded.topic}
        heading={t("headingFactionTopic")}
        buyLabel={t("buyOnCoupang")}
        detailLabel={t("viewBookDetails")}
      />
    );
  }

  return (
    <AffiliateBookList
      books={loaded.people}
      heading={loaded.peopleSource === "about" ? t("headingFactionAbout") : t("headingFactionRead")}
      buyLabel={t("buyOnCoupang")}
      detailLabel={t("viewBookDetails")}
    />
  );
}
