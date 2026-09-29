/*
  파일명: /components/features/library/curated/CuratedListCard.tsx
  기능: 선정 목록 한 건을 나타내는 카드 — 작품 첫 화면과 기관 상세가 같은 카드를 쓴다
  책임: 위에는 목록 앞머리 작품의 표지 다섯 장을 부채꼴로 펼쳐 "무엇이 담겼는지"를 글자보다 먼저 보이고,
        아래에는 목록 이름과 편수, 그리고 낸 기관의 작은 서명(로고 + 이름 + 국가)을 둔다.
        기관은 주인공이 아니라 출처다 — 첫 화면에서 기관 로고를 크게 깔면 제휴사 로고 벽처럼 읽혔다(26.09.28).
        카드 전체는 목록 화면으로 가는 링크이고, 기관 서명만 따로 기관 화면으로 간다(링크 안에 링크를 넣지 않고 제목 링크를 카드 전체로 편다).
        기관 상세에서는 모든 카드가 같은 기관이라 서명 대신 목록 설명을 싣는다.
*/ // ------------------------------

"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Library } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CuratedListSummary } from "@/actions/library/types";
import { getCountryNameByLocale } from "@/lib/countries";
import { EXPLORE_CARD_FRAME_HOVER } from "@/components/shared/ExploreCard.styles";
import { getCuratorBrand } from "./curatorBrandPalettes";
import { getCuratorLogoUrl } from "./curatorLogos";

/** covers[i]가 설 자리 — 가운데가 1번 작품, 그 양옆에 2·3번, 바깥에 4·5번 */
const FAN_SLOTS = [0, -1, 1, -2, 2] as const;
/** 매체마다 표지 비율이 다르다 — 음반은 정사각, 게임 표지는 3:4, 책·영화 포스터는 2:3 */
const COVER_ASPECT: Record<string, string> = { MUSIC: "aspect-square", GAME: "aspect-[3/4]" };

export default function CuratedListCard({ list, curatorQuery = "", variant = "hub" }: {
  list: CuratedListSummary;
  /** 기관 서명 링크에 넘길 매체·주제 조건 */
  curatorQuery?: string;
  /** hub: 기관 서명을 단다 · curator: 기관 상세 — 서명 대신 목록 설명 */
  variant?: "hub" | "curator";
}) {
  const t = useTranslations("library.curated");
  const locale = useLocale();
  const covers = list.covers.slice(0, FAN_SLOTS.length);
  const aspect = COVER_ASPECT[list.contentType] ?? "aspect-[2/3]";
  const logoUrl = getCuratorLogoUrl(list.curatorSlug, list.curatorLogoUrl);
  const brand = getCuratorBrand(list.curatorSlug, list.curatorKind);
  const meta = [t("itemCount", { count: list.itemCount }), list.isAnnual ? t("annual") : list.isRanked ? t("ranked") : null].filter(Boolean).join(" · ");

  return (
    <article className={`group relative flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-bg-card ${EXPLORE_CARD_FRAME_HOVER}`}>
      {/* 표지 부채꼴 — hover에 조금 더 벌어진다(연출 축: 표지마다 transition-transform). 즉각 축은 카드 테두리·제목 색 */}
      <div aria-hidden className="relative aspect-[16/10] overflow-hidden border-b border-line bg-bg-raised [--fan-step:54%] [--fan-tilt:6deg] group-hover:[--fan-step:64%] group-hover:[--fan-tilt:8deg]">
        {covers.length ? covers.map((src, index) => {
          const slot = FAN_SLOTS[index];
          const depth = Math.abs(slot);
          return (
            <div key={`${index}-${src}`}
              className={`absolute bottom-[9%] left-1/2 w-[29%] origin-bottom overflow-hidden rounded-[3px] bg-bg-stone-light shadow-lg shadow-black/60 transition-transform duration-300 ease-out ${aspect}`}
              style={{
                zIndex: 10 - depth,
                transform: `translateX(calc(-50% + ${slot} * var(--fan-step))) rotate(calc(${slot} * var(--fan-tilt))) scale(${1 - depth * 0.06})`,
                // 뒤로 갈수록 어둡게 — 1번 작품이 앞에 선다
                filter: depth ? `brightness(${1 - depth * 0.18})` : undefined,
              }}>
              <Image src={src} alt="" fill draggable={false} sizes="(min-width: 1024px) 96px, (min-width: 768px) 10vw, 16vw" className="object-cover" />
            </div>
          );
        }) : (
          <Library size={28} className="absolute inset-0 m-auto text-text-tertiary" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 md:p-4">
        <h3 className="line-clamp-2 break-keep text-sm font-semibold leading-snug text-text-primary group-hover:text-accent md:text-[15px]">
          {/* 제목 링크를 카드 전체로 편다 — 카드 어디를 눌러도 목록 화면으로 간다 */}
          <Link href={`/explore/works/curated/${list.curatorSlug}/${list.slug}`} prefetch={false}
            className="outline-none after:absolute after:inset-0 after:z-20 after:rounded-card focus-visible:after:ring-2 focus-visible:after:ring-accent">
            {list.title}
          </Link>
        </h3>
        <p className="text-xs tabular-nums text-text-secondary">{meta}</p>
        {variant === "curator" ? (
          list.description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-secondary">{list.description}</p>
        ) : (
          // 출처 서명 — 카드 링크 위에 떠서 따로 눌린다
          <Link href={`/explore/works/curated/${list.curatorSlug}${curatorQuery}`} prefetch={false}
            className="relative z-30 mt-auto flex min-h-9 min-w-0 items-center gap-1.5 self-start rounded-control pe-1 pt-2 text-xs text-text-secondary hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {logoUrl ? (
              // 로고 파일은 바탕·여백까지 정사각으로 완성돼 있다 — 판을 덧대지 않는다(service-03-curated-lists.md 「기관 로고」)
              <span className="relative size-5 shrink-0 overflow-hidden rounded-[4px]">
                <Image src={logoUrl} alt="" fill sizes="20px" className="object-contain" />
              </span>
            ) : (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-bg-raised text-[11px] font-bold" style={{ color: brand.primary }}>{brand.monogram.slice(0, 1)}</span>
            )}
            <span className="truncate">{list.curatorName ?? brand.monogram}</span>
            {list.curatorCountry && (
              <span className="shrink-0 text-text-tertiary"><span aria-hidden className="me-1">·</span>{getCountryNameByLocale(list.curatorCountry, locale)}</span>
            )}
          </Link>
        )}
      </div>
    </article>
  );
}
