/*
  파일명: /components/features/library/curated/CuratedListGrid.tsx
  기능: 선정 목록의 상자 격자 (클라이언트)
  책임: 작품마다 감싸는 상자를 두고 그 안에 서비스 공통 작품 카드와 구매 버튼을 위아래로 쌓는다.
        상자 높이는 줄마다 맞추고 버튼은 바닥에 붙여 줄이 흔들리지 않게 한다. 구매 링크가 없어도 자리를 지킨다.
        아직 등록되지 않은 작품도 같은 상자로 그린다 — 100선은 100편이어야 한다.
        데스크톱(기본 내보내기)은 처음 120편만 그리고 나머지는 단추로 펼친다 — 카드 전량을 한 번에 그리면 화면이 늦게 뜬다.
        모바일 격자 보기(CuratedListMobile)는 같은 상자(CuratedTileGrid)를 2열로, 한 구간씩 쓴다.
*/ // ------------------------------
"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, Film } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { CuratedListDetail, CuratedListItem } from "@/actions/library/types";
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import ContentCard from "@/components/ui/cards/ContentCard";
import GenerativeBookCover from "@/components/ui/cards/ContentCard/sections/GenerativeBookCover";
import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/types/database";

import { PURCHASE_PENDING_TONE_CLASS } from "./CuratedListExpand";

/** 처음 그리는 작품 수. 세인트존스(323)처럼 큰 목록만 잘린다 — 카드 전량을 그리면 화면 하나가 3MB에 이른다 */
const INITIAL_CARDS = 120;

/** 발표 연도 표시. 표지 오른쪽 위 모서리에 얹는다 */
function CornerBadge({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-black/75 px-1.5 py-0.5 text-[11px] text-white">{children}</span>;
}

function CoverCard({
  item,
  notRegisteredLabel,
  isVideo,
}: {
  item: CuratedListItem;
  notRegisteredLabel: string;
  isVideo: boolean;
}) {
  const yearBadge = item.year != null ? <CornerBadge>{item.year}</CornerBadge> : undefined;

  // 아직 우리에게 없는 작품 — 상세로 이을 곳이 없어 누르지 못한다.
  // 공통 카드와 같은 헤더·포스터 비율·푸터로 그려 줄이 어긋나지 않게 하고, "없음" 표기는 포스터 안에만 둔다.
  if (!item.contentId) {
    const ContentIcon = isVideo ? Film : BookOpen;
    return (
      <div
        aria-disabled="true"
        className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-bg-card"
      >
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#141414] px-1.5 py-1">
          <div className="flex h-6 w-6 items-center justify-center">
            <ContentIcon size={13} className="text-accent/80" strokeWidth={1.8} />
          </div>
          <div className="flex-1" />
          <div className="h-6 w-6" />
        </div>
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg-secondary">
          <GenerativeBookCover title={item.rawTitle} ContentIcon={ContentIcon} iconSize={28} label={notRegisteredLabel} />
          {yearBadge && <div className="absolute right-1.5 top-1.5 z-10">{yearBadge}</div>}
        </div>
        <div className="border-t border-white/[0.04] bg-black/20 text-center">
          <div className="flex min-h-[36px] items-center justify-center p-2 pb-1.5 md:min-h-[42px] md:p-2.5">
            <h3 className="line-clamp-2 text-center text-xs font-semibold leading-tight text-text-primary md:text-sm">
              {item.rawTitle}
            </h3>
          </div>
          <div className="h-px bg-white/10" />
          <div className="p-1.5 pt-1.5 md:p-2">
            <p className="line-clamp-1 text-center text-[10px] text-text-secondary md:text-xs">
              {item.rawCreator ?? " "}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 우리가 가진 작품은 서비스 공통 작품 카드로 그린다 — 판 전환·감상한 사람 수·소개 모달을 그대로 받는다.
  return (
    <ContentCard
      contentId={item.contentId}
      contentType={(item.contentType ?? undefined) as ContentType | undefined}
      title={item.title}
      titleBadge={item.titleBadge}
      creator={item.creator}
      thumbnail={item.thumbnailUrl}
      href={`/content/${item.contentId}?category=${getCategoryByDbType(item.contentType ?? "BOOK")?.id || "book"}`}
      titleKo={item.titleKo}
      titleEn={item.titleEn}
      creatorEn={item.creatorEn}
      thumbnailEn={item.thumbnailEn}
      hasEnEdition={item.hasEnEdition}
      overlayTopRight={yearBadge}
    />
  );
}

interface CuratedTileGridProps {
  list: CuratedListDetail;
  /** 그릴 작품. 데스크톱은 앞 120편, 모바일 격자는 지금 구간이다 */
  items: CuratedListItem[];
  columnsClassName: string;
  /** 격자와 파트너스 고지문 사이에 끼우는 것(더 보기 단추 등) */
  children?: ReactNode;
}

/** 감싸는 상자 격자 — 데스크톱 전량 격자와 모바일 구간 격자가 같은 상자를 쓴다 */
export function CuratedTileGrid({ list, items, columnsClassName, children }: CuratedTileGridProps) {
  const t = useTranslations("library.curated");
  const locale = useLocale();
  /* 한국어판 구매 버튼. 링크가 없어도 자리는 지킨다 */
  const showPurchase = locale === "ko" && list.contentType === "BOOK";
  const isVideo = list.contentType === "VIDEO";

  return (
    <>
      <div className={cn("grid gap-3", columnsClassName)}>
        {items.map((item) => (
          // 감싸는 상자 — 줄의 가장 큰 상자에 높이를 맞추고(격자 stretch) 모듈은 바닥에 붙인다
          <div
            key={item.id}
            className="flex h-full flex-col rounded-xl border border-white/[0.08] bg-black/25 p-1.5"
          >
            <CoverCard item={item} notRegisteredLabel={t("notRegistered")} isVideo={isVideo} />
            {showPurchase && (
              <div className="mt-auto pt-1.5">
                {item.contentId ? (
                  <AffiliateBookAction contentId={item.contentId} coupangUrl={item.coupangUrl} compact showNotice />
                ) : (
                  <div
                    aria-disabled="true"
                    className={cn(
                      "flex min-h-11 w-full items-center justify-center rounded-md border px-2 text-[11px] font-semibold",
                      PURCHASE_PENDING_TONE_CLASS,
                    )}
                  >
                    {t("purchasePending")}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {children}
    </>
  );
}

/** 데스크톱 격자 — 전량을 5~6열로 편다. 큰 목록은 120편에서 끊고 단추로 마저 편다 */
export default function CuratedListGrid({ list }: { list: CuratedListDetail }) {
  const t = useTranslations("library.curated");
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? list.items : list.items.slice(0, INITIAL_CARDS);
  const remaining = list.items.length - items.length;

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5">
      <CuratedTileGrid list={list} items={items} columnsClassName="grid-cols-5 lg:grid-cols-6">
        {remaining > 0 && (
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-block rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] text-text-secondary hover:border-accent/40 hover:text-accent"
            >
              {t("showRemaining", { count: remaining })}
            </button>
          </div>
        )}
      </CuratedTileGrid>
    </section>
  );
}
