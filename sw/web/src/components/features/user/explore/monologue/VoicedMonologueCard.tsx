"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import { useReadingNarration } from "@/hooks/useReadingNarration";
import { useReadingTiming } from "@/hooks/useReadingTiming";
import type { CelebBookShelf } from "@/actions/celebs/getCelebBookShelf";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import AffiliateBookList from "@/components/shared/AffiliateBookList";
import AutoScrollReadingText from "@/components/shared/AutoScrollReadingText";
import ContentIntroModal from "@/components/ui/cards/ContentCard/modals/ContentIntroModal";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";
import { getBookStorePlatform } from "@/constants/affiliatePlatforms";
import { cn } from "@/lib/utils";

/** 카드 책장은 한 구역당 이 수만큼만 선다 — 더 보려면 구역별 인물 페이지 자리로 간다 */
const SHELF_GROUP_LIMIT = 8;
const SHELF_GROUP_LABELS = { authored: "bookGroupAuthored", related: "bookGroupRelated", read: "bookGroupRead" } as const;

interface Props {
  celeb: VirtualMonologueCeleb;
  text: string;
  shelf: CelebBookShelf | null;
  shelfFailed: boolean;
  onShelfRetry?: () => void;
}

export default function VoicedMonologueCard({ celeb, text, shelf, shelfFailed, onShelfRetry }: Props) {
  return (
    <article className="relative px-4 py-5 sm:px-6">
      <MonologueBody celeb={celeb} text={text} shelf={shelf} shelfFailed={shelfFailed} onShelfRetry={onShelfRetry} />
    </article>
  );
}

/** 선택한 인물의 낭독 재생·본문·책장. 창을 닫으면 내려가 재생도 멈춘다. */
function MonologueBody({ celeb, text, shelf, shelfFailed, onShelfRetry }: { celeb: VirtualMonologueCeleb; text: string; shelf: CelebBookShelf | null; shelfFailed: boolean; onShelfRetry?: () => void }) {
  const t = useTranslations("celebPage");
  const tMono = useTranslations("explore.monologue");
  const platform = getBookStorePlatform(useLocale());
  const narration = useReadingNarration(celeb.voiceUrl ?? "");
  const { available, status, currentTime, duration, play, seek } = narration;
  const timing = useReadingTiming(celeb.id, celeb.voiceLocale, celeb.voiceV, text, duration, available, "monologue");
  const playFrom = (seconds: number) => { seek(seconds); play(); };

  // 저서·연관·읽은 책 — 묶음이 둘 이상이면 탭으로 갈라 보고, 한 묶음이면 탭 없이 곧장 선다
  const shelfSections = (["authored", "related", "read"] as const)
    .map((key) => ({ key, label: tMono(SHELF_GROUP_LABELS[key]), total: shelf?.[key].length ?? 0, items: shelf?.[key].slice(0, SHELF_GROUP_LIMIT) ?? [] }))
    .filter((section) => section.items.length > 0);
  const [shelfTab, setShelfTab] = useState(0);
  const activeShelf = shelfSections[Math.min(shelfTab, shelfSections.length - 1)];
  // 책을 누르면 페이지를 뜨지 않고 이 창 안에서 소개 모달을 연다 — 모달이 읽기 화면 전체다
  const [introBook, setIntroBook] = useState<AffiliateBook | null>(null);
  const profileUrl = getCelebProfileUrl(celeb);
  const shelfMoreHref = activeShelf?.key === "read" ? `${profileUrl}/records` : `${profileUrl}#affiliate-books`;

  return (
    <>
      <div className="relative">
        <ReadingNarrationControls narration={narration} />
      </div>

      <AutoScrollReadingText
        className="relative mt-4"
        text={text}
        segments={timing?.segments ?? null}
        status={status}
        currentTime={currentTime}
        onPlayFrom={playFrom}
        sentenceLabel={t("readingPlayFromHere")}
      />

      {!shelf ? (
        <p className="relative mt-5 flex items-center gap-3 border-t border-white/10 pt-4 text-xs text-text-tertiary" role="status">
          {tMono(shelfFailed ? "bookShelfFailed" : "bookShelfLoading")}
          {shelfFailed && onShelfRetry ? (
            <button
              type="button"
              onClick={onShelfRetry}
              className="rounded-full border border-accent/50 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {tMono("retry")}
            </button>
          ) : null}
        </p>
      ) : activeShelf ? (
        <div className="relative mt-5 border-t border-white/10 pt-4">
          {shelfSections.length > 1 ? (
            <div role="tablist" aria-label={tMono("bookShelf")} className="mb-3 flex flex-wrap gap-1.5">
              {shelfSections.map((section, index) => (
                <button
                  key={section.key}
                  type="button"
                  role="tab"
                  aria-selected={section === activeShelf}
                  onClick={() => setShelfTab(index)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    section === activeShelf
                      ? "border-accent/60 bg-accent/15 text-accent"
                      : "border-white/10 text-text-secondary hover:border-accent/40 hover:text-accent",
                  )}
                >
                  {section.label}
                  <span className="ms-1.5 text-xs font-medium tabular-nums opacity-70">{section.total}</span>
                </button>
              ))}
            </div>
          ) : null}
          {/* 인물 상세 「참고도서」와 같은 공통 상품 선반 — 카드 본체는 책 소개 모달, 아래 단추가 서점 제휴 창을 연다 */}
          <AffiliateBookList
            books={activeShelf.items}
            heading={activeShelf.label}
            hideHeading
            platform={platform}
            scroll
            onDetail={setIntroBook}
          />
          {activeShelf.total > SHELF_GROUP_LIMIT ? (
            <div className="mt-2 flex justify-end">
              <Link
                href={shelfMoreHref}
                prefetch={false}
                className="inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-xs font-semibold text-text-tertiary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {tMono("shelfViewAll", { count: activeShelf.total })}<ArrowUpRight size={12} aria-hidden />
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {introBook ? (
        <ContentIntroModal
          isOpen
          onClose={() => setIntroBook(null)}
          contentId={introBook.contentId}
          contentTitle={introBook.title}
          contentCreator={introBook.creator}
          contentType="BOOK"
          contentThumbnail={introBook.thumbnail}
          fallbackDescription={introBook.description}
          fallbackMetadata={introBook.metadata}
          detailHref={`/content/${introBook.contentId}?category=book`}
        />
      ) : null}
    </>
  );
}
