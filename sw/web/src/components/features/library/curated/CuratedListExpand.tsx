/*
  파일명: /components/features/library/curated/CuratedListExpand.tsx
  기능: 선정 목록의 작품 펼쳐보기 (클라이언트, 모바일 폭 전용)
  책임: 인물 상세 「기록 > 감상」 펼침 보기와 같은 틀이다 — 작품 한 편을 크게 띄우고
        머리와 아래 띠의 이전·다음으로 넘기며, 「작품 목록」 모달에서 열 단위 묶음(1–10, 11–20…)으로 고른다.
        카드는 표지·작품 소개·선정 사유·서지 정보·구매 단추를 쌓는다. 구매 단추는 링크가 없어도 자리를 지킨다.
        아직 등록되지 않은 작품도 번호와 카드를 가진다 — 100선은 100편이어야 한다.
        고른 작품 번호와 「작품 목록」 열림은 바깥(CuratedListMobile)이 쥔다 — 격자 보기와 같은 번호를 나눠 쓰기 위해서다.
        데스크톱은 격자(CuratedListGrid)가 대신하므로 이 화면이 가려진 폭에서는 소개를 불러오지 않는다.
*/ // ------------------------------
"use client";

import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { CuratedListDetail, CuratedListItem } from "@/actions/library/types";
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import ContentIntro from "@/components/features/user/contentLibrary/expand/ContentIntro";
import ContentMetaPanel from "@/components/features/user/contentLibrary/expand/ContentMetaPanel";
import {
  ExpandBottomNavigation,
  ExpandTitleHeader,
} from "@/components/features/user/contentLibrary/expand/ExpandNavigation";
import { useContentBrief } from "@/components/features/user/contentLibrary/expand/useContentBrief";
import { useHeldHeight } from "@/components/features/user/contentLibrary/expand/useHeldHeight";
import Button from "@/components/ui/Button";
import GenerativeBookCover from "@/components/ui/cards/ContentCard/sections/GenerativeBookCover";
import ContentImage from "@/components/ui/ContentImage";
import ContentTextModal, { ExpandTextButton } from "@/components/ui/ContentTextModal";
import Modal from "@/components/ui/Modal";
import NoEditionBadge from "@/components/ui/NoEditionBadge";
import { getCategoryByDbType } from "@/constants/categories";
import { useClippedText } from "@/hooks/useClippedText";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** 「작품 목록」 모달에서 한 묶음에 넣는 작품 수 */
const GROUP_SIZE = 10;
/** 고정 띠를 재지 못했을 때 쓰는 여유 — 화면 맨 위 고정 머리글(64px)에 제목이 가리지 않을 최소 높이 */
const HEADER_OFFSET = 80;
/** 모바일 조작 줄이 고정 머리글 아래에 붙어 따라오는 띠. 격자 보기(CuratedListMobile)도 같은 띠를 쓴다 */
export const MOBILE_STICKY_BAR_CLASS = "sticky top-[var(--layer-header-h)] z-20 -mt-2 bg-bg-main pt-2";
/** 화살표를 누른 직후로 볼 시간. 이보다 늦게 온 선택 변화는 화살표가 부른 것이 아니다 */
const REVEAL_WINDOW_MS = 400;
/** 이 화면이 보이는 폭 — Tailwind md 미만. 격자가 보이는 폭에서는 소개 요청을 쉬게 한다 */
const NARROW_QUERY = "(max-width: 767px)";

function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** 서버와 첫 그리기에서는 넓은 폭으로 보고, 물을 수 있게 되면 실제 폭을 따른다 */
function useIsNarrowScreen() {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

interface CuratedListExpandProps {
  list: CuratedListDetail;
  /** 지금 띄운 작품 번호. 모바일 조작 줄이 격자 보기와 나눠 쥔다 */
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  /** 「작품 목록」 모달 열림. 여는 단추는 바깥 조작 줄에 있다 */
  isIndexOpen: boolean;
  onIndexOpenChange: (open: boolean) => void;
  /** 바깥 조작 줄. 「← 제목 →」 머리와 한 덩어리로 고정 머리글 아래에 붙어 따라온다 */
  toolbar: ReactNode;
}

export default function CuratedListExpand({
  list,
  selectedIndex,
  onSelectIndex,
  isIndexOpen,
  onIndexOpenChange,
  toolbar,
}: CuratedListExpandProps) {
  const t = useTranslations("library.curated");
  const tArchive = useTranslations("archiveSearch");
  const { items } = list;
  const total = items.length;
  const rootRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const revealRequestedAtRef = useRef(0);
  const latestContentIdRef = useRef<string | null>(items[selectedIndex]?.contentId ?? null);

  const selected = items[selectedIndex] ?? items[0];
  const activeContentId = selected?.contentId ?? null;
  /* 바깥에서 번호가 바뀌어 들어와도(격자에서 넘어올 때) 최신 선택으로 인정해야 소개가 실린다 */
  useEffect(() => {
    latestContentIdRef.current = activeContentId;
  }, [activeContentId]);

  /* 순위 목록은 원문 순위를, 아니면 원문 순서를 번호로 쓴다 */
  const numberLabel = useCallback(
    (index: number) => {
      const rank = items[index]?.rank;
      return list.isRanked && rank != null ? t("rankLabel", { rank }) : `${index + 1}.`;
    },
    [items, list.isRanked, t],
  );

  /* 작품 소개·서지는 감상 펼침 보기와 같은 조회를 쓴다. 미등록 작품은 식별자가 없어 요청하지 않는다 */
  const contentIds = useMemo(() => items.map((item) => item.contentId ?? ""), [items]);
  const isLatestSelection = useCallback(
    (contentId: string) => latestContentIdRef.current === contentId,
    [],
  );
  const isNarrow = useIsNarrowScreen();
  const {
    contentId: loadedContentId,
    brief: loadedBrief,
    isLoading,
    hasError,
    retry,
  } = useContentBrief(contentIds, selectedIndex, activeContentId, isLatestSelection, isNarrow);
  const brief = loadedContentId === activeContentId ? loadedBrief : null;
  /* 작품을 바꾸면 소개가 오기 전까지 뼈대만 그려져 상자가 줄었다 늘어난다. 그 사이 직전 높이를 붙든다 */
  const cardRef = useHeldHeight(isLoading);

  const select = useCallback(
    (next: number, viaArrow: boolean) => {
      const item = items[next];
      if (!item) return;
      if (viaArrow) revealRequestedAtRef.current = performance.now();
      latestContentIdRef.current = item.contentId ?? null;
      onSelectIndex(next);
      onIndexOpenChange(false);
    },
    [items, onIndexOpenChange, onSelectIndex],
  );
  const goPrevious = useCallback(
    () => select((selectedIndex - 1 + total) % total, true),
    [select, selectedIndex, total],
  );
  const goNext = useCallback(
    () => select((selectedIndex + 1) % total, true),
    [select, selectedIndex, total],
  );

  /* 작품을 넘기면 새 카드의 머리부터 읽어야 한다. 긴 카드를 내려 보던 중 넘기면 카드 윗부분이 고정 띠 밑으로
     들어가 있으므로, 그때만 카드 윗변을 띠 바로 아래로 맞춘다. 화살표를 누른 직후가 아니면 손대지 않는다 — 감상 펼침 보기와 같은 규칙 */
  useLayoutEffect(() => {
    const requestedAt = revealRequestedAtRef.current;
    revealRequestedAtRef.current = 0;
    if (requestedAt === 0 || performance.now() - requestedAt > REVEAL_WINDOW_MS) return;

    const root = rootRef.current;
    if (!root) return;
    const limit = stickyRef.current?.getBoundingClientRect().bottom ?? HEADER_OFFSET;
    const { top } = root.getBoundingClientRect();
    if (top >= limit) return;
    window.scrollTo({ top: window.scrollY + top - limit, behavior: "instant" });
  }, [selectedIndex]);

  if (!selected) return null;
  const isNavigationDisabled = total <= 1;
  const number = numberLabel(selectedIndex);

  return (
    <div>
      {/* 조작 줄과 「← 제목 →」 머리는 한 덩어리로 고정 머리글 아래에 붙어 따라온다. 띠의 바탕색이 지나가는 카드를 가린다 */}
      <div ref={stickyRef} className={MOBILE_STICKY_BAR_CLASS}>
        {toolbar}
        <div className="mt-2 overflow-hidden rounded-t-xl border border-b-0 border-white/20">
          <ExpandTitleHeader
            title={`${number} ${selected.title}`}
            titleBadge={selected.titleBadge}
            creator={selected.creator}
            previousLabel={tArchive("expandPrevBook")}
            nextLabel={tArchive("expandNextBook")}
            disabled={isNavigationDisabled}
            onPrevious={goPrevious}
            onNext={goNext}
          />
        </div>
      </div>

      <section
        ref={rootRef}
        data-expand-item-count={total}
        className="overflow-hidden rounded-b-xl border border-t-0 border-white/20 bg-bg-card"
      >
        <div aria-busy={isLoading} className="min-w-0">
          <div ref={cardRef}>
            <CuratedItemCard
              key={selected.id}
              item={selected}
              list={list}
              number={number}
              brief={brief}
              isLoading={isLoading}
              hasError={hasError}
              onRetry={retry}
            />
          </div>
          <ExpandBottomNavigation
            label={tArchive("expandBottomNavigation")}
            previousLabel={tArchive("expandPrevBook")}
            nextLabel={tArchive("expandNextBook")}
            disabled={isNavigationDisabled}
            onPrevious={goPrevious}
            onNext={goNext}
          />
        </div>
      </section>

      {isIndexOpen && (
        <CuratedIndexModal
          items={items}
          selectedIndex={selectedIndex}
          numberLabel={numberLabel}
          title={t("itemIndex")}
          notRegisteredLabel={t("notRegistered")}
          onSelect={(index) => select(index, false)}
          onClose={() => onIndexOpenChange(false)}
        />
      )}
    </div>
  );
}

/* ── 카드 — 표지·소개·선정 사유·서지·구매 단추 ── */
interface CuratedItemCardProps {
  item: CuratedListItem;
  list: CuratedListDetail;
  number: string;
  brief: ContentBrief | null;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}

function CuratedItemCard({ item, list, number, brief, isLoading, hasError, onRetry }: CuratedItemCardProps) {
  const t = useTranslations("library.curated");
  const tArchive = useTranslations("archiveSearch");
  const locale = useLocale();
  const dbType = item.contentType ?? list.contentType;
  const category = getCategoryByDbType(dbType);
  const ContentIcon = category?.lucideIcon ?? BookOpen;
  const isRegistered = item.contentId != null;
  const href = isRegistered ? `/content/${item.contentId}?category=${category?.id ?? "book"}` : null;
  /* 한국어판 구매 버튼. 링크가 없어도 자리는 지킨다 */
  const showPurchase = locale === "ko" && dbType === "BOOK";

  return (
    <article className="flex w-full flex-col">
      {/* 머리띠 — 번호·연도. 위 제목 줄에는 자리가 없어 카드 첫 줄에 둔다 */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 text-[12px] sm:px-4 md:px-5">
        <span className="rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 font-mono tabular-nums text-accent">
          {number}
        </span>
        {item.year != null && (
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-text-secondary">
            {t("yearLabel", { year: item.year })}
          </span>
        )}
        {!isRegistered && (
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-text-tertiary">{t("notRegistered")}</span>
        )}
      </div>

      {/* 윗칸 — 표지와 작품 소개. 소개 칸은 표지 열이 정한 높이만큼만 보인다(감상 펼침 카드와 같은 규칙) */}
      <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:p-4 md:gap-x-5 md:p-5">
        <div className="mx-auto w-36 shrink-0 sm:mx-0 sm:w-full">
          <div className="relative h-56 w-full overflow-hidden rounded-lg border border-white/10 bg-bg-secondary shadow-lg sm:h-72">
            {item.thumbnailUrl ? (
              <ContentImage
                src={item.thumbnailUrl}
                alt={item.title}
                sizes="(max-width: 640px) 144px, 192px"
                className="object-contain"
                loading="eager"
              />
            ) : (
              <GenerativeBookCover
                title={item.rawTitle}
                ContentIcon={ContentIcon}
                iconSize={28}
                label={isRegistered ? undefined : t("notRegistered")}
              />
            )}
          </div>
        </div>

        <div className="min-w-0 sm:contain-size">
          {!isRegistered ? (
            <div className="flex h-full flex-col justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4 text-center">
              <p className="text-sm font-semibold text-text-secondary">{t("notRegistered")}</p>
              <p className="mt-2 break-keep text-base font-bold text-text-primary">{item.rawTitle}</p>
              {item.rawCreator && <p className="mt-1 text-sm text-text-tertiary">{item.rawCreator}</p>}
            </div>
          ) : hasError ? (
            <div role="alert" className="rounded-lg border border-red-400/25 bg-red-400/[0.06] p-4 text-sm text-text-secondary">
              <p>{tArchive("loadFailed")}</p>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
                {tArchive("retry")}
              </Button>
            </div>
          ) : (
            <ContentIntro brief={brief} category={category?.id ?? "book"} isLoading={isLoading} />
          )}
        </div>
      </div>

      {/* 가운뎃칸 — 왜 뽑혔는가. 감상 펼침의 감상배경 자리다 */}
      <SelectionNote note={item.note?.trim() || null} />

      {/* 아랫칸 — 출판사·ISBN 등 작품의 나머지 정보.
          내부 링크는 비워 보낸다 — 서지 판의 링크 줄 대신 아래 발판의 「작품 상세보기」가 그 일을 한다 */}
      {isRegistered && !hasError && (
        <ContentMetaPanel brief={brief} isLoading={isLoading} internalHref="" />
      )}

      {/* 발판 — 작품 열기·구매. 링크가 없어도 자리를 비우지 않는다 */}
      <div className="border-t border-white/10 px-3 py-4 sm:px-4 md:px-5">
        <div className={cn("grid gap-2", showPurchase && "sm:grid-cols-2")}>
          {href ? (
            <Link
              href={href}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-3 py-2.5 text-sm font-black text-bg-secondary hover:bg-accent-hover active:bg-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
            >
              <ContentIcon size={17} aria-hidden />
              {t("openContent")}
            </Link>
          ) : (
            <PendingSlot label={t("notRegistered")} />
          )}
          {showPurchase &&
            (item.contentId ? (
              <AffiliateBookAction contentId={item.contentId} coupangUrl={item.coupangUrl} />
            ) : (
              <PendingSlot label={t("purchasePending")} tone="purchase" />
            ))}
        </div>
        {showPurchase && (
          <BookPurchaseInfo className="mt-2" />
        )}
      </div>
    </article>
  );
}

/* 선정 사유 — 「제1회」처럼 몇 글자인 것이 대부분이라(중앙값 25자) 목록 머리의 「개요」처럼 제목과 본문을
   한 줄에 붙이고 높이는 글이 정한다. 넘치는 드문 글(최대 402자)은 세 줄에서 말줄임 뒤 「더 보기」 모달로 마저 본다.
   사유가 없는 작품(전체의 1/3)은 칸을 두지 않는다 */
function SelectionNote({ note }: { note: string | null }) {
  const t = useTranslations("library.curated");
  const tArchive = useTranslations("archiveSearch");
  const [isOpen, setIsOpen] = useState(false);
  const { ref, isClipped } = useClippedText<HTMLParagraphElement>(note);
  if (!note) return null;

  return (
    <section className="border-t border-accent/20 bg-accent/[0.04] px-3 py-3 sm:px-4 md:px-5">
      <div className="flex items-start justify-between gap-3">
        <p
          ref={ref}
          className="line-clamp-3 min-w-0 flex-1 whitespace-pre-line break-words text-[14px] leading-[1.8] text-text-primary"
        >
          <strong className="mr-2 font-bold text-accent">{t("selectionNote")}</strong>
          {note}
        </p>
        {isClipped && (
          <ExpandTextButton label={tArchive("expandIntroMore")} onClick={() => setIsOpen(true)} />
        )}
      </div>
      {isOpen && (
        <ContentTextModal isOpen onClose={() => setIsOpen(false)} title={t("selectionNote")} text={note} />
      )}
    </section>
  );
}

/** 쿠팡 빈자리의 색. 쿠팡 단추(빨강)보다 연하고 투명한 분홍 — 링크가 생겨도 색이 확 바뀌지 않게 한다 */
export const PURCHASE_PENDING_TONE_CLASS = "border-white/10 bg-white/[0.03] text-text-tertiary";

/** 아직 누를 수 없는 단추 자리. 단추와 같은 높이·모서리로 그려 줄이 흔들리지 않게 한다 */
function PendingSlot({ label, tone = "muted" }: { label: string; tone?: "muted" | "purchase" }) {
  return (
    <div
      aria-disabled="true"
      className={cn(
        "flex min-h-11 w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold",
        tone === "purchase" ? PURCHASE_PENDING_TONE_CLASS : "border-dashed border-white/15 bg-white/[0.03] text-text-tertiary",
      )}
    >
      {label}
    </div>
  );
}

/* ── 「작품 목록」 모달 — 열 단위 묶음으로 접고 편다 ── */
interface CuratedIndexModalProps {
  items: CuratedListItem[];
  selectedIndex: number;
  numberLabel: (index: number) => string;
  title: string;
  notRegisteredLabel: string;
  onSelect: (index: number) => void;
  onClose: () => void;
}

function CuratedIndexModal({
  items,
  selectedIndex,
  numberLabel,
  title,
  notRegisteredLabel,
  onSelect,
  onClose,
}: CuratedIndexModalProps) {
  const navRef = useRef<HTMLElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<number>>(() => new Set());
  const groups = useMemo(() => {
    const out: { start: number; items: CuratedListItem[] }[] = [];
    for (let start = 0; start < items.length; start += GROUP_SIZE) {
      out.push({ start, items: items.slice(start, start + GROUP_SIZE) });
    }
    return out;
  }, [items]);

  /* 열자마자 지금 보던 작품이 보이게 맞춘다 */
  useEffect(() => {
    navRef.current
      ?.querySelector(`[data-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: "center" });
  }, [selectedIndex]);

  const toggleGroup = (start: number) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(start)) next.delete(start);
      else next.add(start);
      return next;
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={title} size="lg" closeOnOverlayClick animateHeight={false}>
      <nav
        ref={navRef}
        aria-label={title}
        className="custom-scrollbar max-h-[calc(100dvh-10rem)] overflow-y-auto overflow-x-hidden [overflow-anchor:none] [scrollbar-width:thin]"
      >
        {groups.map((group) => {
          const isExpanded = !collapsedGroups.has(group.start);
          const rangeLabel = `${group.start + 1}–${group.start + group.items.length}`;
          return (
            <section key={group.start}>
              <h3 className="sticky top-0 z-10 m-0">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleGroup(group.start)}
                  className="relative flex h-8 w-full items-center justify-center gap-2 border-y border-white/15 bg-bg-card text-xs font-medium tracking-wide text-text-tertiary hover:bg-white/[0.08] hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70"
                >
                  <span className="font-mono tabular-nums">{rangeLabel}</span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "absolute end-2 h-3.5 w-3.5 transition-transform duration-200 ease-out",
                      isExpanded ? "rotate-0" : "-rotate-90",
                    )}
                    strokeWidth={1.8}
                  />
                </button>
              </h3>
              <div
                inert={!isExpanded}
                aria-hidden={isExpanded ? undefined : true}
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  {group.items.map((item, offset) => {
                    const index = group.start + offset;
                    const isSelected = index === selectedIndex;
                    const isRegistered = item.contentId != null;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-index={index}
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => onSelect(index)}
                        title={item.title}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-2.5 border-b border-white/[0.06] px-2 py-1.5 text-start last:border-b-0 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70",
                          isSelected ? "bg-accent/[0.09] text-accent" : "text-text-secondary hover:text-text-primary",
                          !isRegistered && "opacity-55",
                        )}
                      >
                        <span
                          aria-hidden
                          className="min-w-9 shrink-0 text-end font-mono text-[11px] tabular-nums text-text-tertiary"
                        >
                          {numberLabel(index)}
                        </span>
                        <span
                          aria-hidden
                          className="relative h-10 w-7 shrink-0 overflow-hidden rounded-[2px] border border-white/10 bg-bg-secondary"
                        >
                          {item.thumbnailUrl && (
                            <ContentImage src={item.thumbnailUrl} alt="" sizes="28px" className="object-cover" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm leading-snug">
                            <NoEditionBadge badge={item.titleBadge} />
                            {item.title}
                          </span>
                          {(item.creator || !isRegistered) && (
                            <span className="block truncate text-[11px] text-text-tertiary">
                              {item.creator ?? notRegisteredLabel}
                            </span>
                          )}
                        </span>
                        {item.year != null && (
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-tertiary">
                            {item.year}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </nav>
    </Modal>
  );
}
