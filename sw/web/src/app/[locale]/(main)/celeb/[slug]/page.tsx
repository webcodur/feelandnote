/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 서버 페이지(데이터 조회·조립)
 * - 목차 위치: 공통 (전 구획 자료 준비)
 * - 데이터: getCelebBySlug/getCelebTimelineEvents/getFigureBookPresentations 등 서버액션
 * - 함께 보기: CelebPageContent.tsx, celebPageMetadata.ts, celebPageJsonLd.ts
 * ───────────────────────────────────────────── */
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getCelebRouteProfile } from "@/lib/profile-route";
import { getCelebInitialAnalysis } from "@/actions/celebs/getCelebSideData";
import { getCelebSidePresence } from "@/actions/celebs/getCelebSidePresence";
import { getCelebTimelineEvents } from "@/actions/celebs/getCelebTimelineEvents";
import { getCelebExternalLinks } from "@/actions/celebs/getCelebExternalLinks";
import { getCelebDialogueFull } from "@/actions/celebs/getCelebJsonLdData";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { getCelebReadShelf } from "@/actions/celebs/getCelebReferenceBooks";
import { getContentBrief } from "@/actions/contents/getContentBrief";
import { getFigureBookPresentationsForCeleb } from "@/actions/figure-books/getFigureBookPresentations";
import { getDisplayDialogueQuote } from "@/lib/utils/celeb-dialogues";
import { resolveCelebWorld } from "@/lib/celeb/world";
import { getWorldBannerImages } from "@/lib/celeb/worldImages";
import CelebPageContent from "./CelebPageContent";
import RelatedFigureLinks from "./RelatedFigureLinks";
import CelebAffiliateBooks from "@/components/features/celeb/CelebAffiliateBooks";
import type { AffiliateBook } from "@/actions/home/getAffiliateBooks";
import {
  mapRelatedFigureBooksToAffiliateBooks,
} from "@/components/features/celeb/CelebRelatedAffiliateBooks";
import { getDisplayFigureBookGroups } from "@/lib/celeb/authoredBooks";
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
 * 조회 실패를 어디서 받는가
 *
 * 아래 조회들은 서로 기다릴 이유가 없어 함께 띄운다(하나씩 await로 바꾸면 그만큼 느려진다).
 * 다만 Promise.all은 가장 먼저 깨진 것만 올려 보내고 어느 조회였는지 남기지 않는다.
 *
 * 없어도 화면이 온전한 자료는 **액션이 자기 안에서** 받는다 — 목차 가용도는
 * `withQueryFallback`으로, 외부 링크는 위키데이터 링크 한 줄로 되돌아온다. 그쪽이 이미
 * 보증하므로 여기서 다시 감싸지 않는다(`lib/cache.ts`의 「캐시 안에서 던지고 공개 함수에서
 * 받는다」가 그 규칙이다).
 *
 * 남은 본문급 자료는 여기서 이름만 남기고 그대로 던진다. 빈 채로 굳는 편이 더 나쁘기
 * 때문이다 — 이 장은 ISR이라 한 번 만들어지면 만료까지 재사용되고, 그 사이 그 구획은
 * 에러 화면도 안내도 없이 화면에서 사라진다. 실패한 렌더만 캐시에서 되돌리는 길은 없다:
 * 정적 렌더 안에서는 `revalidateTag`를 부를 수 없고 `after()`로 미뤄도 Next가
 * "Dynamic server usage"로 막는다(26.09.12 프로덕션 빌드로 실측하고 폐기했다).
 * 그래서 던져서 이 장을 캐시에 남기지 않고, `lib/cache.ts`의 재시도가 앞을 막는다.
 * ───────────────────────────────────────────── */
function named<T>(slug: string, name: string, promise: Promise<T>): Promise<T> {
  return promise.catch((error: unknown) => {
    console.error(`[celeb/${slug}] ${name} 조회 실패 — 이 하나로 인물 화면 전체가 서지 못한다:`, error);
    throw error;
  });
}

export default async function CelebPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  /* ── 2. 서버 데이터 조회 ── */
  const profile = await getCelebRouteProfile(slug, locale);
  const userId = profile.id;
  const worldId = resolveCelebWorld({
    nationality: profile.nationality,
    birthDate: profile.birth_date,
    deathDate: profile.death_date,
    reality: profile.celeb_reality,
  });
  const worldBannerImages = getWorldBannerImages(worldId);

  // 첫 분석 탭은 초기 HTML에 배치한다. 숨겨진 탭과 방명록은 사용자 선택 때 조회한다.
  const sidePresencePromise = getCelebSidePresence({ celebId: userId, reality: profile.celeb_reality });
  const initialAnalysisPromise = sidePresencePromise.then((presence) =>
    getCelebInitialAnalysis(userId, locale, presence),
  );
  const initialContentsPromise = profile.celeb_tier === 'full'
    ? getPublicUserContents({
        userId,
        type: "BOOK",
        page: 1,
        limit: LIBRARY_FIRST_PAGE_SIZE,
        sortBy: 'recent',
      }, locale)
    : Promise.resolve(EMPTY_CONTENTS);
  // 「감상」 선반은 기록 속 책을 상품 카드로 모으는데, 판매 불가 책(미번역·절판)은 뺀다 —
  // 한 쪽이 전부 빠져도 다음 쪽으로 채우고, 그 뒤는 클라이언트의 「더 보기」가 같은 방식으로 잇는다.
  const readShelfPromise = profile.celeb_tier === 'full'
    ? getCelebReadShelf(userId, locale)
    : Promise.resolve({ books: [] as AffiliateBook[], nextPage: 1, hasMore: false });
  const initialContentBriefPromise = initialContentsPromise.then((contents) => {
    const firstContentId = contents.items[0]?.content_id;
    return firstContentId ? getContentBrief(firstContentId, locale) : null;
  });
  // 시간 단위로 갱신되는 추가 추천은 사용자가 요청할 때 조회한다.
  // 초기 렌더에 섞어 인물 상세 전체의 ISR 수명을 한 시간으로 줄이지 않는다.
  const [
    sidePresence,
    dialogueData,
    timelineEvents,
    initialContents,
    readShelf,
    allFigureBooks,
    initialContentBrief,
    externalLinks,
    initialAnalysis,
  ] = await Promise.all([
    // 목차 가용도·외부 링크·작품 소개는 액션이 자기 안에서 실패를 받는다 — 이름표가 필요 없다.
    sidePresencePromise,
    named(slug, "대사", getCelebDialogueFull(userId)),
    named(slug, "연표", getCelebTimelineEvents(userId, locale)),
    // 서가 첫 화면을 서버에서 조회해 초기 HTML에 책·감상문 텍스트를 싣는다.
    // 셀럽은 항상 타인이므로 쿠키를 읽지 않는 공개 조회를 쓴다(unstable_cache 적중).
    named(slug, "서가", initialContentsPromise),
    named(slug, "감상 선반", readShelfPromise),
    named(slug, "등장 작품", getFigureBookPresentationsForCeleb(userId, locale)),
    initialContentBriefPromise,
    getCelebExternalLinks(profile.wikidata_qid, locale),
    initialAnalysisPromise.catch((error: unknown) => {
      // 부가 분석 장애로 인물 페이지 전체를 막지 않는다. 제자리의 수동 재시도로 복구한다.
      console.error(`[celeb/${slug}] 분석 첫 화면 조회 실패:`, error);
      return null;
    }),
  ]);

  // 직접 등장과 간접 연관은 「등장」 모드에 함께, 창작은 「집필」 모드에 보낸다.
  const { appeared: figureBooks, authored: displayAuthoredBooks } = getDisplayFigureBookGroups(allFigureBooks);
  const displayFigureBooks = figureBooks;
  const readBooks = readShelf.books;
  // 추천 상품 조회는 후보가 없으면 「많이 읽힌 책」까지 내려가 채우므로 full 인물은
  // 사실상 항상 결과가 있다(한국어 YES24·영어 아마존 검색). 목차는 그 전제로 자리를 잡고, 실제로 비면 구획이 스스로 숨는다.
  const hasAffiliateBooks = mapRelatedFigureBooksToAffiliateBooks(figureBooks, locale).length > 0
    || profile.celeb_tier === 'full';

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
    faction: profile.factions.some((tag) => !tag.isMyth),
    influence: sidePresence.influence,
    spectrum: sidePresence.spectrum,
    relatedFigures: profile.relations.length > 0,
    affiliateBooks: hasAffiliateBooks,
  };

  // 관계 목록은 초기 높이 계산과 모바일 목록에 재사용한다. 세력 상세는 탭 선택 때 받는다.
  // reading은 explanation에서 locale 해석을 마친 값이라 원문 explanation은
  // 클라이언트에서 쓰지 않고, dialogue도 dialogueLines prop으로 따로 넘긴다.
  // 둘 다 본문급 텍스트라 RSC 직렬화에서 제외한다(서버 메타·JSON-LD는 profile 원본 사용).
  const clientProfile = {
    ...profile,
    relations: profile.relations,
    factions: [],
    explanation: null,
    dialogue: null,
  };

  const jsonLd = buildCelebPageJsonLd({
    profile,
    slug,
    locale,
    pageTitle,
    // 펼쳐보기의 초기 본문은 첫 작품만 출력한다. 미리 가져온 다음 작품을 구조화 데이터로 앞서 선언하지 않는다.
    contents: initialContents.items.slice(0, 1),
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
        initialAnalysis={initialAnalysis}
        initialContents={initialContents}
        initialContentBrief={initialContentBrief ?? undefined}
        figureBooks={displayFigureBooks}
        authoredBooks={displayAuthoredBooks}
        readBooks={readBooks}
        readBooksNextPage={readShelf.nextPage}
        readBooksHasMore={readShelf.hasMore}
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
          /* 등장·집필 작품은 위의 작품 목록이 직접 보여 주므로 여기는 추천 도서만 이어 붙인다. */
          hasAffiliateBooks ? (
            <CelebAffiliateBooks
              userId={userId}
              excludeContentIds={[
                ...allFigureBooks.map((book) => book.id),
                /* 읽은 책은 「감상」 선반이 직접 보여 주므로 추천에서 뺀다 */
                ...readBooks.map((book) => book.contentId),
              ]}
              hideHeading
            />
          ) : undefined
        }
      />
    </>
  );
}
