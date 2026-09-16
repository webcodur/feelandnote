/*
  파일명: /components/shared/SharedLibraryShelf.tsx
  기능: 함께 본 서재 선반 — 여러 인물이 함께 본 작품을 진열한다
  책임: 가장 많이 함께 본 작품을 크게 앞세우고 나머지를 표지 격자로 잇는다. 작품마다 본 인물·비율을 보이고,
        한국어 도서에는 판매처 단추(YES24·쿠팡)를 붙여 구매로 잇는다. 수수료 안내는 구획당 하나다.
        자료를 받는 쪽(세력도감 서재 탭 등)이 items를 넘긴다 — 받는 중이면 null.
*/ // ------------------------------

"use client";

import { useId, useMemo, useState } from "react";
import { ArrowUpRight, Book, Film, Gamepad2, Music } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { SharedContent } from "@/actions/home/getTagSharedLibrary";
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import Yes24Sales from "@/components/features/commerce/Yes24Sales";
import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import { celebDisplayName } from "@/lib/celeb/displayName";
import CelebImage from "@/components/ui/CelebImage";
import ContentImage from "@/components/ui/ContentImage";
import NoEditionBadge from "@/components/ui/NoEditionBadge";
import { getCategoryByDbType } from "@/constants/categories";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TYPES = ["BOOK", "VIDEO", "GAME", "MUSIC"] as const;
type WorkType = (typeof TYPES)[number];
const TYPE_ICONS: Record<WorkType, typeof Book> = { BOOK: Book, VIDEO: Film, GAME: Gamepad2, MUSIC: Music };
/** 한 번에 펼치는 작품 수 — 맨 앞 한 편은 크게, 나머지는 격자 */
const PAGE_SIZE = 13;

interface SharedLibraryShelfProps {
  heading: string;
  /** 받는 중이면 null */
  items: SharedContent[] | null;
  /** 함께 본 비율의 분모(무리 전체 인원). 없으면 비율을 그리지 않는다 */
  memberCount?: number;
}

type Translate = ReturnType<typeof useTranslations>;

function workHref(item: SharedContent) {
  return `/content/${item.contentId}?category=${getCategoryByDbType(item.type)?.id || "book"}`;
}

function workText(item: SharedContent, isEn: boolean) {
  return {
    title: isEn ? (item.title_en ?? item.title) : item.title,
    badge: isEn ? (item.titleBadgeEn ?? item.titleBadge) : item.titleBadge,
    creator: (isEn ? (item.creator_en ?? item.creator) : item.creator)?.replace(/\^/g, ", ") ?? null,
  };
}

export default function SharedLibraryShelf({ heading, items, memberCount }: SharedLibraryShelfProps) {
  const t = useTranslations("shared.libraryShelf");
  const tType = useTranslations("content.category");
  const locale = useLocale();
  const isEn = locale === "en";
  const headingId = useId();
  const [filter, setFilter] = useState<WorkType | "ALL">("ALL");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const counts = useMemo(() => {
    const map = new Map<WorkType, number>();
    for (const item of items ?? []) {
      const type = (TYPES as readonly string[]).includes(item.type) ? (item.type as WorkType) : "BOOK";
      map.set(type, (map.get(type) ?? 0) + 1);
    }
    return map;
  }, [items]);
  const availableTypes = TYPES.filter((type) => counts.has(type));
  const filtered = (items ?? []).filter((item) => filter === "ALL" || item.type === filter);
  const [lead, ...rest] = filtered.slice(0, limit);
  const canBuy = (item: SharedContent) => !isEn && item.type === "BOOK";
  const hasPurchase = filtered.some(canBuy);

  const chooseFilter = (next: WorkType | "ALL") => {
    setFilter(next);
    setLimit(PAGE_SIZE);
  };

  return (
    <section aria-labelledby={headingId} className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="font-serif text-xl font-bold text-text-primary md:text-2xl">{heading}</h3>
          {items && (
            <p className="mt-1 text-sm text-text-secondary">
              {memberCount ? t("lead", { count: items.length, members: memberCount }) : t("leadPlain", { count: items.length })}
            </p>
          )}
        </div>
        {hasPurchase && (
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            {t("purchaseInfo")}
            <BookPurchaseInfo className="inline-flex size-7" />
          </div>
        )}
      </header>

      {availableTypes.length > 1 && (
        <div role="group" aria-label={t("typeLabel")} className="flex flex-wrap gap-2">
          {(["ALL", ...availableTypes] as const).map((type) => {
            const active = filter === type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => chooseFilter(type)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/20"
                    : "border-white/15 bg-white/[0.03] text-text-secondary hover:border-white/35 hover:text-text-primary",
                )}
              >
                {type === "ALL" ? t("all") : tType(type.toLowerCase())}
                <span className="text-xs tabular-nums opacity-70">{type === "ALL" ? items?.length : counts.get(type)}</span>
              </button>
            );
          })}
        </div>
      )}

      {items === null ? (
        <ShelfSkeleton />
      ) : (
        <>
          {lead && <LeadWork item={lead} memberCount={memberCount} isEn={isEn} buyable={canBuy(lead)} t={t} />}
          {rest.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {rest.map((item) => (
                <WorkCard key={item.contentId} item={item} memberCount={memberCount} isEn={isEn} buyable={canBuy(item)} t={t} />
              ))}
            </ul>
          )}
          {filtered.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((current) => current + PAGE_SIZE - 1)}
              className="mx-auto flex min-h-10 items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-text-secondary outline-none hover:border-accent/60 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t("more", { count: filtered.length - limit })}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Cover({ item, title, sizes }: { item: SharedContent; title: string; sizes: string }) {
  const Icon = TYPE_ICONS[item.type as WorkType] ?? Book;
  if (item.thumbnailUrl) {
    return (
      <ContentImage
        src={item.thumbnailUrl}
        alt={title}
        sizes={sizes}
        className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
      />
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
      <Icon size={22} className="text-accent/60" aria-hidden />
      <span className="line-clamp-3 text-xs font-semibold text-text-secondary">{title}</span>
    </div>
  );
}

/* 본 인물 — 얼굴 몇 명과 이름, 무리 전체 가운데 몇 명이 봤는지 */
function Readers({ item, memberCount, isEn, faces, t }: { item: SharedContent; memberCount?: number; isEn: boolean; faces: number; t: Translate }) {
  const names = item.celebs.map((celeb) => celebDisplayName(celeb, isEn ? "en" : "ko"));
  const hidden = names.length - Math.min(names.length, 2);
  const ratio = memberCount ? Math.min(100, Math.round((item.celebCount / memberCount) * 100)) : null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex shrink-0 -space-x-2" aria-hidden>
          {item.celebs.slice(0, faces).map((celeb, index) => (
            <span key={celeb.id} className="relative size-6 overflow-hidden rounded-full border-2 border-bg-main bg-bg-secondary md:size-7">
              <CelebImage src={celeb.avatar_url} alt={names[index]} shape="circle" />
            </span>
          ))}
        </div>
        <span className="min-w-0 truncate text-xs text-text-secondary" title={names.join(", ")}>
          {names.slice(0, 2).join(", ")}
          {hidden > 0 && ` ${t("others", { count: hidden })}`}
        </span>
      </div>
      {ratio !== null && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent/80" style={{ width: `${Math.max(ratio, 4)}%` }} />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-text-tertiary">
            {t("readerRatio", { count: item.celebCount, members: memberCount ?? 0 })}
          </span>
        </div>
      )}
    </div>
  );
}

function LeadWork({ item, memberCount, isEn, buyable, t }: { item: SharedContent; memberCount?: number; isEn: boolean; buyable: boolean; t: Translate }) {
  const { title, badge, creator } = workText(item, isEn);
  const href = workHref(item);

  return (
    <article className="grid gap-4 rounded-2xl border border-accent/25 bg-[radial-gradient(circle_at_0%_0%,rgba(217,181,78,.1),transparent_55%)] p-4 sm:grid-cols-[auto_minmax(0,1fr)] md:gap-6 md:p-6">
      <Link
        href={href}
        prefetch={false}
        aria-label={title}
        className="group relative mx-auto block aspect-[2/3] w-32 overflow-hidden rounded-lg border border-white/10 bg-bg-secondary shadow-[0_18px_40px_rgba(0,0,0,.45)] outline-none focus-visible:ring-2 focus-visible:ring-accent sm:mx-0 md:w-40"
      >
        <Cover item={item} title={title} sizes="160px" />
      </Link>
      <div className="flex min-w-0 flex-col justify-center">
        <p className="text-xs font-bold tracking-[0.14em] text-accent">{t("mostShared")}</p>
        <h4 className="mt-1 font-serif text-xl font-bold leading-snug text-text-primary md:text-2xl">
          <Link href={href} prefetch={false} className="outline-none hover:text-accent focus-visible:text-accent">
            <NoEditionBadge badge={badge} />
            {title}
          </Link>
        </h4>
        {creator && <p className="mt-1 text-sm text-text-secondary">{creator}</p>}
        {/* YES24 판매 정보 — 제목·저자의 책정보 흐름에 붙이고 구매 단추와는 뗀다 */}
        {buyable && <Yes24Sales contentId={item.contentId} editionId={item.editionId} className="mt-3" />}
        <Readers item={item} memberCount={memberCount} isEn={isEn} faces={6} t={t} />
        {buyable ? (
          <AffiliateBookAction contentId={item.contentId} editionId={item.editionId} coupangUrl={item.coupangUrl} hideSales className="mt-4 w-full max-w-sm" />
        ) : (
          <Link href={href} prefetch={false} className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-semibold text-accent outline-none hover:underline focus-visible:underline">
            {t("viewWork")}
            <ArrowUpRight size={14} aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}

function WorkCard({ item, memberCount, isEn, buyable, t }: { item: SharedContent; memberCount?: number; isEn: boolean; buyable: boolean; t: Translate }) {
  const { title, badge, creator } = workText(item, isEn);
  const Icon = TYPE_ICONS[item.type as WorkType] ?? Book;

  return (
    <li className="flex min-w-0 flex-col">
      <Link
        href={workHref(item)}
        prefetch={false}
        className="group flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-bg-card outline-none hover:border-accent/60 hover:bg-accent/[0.04] focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-bg-secondary">
          <Cover item={item} title={title} sizes="(max-width: 640px) 50vw, 240px" />
          <span className="absolute start-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[11px] font-bold tabular-nums text-accent">
            {t("readerCount", { count: item.celebCount })}
          </span>
          <span className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-black/70 text-white/80" aria-hidden>
            <Icon size={12} />
          </span>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h4 className="line-clamp-2 text-sm font-bold leading-5 text-text-primary group-hover:text-accent">
            <NoEditionBadge badge={badge} />
            {title}
          </h4>
          {creator && <p className="mt-0.5 truncate text-xs text-text-secondary">{creator}</p>}
          <Readers item={item} memberCount={memberCount} isEn={isEn} faces={3} t={t} />
        </div>
      </Link>
      {buyable && (
        <AffiliateBookAction contentId={item.contentId} editionId={item.editionId} coupangUrl={item.coupangUrl} compact className="mt-2" />
      )}
    </li>
  );
}

function ShelfSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-48 rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-[3/4] rounded-xl border border-white/[0.06] bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}
