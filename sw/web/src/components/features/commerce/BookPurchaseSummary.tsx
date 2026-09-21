/* ─────────────────────────────────────────────
 * [공통] 통합 구매 모듈 — 바깥 구매 단추 + 구매 창
 * - 바깥: 골드 채우기 「구매하기」 단추 하나. 서점 표시는 두지 않는다
 *   (구매 링크가 없고 판매 정보만 있으면 예전 「평점 | 가격」 값표로 떨어진다)
 * - 누르면 서점별 구매 단추(서점 색)와 수수료·주의 안내를 담은 창(BookPurchaseModal)이 뜬다
 * - 예전 [YES24 판매정보] + [쿠팡|YES24 링크] + [주의사항 ⓘ] 세 모듈의 자리를 이 한 모듈이 받는다
 * - 데이터: useYes24Sales(한국어), links prop(쿠팡·교보·알라딘·아마존 등 보유 링크), getBookPurchaseHref(YES24 경유)
 * ───────────────────────────────────────────── */
"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import { AFFILIATE_PLATFORMS, purchaseButtonStyle, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { getEnglishBookPurchaseLinks } from "@/lib/books/amazonBookSearch";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
import { coupangBookLink, kyoboBookLink, LINKPRICE_COUPANG_APPROVED } from "@/lib/books/bookPurchaseRedirect";
import { isYes24PurchaseRequest } from "@/lib/books/yes24Purchase";
import { cn } from "@/lib/utils";
import { useYes24Sales } from "./useYes24Sales";

/* 값표는 목록 카드마다 붙는다. 창은 누를 때만 불러와 초기 번들을 늘리지 않는다 */
const BookPurchaseModal = dynamic(() => import("./BookPurchaseModal"), { ssr: false });

interface BookPurchaseSummaryProps {
  /** 우리 작품 — YES24 경유 주소와 판매 정보를 얻는다 */
  contentId?: string;
  /** 고른 판본. 없으면 한국어 기본 판본으로 잡는다 */
  editionId?: number;
  /** 외부 차트 항목처럼 우리 작품이 아닐 때 — ISBN으로 곧바로 조회한다 */
  isbn?: string;
  /** 아마존 검색 링크를 세울 책 이름·저자 */
  title?: string | null;
  creator?: string | null;
  /** 보유 서점 링크 — 쿠팡·아마존·교보·알라딘 등. 언어가 다른 링크는 걸러낸다 */
  links?: readonly AffiliateLink[];
  /** 우리 작품이 아닌 외부 항목의 YES24 직통 주소(제휴 주소 우선) */
  yes24Href?: string;
  /** 켜기 조건 — 도서 판매대에서만 true로 넘긴다 */
  enabled?: boolean;
  /** 카드 위에 붙을 때는 버튼 폭을 칸에 맞춰 늘린다 */
  full?: boolean;
  className?: string;
  /** 단추에 덧붙일 클래스 — 자리마다 정렬·여백을 맞춘다 */
  chipClassName?: string;
}

function isPurchaseUrl(url: string) {
  // 서점 주소는 외부 http(s), 우리 구매 경유 주소(/api/books/purchase)는 슬래시 시작이다
  return url.startsWith("https://") || url.startsWith("http://") || url.startsWith("/");
}

export default function BookPurchaseSummary({
  contentId,
  editionId,
  isbn,
  title,
  creator,
  links: existingLinks = [],
  yes24Href,
  enabled = true,
  full = false,
  className,
  chipClassName,
}: BookPurchaseSummaryProps) {
  const locale = useLocale();
  const t = useTranslations("content.purchaseSales");
  const tBuy = useTranslations("content.purchase");
  const [isOpen, setIsOpen] = useState(false);

  const sales = useYes24Sales({
    contentId,
    editionId,
    isbn,
    active: enabled && locale === "ko",
  });

  /* 구매 링크 — 한국어는 YES24 경유 주소를 맨 앞에 두고 교보문고·보유 서점을 잇는다.
     영어는 아마존(상품 주소가 없으면 검색)이 기준이다 */
  const links = useMemo<AffiliateLink[]>(() => {
    if (!enabled) return [];
    const usable = existingLinks.filter(
      (link, index, all) =>
        AFFILIATE_PLATFORMS[link.platform]?.locale === locale &&
        isPurchaseUrl(link.url) &&
        // 같은 서점이 겹쳐 실리면(판본 링크+작품 링크) 앞의 것만 남긴다
        all.findIndex((other) => other.platform === link.platform) === index,
    );
    if (locale === "ko") {
      // 경유 주소는 우리 작품(UUID)만 만든다 — 차트 항목의 yes24-… 같은 외부 id는 경유가 못 푼다
      const ownId = contentId && isYes24PurchaseRequest(contentId, "ko", editionId) ? contentId : undefined;
      const yes24 = yes24Href
        ? { platform: "yes24" as const, url: yes24Href }
        : ownId
          ? { platform: "yes24" as const, url: getBookPurchaseHref(ownId, editionId, "yes24") }
          : usable.find((link) => link.platform === "yes24");
      const kyobo = usable.find((link) => link.platform === "kyobo")
        ?? (ownId
          ? { platform: "kyobo" as const, url: getBookPurchaseHref(ownId, editionId, "kyobo") }
          : kyoboBookLink({ isbn, title, creator }));
      // 쿠팡 — 링크프라이스 승인 전까지 만들지 않는다. 승인되면 우리 작품은 경유, 차트 항목은 ISBN 검색으로 잇는다
      const coupang = usable.find((link) => link.platform === "coupang")
        ?? (LINKPRICE_COUPANG_APPROVED
          ? ownId
            ? { platform: "coupang" as const, url: getBookPurchaseHref(ownId, editionId, "coupang") }
            : coupangBookLink({ isbn, title, creator })
          : null);
      return [
        ...(yes24 ? [yes24] : []),
        ...(kyobo ? [kyobo] : []),
        ...(coupang ? [coupang] : []),
        ...usable.filter((link) => link.platform !== "yes24" && link.platform !== "kyobo" && link.platform !== "coupang"),
      ];
    }
    return getEnglishBookPurchaseLinks({ locale, title, creator, links: usable });
  }, [enabled, existingLinks, locale, yes24Href, contentId, editionId, isbn, title, creator]);

  const number = new Intl.NumberFormat(locale);
  const onSale = Boolean(sales?.onSale);
  const hasRating = onSale && Boolean(sales?.starScore);
  const hasPrice = onSale && sales?.salePrice != null;
  const showSales = Boolean(sales) && (!onSale || hasRating || hasPrice);

  // 살 수 있는 서점도 판매 정보도 없으면 빈 칸이다. 링크만 있어도 구매 문구로 칩을 세운다.
  const showChip = enabled && (showSales || links.length > 0);
  // 영어는 서점 하나(아마존)뿐이라 창을 거치지 않고 서점 주소로 바로 보낸다 — 고지는 영어 화면 푸터가 싣는다
  const directLink = locale === "en" && !sales && links.length === 1 ? links[0] : null;

  return (
    <AnimatedHeight independent duration={320} className={className}>
      {showChip && directLink && (
        <a
          href={directLink.url}
          target="_blank"
          rel={directLink.platform === "amazon" ? "noopener noreferrer nofollow sponsored" : "noopener noreferrer"}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "relative flex items-center justify-center whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold sm:px-3 sm:py-1.5 sm:text-sm focus-visible:outline-none focus-visible:ring-2",
            purchaseButtonStyle(directLink.platform),
            full ? "w-full" : "mx-auto w-fit max-w-full",
            chipClassName,
          )}
        >
          {AFFILIATE_PLATFORMS[directLink.platform].label}
          <ArrowUpRight size={13} className="absolute right-1.5 top-1/2 -translate-y-1/2" aria-hidden />
        </a>
      )}
      {showChip && !directLink && (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={(event) => {
            // 카드·펼침 안에 붙는 값표다 — 누름이 바깥 링크·카드 토글로 번지지 않게 막는다
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(true);
          }}
          className={cn(
            links.length > 0
              ? // 골드 CTA — 금속 그라데이션+광휘. 어느 서점 색과도 겹치지 않는다
                "effect-bevel shadow-glow flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-md border border-accent-dim/60 bg-[linear-gradient(180deg,var(--color-accent-hover)_0%,var(--color-accent)_55%,var(--color-accent-dim)_150%)] px-3 py-1.5 text-xs font-bold text-bg-main sm:text-sm hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover"
              : "relative flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-accent-dim/40 bg-bg-secondary/60 px-2 py-1 text-xs text-text-tertiary sm:gap-2.5 sm:px-3 sm:py-1.5 sm:text-sm hover:border-accent/70 hover:bg-accent/10 active:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            full ? "w-full" : "mx-auto w-fit max-w-full",
            chipClassName,
          )}
        >
          {links.length > 0 ? (
            <>
              {tBuy("buy")}
              <ArrowUpRight size={13} className="shrink-0 drop-shadow-sm" aria-hidden />
            </>
          ) : showSales ? (
            onSale ? (
              <span className="inline-flex items-center gap-1.5 sm:gap-2.5">
                {hasRating && (
                  <span className="inline-flex items-center gap-1">
                    <Star size={13} className="fill-current text-accent" aria-hidden />
                    <strong className="font-bold tabular-nums text-text-primary">{sales!.starScore}</strong>
                  </span>
                )}
                {hasRating && hasPrice && <span className="text-white/20" aria-hidden>|</span>}
                {hasPrice && (
                  <strong className="font-bold tabular-nums text-text-primary">
                    {t("price", { price: number.format(sales!.salePrice!) })}
                  </strong>
                )}
              </span>
            ) : (
              <strong className="font-semibold text-text-primary">{t("changed")}</strong>
            )
          ) : null}
        </button>
      )}
      {isOpen && (
        <BookPurchaseModal sales={sales} links={links} onClose={() => setIsOpen(false)} />
      )}
    </AnimatedHeight>
  );
}
