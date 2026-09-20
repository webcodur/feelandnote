/* ─────────────────────────────────────────────
 * [공통] 통합 구매 모듈 — 바깥 값표 + 구매 창
 * - 바깥: 「평점 | 가격」 값표 단추 하나. 서점 표시는 두지 않는다
 * - 누르면 서점별 구매 단추(서점 색)와 수수료·주의 안내를 담은 창(BookPurchaseModal)이 뜬다
 * - 예전 [YES24 판매정보] + [쿠팡|YES24 링크] + [주의사항 ⓘ] 세 모듈의 자리를 이 한 모듈이 받는다
 * - 데이터: useYes24Sales(한국어), links prop(쿠팡·교보·알라딘·아마존 등 보유 링크), getBookPurchaseHref(YES24 경유)
 * ───────────────────────────────────────────── */
"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import { AFFILIATE_PLATFORMS, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { getEnglishBookPurchaseLinks } from "@/lib/books/amazonBookSearch";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
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
  const tInfo = useTranslations("content.purchaseInfo");
  const [isOpen, setIsOpen] = useState(false);

  const sales = useYes24Sales({
    contentId,
    editionId,
    isbn,
    active: enabled && locale === "ko",
  });

  /* 구매 링크 — 한국어는 YES24 경유 주소를 맨 앞에 두고 보유 서점을 잇는다.
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
      const yes24 = yes24Href
        ? { platform: "yes24" as const, url: yes24Href }
        : contentId
          ? { platform: "yes24" as const, url: getBookPurchaseHref(contentId, editionId, "yes24") }
          : usable.find((link) => link.platform === "yes24");
      return [
        ...(yes24 ? [yes24] : []),
        ...usable.filter((link) => link.platform !== "yes24"),
      ];
    }
    return getEnglishBookPurchaseLinks({ locale, title, creator, links: usable });
  }, [enabled, existingLinks, locale, yes24Href, contentId, editionId, title, creator]);

  const number = new Intl.NumberFormat(locale);
  const onSale = Boolean(sales?.onSale);
  const hasRating = onSale && Boolean(sales?.starScore);
  const hasPrice = onSale && sales?.salePrice != null;
  const showSales = Boolean(sales) && (!onSale || hasRating || hasPrice);

  // 살 수 있는 서점도 판매 정보도 없으면 빈 칸이다. 링크만 있어도 구매 문구로 칩을 세운다.
  const showChip = enabled && (showSales || links.length > 0);

  return (
    <AnimatedHeight independent duration={320} className={className}>
      {showChip && (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={tInfo("trigger")}
          title={tInfo("trigger")}
          onClick={(event) => {
            // 카드·펼침 안에 붙는 값표다 — 누름이 바깥 링크·카드 토글로 번지지 않게 막는다
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(true);
          }}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-accent-dim/40 bg-bg-secondary/60 px-2 py-1 text-xs text-text-tertiary sm:gap-2.5 sm:px-3 sm:py-1.5 sm:text-sm hover:border-accent/70 hover:bg-accent/10 active:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            full ? "w-full" : "mx-auto w-fit max-w-full",
            chipClassName,
          )}
        >
          {showSales ? (
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
          ) : (
            <strong className="font-semibold text-text-primary">
              {links.length === 1
                ? tBuy("buyAt", { platform: AFFILIATE_PLATFORMS[links[0].platform].label })
                : tBuy("buy")}
            </strong>
          )}
        </button>
      )}
      {isOpen && (
        <BookPurchaseModal sales={sales} links={links} onClose={() => setIsOpen(false)} />
      )}
    </AnimatedHeight>
  );
}
