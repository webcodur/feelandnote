/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 서버 페이지(데이터 조회·조립)
 * - 목차 위치: 공통 (전 구획 자료 준비)
 * - 데이터: getCelebBySlug/getCelebTimelineEvents/getFigureBookPresentations 등 서버액션
 * - 함께 보기: CelebPageContent.tsx, celebPageMetadata.ts, celebPageJsonLd.ts
 * ───────────────────────────────────────────── */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getCelebSidePresence } from "@/actions/celebs/getCelebSidePresence";
import { getCelebTimelineEvents } from "@/actions/celebs/getCelebTimelineEvents";
import { getCelebExternalLinks } from "@/actions/celebs/getCelebExternalLinks";
import { getCelebDialogueFull } from "@/actions/celebs/getCelebJsonLdData";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { getContentBrief } from "@/actions/contents/getContentBrief";
import { getFigureBookPresentationsForCeleb } from "@/actions/figure-books/getFigureBookPresentations";
import { getDisplayDialogueQuote } from "@/lib/utils/celeb-dialogues";
import { resolveCelebWorld } from "@/lib/celeb/world";
import { getWorldBannerImages } from "@/lib/celeb/worldImages";
import CelebPageContent from "./CelebPageContent";
import RelatedFigureLinks from "./RelatedFigureLinks";
import CelebAffiliateBooks from "@/components/features/celeb/CelebAffiliateBooks";
import { mapRelatedFigureBooksToAffiliateBooks } from "@/components/features/celeb/CelebRelatedAffiliateBooks";
import { partitionFigureBooks } from "@/lib/celeb/authoredBooks";
import { buildCelebTitle } from "@/lib/celeb/meta";
import { buildCelebPageJsonLd, serializeJsonLd } from "./celebPageJsonLd";
import { buildCelebPageMetadata, createCelebMetaInput } from "./celebPageMetadata";
import CelebExternalLinksServer from "./CelebExternalLinksServer";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// 정적/ISR 렌더링: 로그인 의존 요소(방명록 본인 판정)를 클라이언트로 분리해
// 페이지 본문은 쿠키를 읽지 않는다. 봇 크롤이 HTML 캐시에 적중해 DB 조회가 발생하지 않는다.
// Next segment config는 import 상수가 아니라 정적 분석 가능한 숫자 리터럴이어야 한다.
// segment 자체는 시간 재검증을 강제하지 않는다. 다만 초기 렌더가 소비하는 숫자형
// unstable_cache 안전망(STATIC_REVALIDATE, 키별 spread)이 실제 route TTL의 상한을 약 1주로 둔다.
// 데이터가 바뀌면 DB 트리거(web_revalidate_trigger)가 그 항목 태그를 즉시 비워 다음 방문 때만
// 다시 만든다 — 백오피스·스크립트·SQL 어느 길로 쓰든 같다.
// 상세 한 장의 ISR 쓰기는 HTML+RSC 0.25~0.55MB(8KB당 1단위)라 짧은 주기로 전량 재생성하면 곧 돈이다.
/* ── 1. ISR·메타데이터 ── */
export const revalidate = false;

// 수천 개 slug를 빌드 때 한꺼번에 생성하지 않고 첫 요청에 ISR로 만든다.
export function generateStaticParams() {
  return [];
}

// 서버에서 미리 그릴 서가 첫 화면 항목 수. 펼쳐보기가 색인을 받기 전까지
// 첫 카드와 이전·다음 상태를 이 항목들로 그린다.
const LIBRARY_FIRST_PAGE_SIZE = 4;

// 서가를 못 불러왔거나 서가가 없는 티어일 때 쓰는 빈 결과.
const EMPTY_CONTENTS = {
  items: [],
  total: 0,
  page: 1,
  totalPages: 0,
  hasMore: false,
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return buildCelebPageMetadata(locale, slug);
}

/* ─────────────────────────────────────────────
 * 조회 실패를 어느 등급에서 받을 것인가
 *
 * 아래 조회들은 서로 기다릴 이유가 없어 함께 띄운다(하나씩 await로 바꾸면 그만큼 느려진다).
 * 다만 Promise.all은 가장 먼저 깨진 것만 올려 보내므로, 예전에는 목차에 줄 하나 넣을지
 * 정하는 조회가 미끄러져도 인물 화면 전체가 500이 됐다. 등급을 나눠 그것부터 끊는다.
 *
 * 없어도 화면이 온전한 자료(`optional`)는 대체값으로 넘겨 페이지를 세운다.
 * 본문급 자료(`required`)는 이름만 남기고 그대로 던진다 — 빈 채로 굳는 편이 더 나쁘다.
 * 이 장은 ISR이라 한 번 만들어지면 만료까지 재사용되고, 그 사이 그 구획은 화면에서
 * 통째로 사라진다(에러 화면도 안내도 없다). 실패한 렌더만 캐시에서 되돌리는 길은 없다 —
 * 정적 렌더 안에서는 `revalidateTag`를 부를 수 없고, `after()`로 미뤄도 Next가
 * "Dynamic server usage"로 막는다(26.09.12 프로덕션 빌드로 실측). 그래서 본문급은
 * 던져서 이 장이 아예 캐시에 남지 않게 두고, `lib/cache.ts`의 재시도가 앞을 막는다.
 * ───────────────────────────────────────────── */

/** 없어도 화면이 온전한 자료 — 실패를 그 구획 안에 가둔다. */
async function optional<T>(slug: string, name: string, run: () => Promise<T>, fallback: T): Promise<T> {
  // try/catch가 아니라 allSettled를 쓴다 — JSX를 try 안에서 만들면 React가 나중에 그려 잡히지 않는다.
  const [settled] = await Promise.allSettled([run()]);
  if (settled.status === "fulfilled") return settled.value;
  console.error(`[celeb/${slug}] ${name} 조회 실패 — 그 구획만 비우고 화면은 내보낸다:`, settled.reason);
  return fallback;
}

/** 본문급 자료 — 어느 조회였는지 남기고 그대로 던진다. */
function required<T>(slug: string, name: string, promise: Promise<T>): Promise<T> {
  return promise.catch((error: unknown) => {
    console.error(`[celeb/${slug}] ${name} 조회 실패 — 본문이라 이 장을 만들지 않고 다음 방문에 다시 시도한다:`, error);
    throw error;
  });
}

export default async function CelebPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  /* ── 2. 서버 데이터 조회 ── */
  const result = await getCelebBySlug(slug, locale);
  if (!result.success || !result.data) {
    notFound();
  }
  const profile = result.data;
  const userId = profile.id;
  const worldId = resolveCelebWorld({
    nationality: profile.nationality,
    birthDate: profile.birth_date,
    deathDate: profile.death_date,
    reality: profile.celeb_reality,
  });
  const worldBannerImages = getWorldBannerImages(worldId);

  // 방명록은 캐시되지 않는 조회라 ISR HTML에 굳으면 7일간 새 글이 안 보인다.
  // 색인 가치도 없고 화면 맨 아래에 있어 클라이언트가 뷰포트 근접 시 직접 불러온다.
  // 관계·분석 구획의 본문은 브라우저가 화면 근처에서 직접 불러온다. 여기서는 목차가
  // 필요로 하는 「있다·없다」만 확인하고 자료 자체는 HTML에 싣지 않는다.
  const initialContentsPromise = profile.celeb_tier === 'full'
    ? getPublicUserContents({
        userId,
        type: "BOOK",
        page: 1,
        limit: LIBRARY_FIRST_PAGE_SIZE,
        sortBy: 'recent',
      }, locale)
    : Promise.resolve(EMPTY_CONTENTS);
  const initialContentBriefPromise = initialContentsPromise.then((contents) => {
    const firstContentId = contents.items[0]?.content_id;
    return firstContentId ? getContentBrief(firstContentId, locale) : null;
  });
  // 페이지末 관련 상품은 서버에서 미리 싣지 않는다. 그 조회만 수명이 한 시간이라
  // (풀에 태그를 못 달아 시간 만료로만 새 후보를 흡수한다) 초기 렌더가 그것을 쓰면
  // Next가 인물 상세 한 장의 수명을 통째로 한 시간으로 끌어내렸다. 본문·연표·서가까지
  // 한 시간마다 다시 만들어지던 원인이다. 화면 맨 아래 구획이라 스크롤해야 보이므로
  // 브라우저가 근접했을 때 직접 불러온다.
  const [
    sidePresence,
    dialogueData,
    timelineEvents,
    initialContents,
    allFigureBooks,
    initialContentBrief,
    externalLinks,
  ] = await Promise.all([
    // 목차에 「영향력」·「성향」 줄을 넣을지 정하는 불리언 둘뿐이다. 구획 본문은 브라우저가
    // 따로 불러오므로, 이것 때문에 인물 화면을 잃을 이유가 없다.
    optional(slug, "목차 가용도", () => getCelebSidePresence({
      celebId: userId,
      reality: profile.celeb_reality,
    }), { influence: false, spectrum: false }),
    // 아래 넷은 본문이다. 비면 페이지가 껍데기가 되므로 만들지 않는 편이 낫다.
    required(slug, "대사", getCelebDialogueFull(userId)),
    required(slug, "연표", getCelebTimelineEvents(userId, locale)),
    // 서가 첫 화면을 서버에서 조회해 초기 HTML에 책·감상문 텍스트를 싣는다.
    // 셀럽은 항상 타인이므로 쿠키를 읽지 않는 공개 조회를 쓴다(unstable_cache 적중).
    required(slug, "서가", initialContentsPromise),
    required(slug, "등장 작품", getFigureBookPresentationsForCeleb(userId, locale)),
    // 첫 작품 소개는 이미 자기 안에서 실패를 받아 null로 넘긴다(getContentBrief).
    initialContentBriefPromise,
    // 위키데이터에 딸린 바깥 링크다. 없으면 그 줄만 빠진다.
    optional(slug, "외부 링크", () => getCelebExternalLinks(profile.wikidata_qid, locale), []),
  ]);

  // 창작(authored)은 「창작」 탭에, 연관(related)만 아래 상품 구획으로 보낸다.
  const { appearanceBooks, authoredBooks, relatedBooks } = partitionFigureBooks(allFigureBooks);
  const figureBooks = appearanceBooks.filter((book) => book.editions.length > 0);
  const authoredIds = authoredBooks.map((book) => book.id);
  // 추천 상품 조회는 후보가 없으면 「많이 읽힌 책」까지 내려가 채우므로 full+한국어는
  // 사실상 항상 결과가 있다. 목차는 그 전제로 자리를 잡고, 실제로 비면 구획이 스스로 숨는다.
  const hasAffiliateBooks = mapRelatedFigureBooksToAffiliateBooks(relatedBooks, locale).length > 0
    || (profile.celeb_tier === 'full' && locale === 'ko');

  const pageTitle = buildCelebTitle(
    createCelebMetaInput(profile, figureBooks),
    locale,
  );

  /* ── 3. 대사 정규화·가용도 ── */
  const greetingFromLines = (lines: Record<string, string[] | string> | null | undefined) => {
    const v = lines?.greeting;
    return Array.isArray(v) ? v : null;
  };
  const greeting = locale === 'en'
    ? (greetingFromLines(dialogueData?.lines_en) ?? greetingFromLines(dialogueData?.lines))
    : greetingFromLines(dialogueData?.lines);
  const rawLines = locale === 'en' && dialogueData?.lines_en
    ? dialogueData.lines_en
    : dialogueData?.lines ?? null;
  // quote(string)를 배열로 정규화하여 대사 데이터에 통합
  const dialogueLines = rawLines
    ? Object.fromEntries(
        Object.entries(rawLines).map(([k, v]) =>
          [k, typeof v === "string" ? [v] : v]
        ).filter(([key, value]) =>
          Array.isArray(value)
          && (key !== "quote" || getDisplayDialogueQuote(value[0]) !== null)
        )
      ) as Record<string, string[]>
    : null;

  const sideAvailability = {
    relations: profile.relations.length > 0,
    faction: profile.factionTags.length > 0,
    influence: sidePresence.influence,
    spectrum: sidePresence.spectrum,
    relatedFigures: profile.relations.length > 0,
    affiliateBooks: hasAffiliateBooks,
  };

  // 관계 목록과 세력 배정표는 관계 구획이 화면에 다가올 때 브라우저가 다시 받는다.
  // 화면에 그리지 않는 자료를 HTML에 실으면 ISR 한 장이 그만큼 무거워진다.
  // reading은 explanation에서 locale 해석을 마친 값이라 원문 explanation은
  // 클라이언트에서 쓰지 않고, dialogue도 dialogueLines prop으로 따로 넘긴다.
  // 둘 다 본문급 텍스트라 RSC 직렬화에서 제외한다(서버 메타·JSON-LD는 profile 원본 사용).
  const clientProfile = {
    ...profile,
    relations: [],
    factionTags: [],
    explanation: null,
    dialogue: null,
  };

  const jsonLd = buildCelebPageJsonLd({
    profile,
    slug,
    locale,
    pageTitle,
    contents: initialContents.items,
    figureBooks,
    externalLinks,
  });

  /* ── 4. 렌더 ── */
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <CelebPageContent
        profile={clientProfile}
        slug={slug}
        shareTitle={pageTitle}
        userId={userId}
        greeting={greeting}
        dialogueLines={dialogueLines}
        timelineEvents={timelineEvents}
        sideAvailability={sideAvailability}
        initialContents={initialContents}
        initialContentBrief={initialContentBrief ?? undefined}
        figureBooks={figureBooks}
        authoredBooks={authoredBooks}
        worldId={worldId}
        worldBannerImages={worldBannerImages}
        externalLinksSlot={
          <CelebExternalLinksServer
            links={externalLinks}
            name={profile.nickname}
          />
        }
        relatedFiguresSlot={
          /* 관계 인물 링크 — 관계 그래프는 모달 전용이라 크롤러가 못 따라간다.
             서버가 이미 든 relations로 실제 링크를 세워 인물 상세끼리 잇는다 */
          <RelatedFigureLinks
            celebId={userId}
            profession={profile.profession}
            nationality={profile.nationality}
            birthDate={profile.birth_date}
            celebReality={profile.celeb_reality}
            relations={profile.relations}
          />
        }
        affiliateBooksSlot={
          /* 연관 도서는 티어와 무관하게 하단 상품에 표시한다. */
          hasAffiliateBooks ? (
            <CelebAffiliateBooks
              userId={userId}
              relatedBooks={relatedBooks}
              excludeContentIds={authoredIds}
              hideHeading
            />
          ) : undefined
        }
      />
    </>
  );
}
