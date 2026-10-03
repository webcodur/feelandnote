/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 서버 페이지(데이터 조회·조립)
 * - 목차 위치: 공통 (전 구획 자료 준비)
 * - 데이터: getCelebBySlug/getCelebTimelineEvents/getFigureBookPresentations 등 서버액션
 * - 함께 보기: CelebPageContent.tsx, celebPageMetadata.ts, celebPageJsonLd.ts
 * ───────────────────────────────────────────── */
import { setRequestLocale } from "next-intl/server";
import { getCelebRouteProfile } from "@/lib/profile-route";
import type { CelebAnalysisData } from "@/actions/celebs/getCelebSideData";
import { getCelebSidePresence } from "@/actions/celebs/getCelebSidePresence";
import { getCelebTimelineEvents } from "@/actions/celebs/getCelebTimelineEvents";
import { getCelebExternalLinks } from "@/actions/celebs/getCelebExternalLinks";
import { getCelebDialogueFull } from "@/actions/celebs/getCelebJsonLdData";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { getCelebReferenceBooks } from "@/actions/celebs/getCelebReferenceBooks";
import { getContentBrief } from "@/actions/contents/getContentBrief";
import { CATEGORIES } from "@/constants/categories";
import { resolveCelebWorld } from "@/lib/celeb/world";
import { getWorldBannerImages } from "@/lib/celeb/worldImages";
import CelebPageContent from "./CelebPageContent";
import RelatedFigureLinks from "./RelatedFigureLinks";
import { buildCelebTitle } from "@/lib/celeb/meta";
import { buildCelebPageJsonLd, serializeJsonLd } from "./celebPageJsonLd";
import { createCelebMetaInput } from "./celebPageMetadata";
import CelebExternalLinksServer from "./CelebExternalLinksServer";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// 공개 본문은 항목별 데이터 캐시를 재사용하며 준비되는 대로 스트리밍한다.
// 로그인 의존 요소는 클라이언트에서 확인하고, 익명 완성 HTML은 Cloudflare가 재사용한다.

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
 * 본문급 자료는 이름을 남기고 오류를 올린다. 조회 실패를 정상 0건으로 캐시하지 않는다.
 * 공개 조회의 재시도는 `lib/cache.ts`가 맡는다.
 * ───────────────────────────────────────────── */
function named<T>(slug: string, name: string, promise: Promise<T>): Promise<T> {
  return promise.catch((error: unknown) => {
    console.error(`[celeb/${slug}] ${name} 조회 실패 — 이 하나로 인물 화면 전체가 서지 못한다:`, error);
    throw error;
  });
}

export default async function CelebPageBody({ params }: PageProps) {
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

  // 분석 계산은 화면에 가까워질 때 조회한다. 본문·감상문·관련 도서는 서버가 생성한다.
  const sidePresencePromise = getCelebSidePresence({ celebId: userId, reality: profile.celeb_reality });
  const initialAnalysisPromise = Promise.resolve<CelebAnalysisData | null>(null);
  const initialContentsPromise = profile.celeb_tier === 'full'
    ? getPublicUserContents({
        userId,
        type: CATEGORIES.find(category => profile.contentTypeCounts[category.dbType] > 0)?.dbType ?? "BOOK",
        page: 1,
        limit: LIBRARY_FIRST_PAGE_SIZE,
        sortBy: 'recent',
      }, locale)
    : Promise.resolve(EMPTY_CONTENTS);
  // 인물 상세와 도감 인물 모달은 같은 참고도서 조회를 쓴다.
  const referenceBooksPromise = getCelebReferenceBooks(userId, locale);
  const initialContentBriefPromise = initialContentsPromise.then((contents) => {
    const firstContentId = contents.items[0]?.content_id;
    return firstContentId ? getContentBrief(firstContentId, locale) : null;
  });
  const [
    sidePresence,
    dialogueData,
    timelineEvents,
    initialContents,
    referenceBooks,
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
    named(slug, "참고도서", referenceBooksPromise),
    initialContentBriefPromise,
    getCelebExternalLinks(profile.wikidata_qid, locale),
    initialAnalysisPromise.catch((error: unknown) => {
      // 부가 분석 장애로 인물 페이지 전체를 막지 않는다. 제자리의 수동 재시도로 복구한다.
      console.error(`[celeb/${slug}] 분석 첫 화면 조회 실패:`, error);
      return null;
    }),
  ]);

  const { appeared: figureBooks, authored: displayAuthoredBooks, professionBooks, factionGroups } = referenceBooks;
  const displayFigureBooks = figureBooks;
  // 참고도서 구획은 네 갈래 중 하나라도 차면 선다 — 티어·실존축과 무관하게 자료 유무만 본다
  const hasAffiliateBooks = figureBooks.length > 0
    || displayAuthoredBooks.length > 0
    || professionBooks.length > 0
    || factionGroups.some((group) => group.books.length > 0);

  const pageTitle = buildCelebTitle(
    createCelebMetaInput(profile, { sources: figureBooks }),
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

  const sideAvailability = {
    relations: profile.relations.length > 0,
    influence: sidePresence.influence,
    spectrum: sidePresence.spectrum,
    relatedFigures: profile.relations.length > 0,
    affiliateBooks: hasAffiliateBooks,
  };

  // 관계 목록은 초기 높이 계산과 모바일 목록에 재사용한다.
  // reading은 explanation에서 locale 해석을 마친 값이라 원문 explanation은
  // 클라이언트에서 쓰지 않고, dialogue는 머리말의 greeting만 따로 넘긴다.
  // 둘 다 본문급 텍스트라 RSC 직렬화에서 제외한다(서버 메타·JSON-LD는 profile 원본 사용).
  const clientProfile = {
    ...profile,
    relations: profile.relations,
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
        timelineEvents={timelineEvents}
        sideAvailability={sideAvailability}
        initialAnalysis={initialAnalysis}
        initialContents={initialContents}
        initialContentBrief={initialContentBrief ?? undefined}
        figureBooks={displayFigureBooks}
        authoredBooks={displayAuthoredBooks}
        factionGroups={factionGroups}
        professionBooks={professionBooks}
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
      />
    </>
  );
}
