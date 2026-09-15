/*
  파일명: /components/features/library/BookChartGrid.tsx
  기능: 서재 베스트셀러 차트
  책임: 서점 차트(한국어 YES24 일별 종합·영어 Apple Books 유료 전자책)를 서비스 공통 상품 목록(AffiliateBookList)으로 그린다.
        차트 항목은 우리 작품이 아니라 표지·YES24 단추는 서점 제휴 주소(없으면 상품 주소)를 열고,
        작품 상세 대신 「책 정보」 단추가 YES24 상품 상세를 받아 모달(Yes24BookModal)로 띄운다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
import type { BestsellerItem } from "@/actions/library/types";
import AffiliateBookList from "@/components/shared/AffiliateBookList";
import Yes24BookModal from "./Yes24BookModal";

export default function BookChartGrid({ items }: { items: BestsellerItem[] }) {
  const t = useTranslations("library.popular");
  const locale = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);

  const books: AffiliateBook[] = items.flatMap((item) => item.source_url
    ? [{
      contentId: item.id,
      title: item.title,
      creator: item.creator || undefined,
      thumbnail: item.thumbnail_url ?? undefined,
      // 쿠팡 판매 주소가 없는 서점 차트다 — 비워 두어야 쿠팡 단추가 서지 않는다
      url: "",
      rank: item.rank,
      purchaseHref: item.purchase_url ?? item.source_url,
    }]
    : []);
  const openItem = openId ? items.find((item) => item.id === openId) : undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <AffiliateBookList
        books={books}
        heading={t("chartTitle")}
        buyLabel={t("viewAtStore")}
        detailLabel={t("detail.open")}
        platform={locale === "en" ? "amazon" : "coupang"}
        rankLabel={(rank) => t("rank", { rank })}
        onDetail={(book) => setOpenId(book.contentId)}
        hideHeading
      />
      {openItem && <Yes24BookModal key={openItem.id} item={openItem} onClose={() => setOpenId(null)} />}
    </div>
  );
}
