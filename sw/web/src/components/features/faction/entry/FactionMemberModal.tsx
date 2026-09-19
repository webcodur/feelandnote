/*
  파일명: /components/features/faction/entry/FactionMemberModal.tsx
  기능: 세력도감 인물 소개 모달
  책임: 카드를 누른 인물을 이 테마 안에서 소개한다 — 인물 상세와 같은 아바타 모듈(확대 보기·인사 음성), 테마·진영, 이름·직함,
        테마에서의 역할과 긴 소개, 가상독백(있는 인물만, 겹쳐 뜨는 읽기 모달). 아래에는 이 인물 관련 책과 이 인물이 읽은 책을 탭으로 나눠, 인물 상세 「참고도서」와 같은 공통 상품 목록으로 보인다.
        좁은 화면은 머리의 값(뱃지·이름·직함·역할·링크)을 가운데 두고, 긴 소개 본문만 왼쪽 정렬한다.
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Quote } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getPublicCelebContents } from "@/actions/contents/getUserContents";
import { getFigureBookPurchasePlatform, pickPurchaseEdition } from "@/actions/figure-books/figureBookLocale";
import { getFigureBooksForCeleb } from "@/actions/figure-books/getFigureBooks";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
import { getFactionLongDescs, type FactionLongDescs } from "@/actions/home/getFactionLongDescs";
import AffiliateBookList from "@/components/shared/AffiliateBookList";
import CelebProfileMedia from "@/components/shared/CelebProfileMedia";
import VirtualMonologueModal from "@/components/shared/VirtualMonologueModal";
import { FormattedText, splitReadableParagraphs } from "@/components/ui";
import CenteredSectionHeading from "@/components/ui/CenteredSectionHeading";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import Modal from "@/components/ui/Modal";
import { RetryBlock } from "@/components/ui/pending";
import { getBookStorePlatform } from "@/constants/affiliatePlatforms";
import { useCelebVirtualMonologue } from "@/hooks/useCelebVirtualMonologue";
import { useCelebVoice } from "@/hooks/useCelebVoice";
import { Link } from "@/i18n/navigation";
import { getEnglishBookAmazonUrl } from "@/lib/books/amazonBookSearch";
import { getCelebProfileUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";

/** 이 테마 안에서의 인물 정보 — 서버가 명단에서 만들어 넘긴다 */
export interface FactionMemberMeta {
  role: string | null;
  group: string | null;
}

interface MemberBooks {
  related: AffiliateBook[];
  read: AffiliateBook[];
}

interface FactionMemberModalProps {
  factionId: string;
  /** 화면 언어의 테마 이름 */
  factionName: string;
  celeb: CelebProfile;
  meta: FactionMemberMeta | undefined;
  onClose: () => void;
}

const BOOK_TABS = ["related", "read"] as const;
type BookTab = (typeof BOOK_TABS)[number];
/** 읽은 책은 모달에서 한 번에 받는 상한 — 더 보려면 인물 페이지로 간다 */
const READ_LIMIT = 60;

const httpsUrl = (value: unknown) => (typeof value === "string" && value.startsWith("https://") ? value : "");

export default function FactionMemberModal({ factionId, factionName, celeb, meta, onClose }: FactionMemberModalProps) {
  const t = useTranslations("explore.faction.member");
  const tBooks = useTranslations("popularBooks");
  const tCeleb = useTranslations("celebPage");
  const locale = useLocale() as Locale;
  const isEn = locale === "en";
  /** 판본에 붙은 구매 상품의 플랫폼(한국어 쿠팡·영어 아마존) — 판매 기준 서점과는 다르다 */
  const productPlatform = getFigureBookPurchasePlatform(locale) ?? "coupang";
  const platform = getBookStorePlatform(locale);
  const [longDescs, setLongDescs] = useState<{ factionId: string; byCeleb: FactionLongDescs } | null>(null);
  const [books, setBooks] = useState<MemberBooks | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<BookTab | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [monologueOpen, setMonologueOpen] = useState(false);
  // 가상독백 — 인물 단위로 따로 받고, 없는 인물은 단추를 두지 않는다
  const monologue = useCelebVirtualMonologue(celeb.id);

  const name = (isEn && celeb.nickname_en) || celeb.nickname;
  const title = (isEn && celeb.title_en) || celeb.title;
  const greeting = isEn ? (celeb.greeting_en ?? celeb.greeting) : celeb.greeting;

  // 인물 상세·인물 상세 모달과 같은 인사 음성 재생 — 음성이 없으면 인사 대사 자막만 띄운다
  const { canGreet, hasGreetingAudio, isVoiceActive, handleGreetingPlay } = useCelebVoice({
    profile: celeb,
    greeting,
    nickname: name,
    locale,
  });

  /* 긴 소개 — 테마 단위로 캐시된 묶음에서 꺼낸다. 못 받아도 모달의 나머지는 그대로다 */
  useEffect(() => {
    let alive = true;
    getFactionLongDescs(factionId)
      .then((byCeleb) => alive && setLongDescs({ factionId, byCeleb }))
      .catch((error) => {
        console.error("[FactionMemberModal] 긴 소개 조회 실패:", error);
        if (alive) setLongDescs({ factionId, byCeleb: {} });
      });
    return () => {
      alive = false;
    };
  }, [factionId]);

  /* 두 책 목록 — 모달을 열 때 함께 받아 공통 상품 목록의 책 자료로 맞춘다.
     한국어는 YES24가 찾을 ISBN 판본이 기준이고 쿠팡은 같은 판본의 보조 링크다.
     영문은 아마존 상품 주소가 없으면 제목·저자 검색으로 잇는다 */
  useEffect(() => {
    let alive = true;
    Promise.all([
      getFigureBooksForCeleb(celeb.id, locale),
      getPublicCelebContents({ userId: celeb.id, type: "BOOK", limit: READ_LIMIT }),
    ])
      .then(([figureBooks, readRecords]) => {
        if (!alive) return;
        const related = figureBooks
          .filter((book) => book.type === "BOOK")
          .map((book): AffiliateBook => {
            const edition = pickPurchaseEdition(book.editions, locale);
            const product = edition?.platform === productPlatform ? httpsUrl(edition.purchaseUrl) : "";
            const title = edition?.title || book.title;
            const creator = (edition?.creator ?? book.creator) || undefined;
            return {
              contentId: book.id,
              editionId: edition?.id,
              title,
              creator,
              thumbnail: (edition?.thumbnailUrl ?? book.thumbnailUrl) || undefined,
              url: isEn ? getEnglishBookAmazonUrl({ title, creator, url: product || null }) : product,
              // 고른 판본에 제목이 있으면 그 언어판이 확인된 것이라 「번역본 없음」만 거둔다 — 절판은 판본이 있어도 남긴다
              titleBadge: book.titleBadge === "out-of-print" || !edition?.title ? book.titleBadge : null,
            };
          });
        const seen = new Set<string>();
        const read = readRecords.items.flatMap((record): AffiliateBook[] => {
          if (seen.has(record.content_id)) return [];
          seen.add(record.content_id);
          return [{
            contentId: record.content_id,
            title: record.content.title,
            creator: record.content.creator || undefined,
            thumbnail: record.content.thumbnail_url || undefined,
            url: isEn
              ? getEnglishBookAmazonUrl({ title: record.content.title, creator: record.content.creator, url: httpsUrl(record.content.affiliate_url) || null })
              : httpsUrl(record.content.affiliate_url),
            titleBadge: record.content.title_badge,
          }];
        });
        setBooks({ related, read });
      })
      .catch((error) => {
        console.error("[FactionMemberModal] 책 목록 조회 실패:", error);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [celeb.id, isEn, locale, productPlatform, attempt]);

  const retry = () => {
    setFailed(false);
    setBooks(null);
    setAttempt((value) => value + 1);
  };

  const desc = longDescs?.byCeleb[celeb.id];
  const paragraphs = splitReadableParagraphs((isEn ? desc?.en : desc?.ko) ?? "");
  // 관련 책이 없고 읽은 책만 있으면 읽은 책부터 연다
  const activeTab: BookTab = tab ?? (books && books.related.length === 0 && books.read.length > 0 ? "read" : "related");
  const list = books?.[activeTab] ?? [];

  return (
    <Modal isOpen onClose={onClose} size="full">
      <article className="relative overflow-hidden bg-texture-noise px-4 pb-6 pt-12 sm:px-6 md:pt-8">
        {/* 무대 조명 — 위에서 금빛이 내려와 인물 머리를 비춘다 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(212,175,55,0.16),rgba(212,175,55,0.04)_45%,transparent_75%)] md:bg-[radial-gradient(ellipse_45%_100%_at_18%_0%,rgba(212,175,55,0.16),rgba(212,175,55,0.04)_45%,transparent_75%)]"
        />

        <div className="relative grid gap-5 md:grid-cols-[188px_minmax(0,1fr)] md:gap-8">
          {/* 격자 칸은 옆 칸(긴 소개)만큼 길어진다 — 늘이지 않게 위에 붙여야 고리가 세로 캡슐로 늘어나지 않는다 */}
          <div className="flex items-start justify-center md:justify-start">
            {/* 금빛 테두리 — 아바타 모듈은 그대로 쓰고 바깥에 고리만 두른다 */}
            <div className="h-fit self-start rounded-full bg-[linear-gradient(160deg,rgba(212,175,55,0.75),rgba(138,115,42,0.25)_55%,rgba(212,175,55,0.5))] p-[3px] shadow-glow">
              <CelebProfileMedia
                photoUrl={null}
                avatarUrl={celeb.avatar_url}
                nickname={name}
                onZoom={() => celeb.avatar_url && setZoomOpen(true)}
                zoomLabel={tCeleb("enlargePhoto")}
                hasVoice={hasGreetingAudio}
                isVoicePlaying={isVoiceActive}
                onGreet={canGreet ? handleGreetingPlay : undefined}
                greetLabel={hasGreetingAudio ? tCeleb("playGreetingVoice") : tCeleb("dialogue_greeting")}
                avatarSize="h-[140px] w-[140px] md:h-[182px] md:w-[182px]"
                initialSize="text-4xl"
                avatarAlignment="center"
              />
            </div>
          </div>

          <div className="min-w-0 text-center md:pe-8 md:pt-2 md:text-start">
            <div className="flex justify-center md:justify-start">
              <p className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent/40 bg-accent/[0.08] px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-accent md:text-xs">
                <span className="truncate">{factionName}</span>
                {meta?.group && (
                  <>
                    <span aria-hidden className="text-accent/50">◆</span>
                    <span className="truncate text-accent/80">{meta.group}</span>
                  </>
                )}
              </p>
            </div>

            <h2 className="mt-3 text-balance font-serif text-3xl font-black leading-tight md:text-4xl">
              <span className="text-3d-gold">{name}</span>
            </h2>
            {title && <p className="mt-1.5 text-sm tracking-wide text-text-secondary">{title}</p>}

            {meta?.role && (
              <p className="effect-engraved mx-auto mt-4 w-fit max-w-full break-keep rounded-lg border border-accent-dim/30 bg-black/30 px-4 py-2.5 text-[15px] font-semibold leading-6 text-accent md:mx-0">
                {meta.role}
              </p>
            )}

            {longDescs === null ? (
              <div className="mt-5 space-y-2" aria-hidden>
                <div className="h-3.5 w-full animate-pulse rounded bg-white/[0.07]" />
                <div className="h-3.5 w-11/12 animate-pulse rounded bg-white/[0.07]" />
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/[0.07]" />
              </div>
            ) : paragraphs.length > 0 && (
              <>
                <span aria-hidden className="mx-auto mt-5 block h-px w-12 bg-accent/50 md:mx-0" />
                {/* 본문은 좁은 화면에서도 왼쪽 정렬 */}
                <div className="mt-4 space-y-3 break-keep text-start text-sm leading-7 text-text-primary/80 md:text-[15px]">
                  {paragraphs.map((paragraph, index) => (
                    <p key={index}>
                      <FormattedText text={paragraph} />
                    </p>
                  ))}
                </div>
              </>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              {monologue && (
                <button
                  type="button"
                  onClick={() => setMonologueOpen(true)}
                  aria-haspopup="dialog"
                  className="effect-bevel inline-flex items-center gap-1.5 rounded-md border border-accent/45 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent outline-none hover:border-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Quote size={14} aria-hidden />
                  {tCeleb("virtualMonologue")}
                </button>
              )}
              <Link
                href={getCelebProfileUrl({ id: celeb.id, slug: celeb.slug })}
                prefetch={false}
                className="effect-bevel inline-flex items-center gap-1.5 rounded-md border border-accent/45 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent outline-none hover:border-accent hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t("profile")}
                <ArrowUpRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <section aria-label={t("shelf")} className="relative mt-8 border-t border-accent-dim/30 pt-6">
          <CenteredSectionHeading
            title={t("shelf")}
            className="mb-4"
          />
          <div className="flex justify-center">
            <div role="tablist" aria-label={t("books")} className="effect-engraved inline-flex rounded-full border border-accent-dim/40 bg-black/35 p-1">
              {BOOK_TABS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    activeTab === key
                      ? "effect-bevel bg-accent font-bold text-bg-secondary hover:bg-accent-hover"
                      : "text-text-secondary hover:bg-accent/10 hover:text-accent",
                  )}
                >
                  {t(key)}
                  {books && <span className="ms-1.5 text-xs font-medium tabular-nums opacity-70">{books[key].length}</span>}
                </button>
              ))}
            </div>
          </div>

          {failed ? (
            <RetryBlock onRetry={retry} className="mt-4" />
          ) : books === null ? (
            <ul className="mt-4 flex justify-center gap-3" aria-hidden>
              {Array.from({ length: 4 }, (_, index) => (
                <li key={index} className="aspect-[2/3] w-[144px] animate-pulse rounded-lg bg-white/[0.06] md:w-[180px]" />
              ))}
            </ul>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">{t(activeTab === "related" ? "emptyRelated" : "emptyRead")}</p>
          ) : (
            // 인물 상세 「참고도서」와 같은 공통 상품 목록 — 탭이 제목을 대신한다
            <AffiliateBookList
              books={list}
              heading={t(activeTab)}
              buyLabel={isEn ? tCeleb("sourceWorkBuyAmazon") : tBooks("buy")}
              platform={platform}
              hideHeading
            />
          )}
        </section>
      </article>

      {celeb.avatar_url && (
        <ImageViewerModal src={celeb.avatar_url} alt={name} isOpen={zoomOpen} onClose={() => setZoomOpen(false)} />
      )}
      {monologueOpen && monologue && (
        <VirtualMonologueModal name={name} text={monologue} onClose={() => setMonologueOpen(false)} nested />
      )}
    </Modal>
  );
}
