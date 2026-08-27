import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getCelebSidePresence } from "@/actions/celebs/getCelebSidePresence";
import { getCelebTimelineEvents } from "@/actions/celebs/getCelebTimelineEvents";
import { getCelebExternalLinks } from "@/actions/celebs/getCelebExternalLinks";
import { getCelebJsonLdContents, getCelebDialogueFull } from "@/actions/celebs/getCelebJsonLdData";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { getContentBrief } from "@/actions/contents/getContentBrief";
import { getFictionSourcesForCeleb } from "@/actions/fiction/getFictionSources";
import { getDisplayDialogueQuote } from "@/lib/utils/celeb-dialogues";
import { resolveCelebWorld } from "@/lib/celeb/world";
import { getWorldBannerImages } from "@/lib/celeb/worldImages";
import CelebPageContent from "./CelebPageContent";
import RelatedFigureLinks from "./RelatedFigureLinks";
import CelebAffiliateBooks from "@/components/features/celeb/CelebAffiliateBooks";
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
export const revalidate = false;

// 수천 개 slug를 빌드 때 한꺼번에 생성하지 않고 첫 요청에 ISR로 만든다.
export function generateStaticParams() {
  return [];
}

// 서버에서 미리 그릴 서가 첫 화면 항목 수. 서재 훅의 기본 페이지 크기와 같아야
// 초기 HTML과 클라이언트 첫 페이지가 어긋나지 않는다.
const LIBRARY_FIRST_PAGE_SIZE = 4;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return buildCelebPageMetadata(locale, slug);
}

export default async function CelebPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

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
    tier: profile.celeb_tier,
  });
  const worldBannerImages = getWorldBannerImages(worldId);

  // 방명록은 캐시되지 않는 조회라 ISR HTML에 굳으면 7일간 새 글이 안 보인다.
  // 색인 가치도 없고 화면 맨 아래에 있어 클라이언트가 뷰포트 근접 시 직접 불러온다.
  // 관계·분석 구획의 본문은 브라우저가 화면 근처에서 직접 불러온다. 여기서는 목차가
  // 필요로 하는 「있다·없다」만 확인하고 자료 자체는 HTML에 싣지 않는다.
  const initialContentsPromise = profile.celeb_tier === 'full'
    ? getPublicUserContents({
        userId,
        page: 1,
        limit: LIBRARY_FIRST_PAGE_SIZE,
        sortBy: 'recent',
      }, locale)
    : Promise.resolve({
        items: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      });
  const initialContentBriefPromise = initialContentsPromise.then((contents) => {
    const firstContentId = contents.items[0]?.content_id;
    return firstContentId ? getContentBrief(firstContentId, locale) : null;
  });

  const [
    sidePresence,
    contentList,
    dialogueData,
    timelineEvents,
    initialContents,
    fictionSources,
    initialContentBrief,
    externalLinks,
  ] = await Promise.all([
    getCelebSidePresence({
      celebId: userId,
      tier: profile.celeb_tier,
    }),
    profile.celeb_tier === "full" ? getCelebJsonLdContents(userId) : Promise.resolve([]),
    getCelebDialogueFull(userId),
    getCelebTimelineEvents(userId, locale),
    // 서가 첫 화면을 서버에서 조회해 초기 HTML에 책·감상문 텍스트를 싣는다.
    // 셀럽은 항상 타인이므로 쿠키를 읽지 않는 공개 조회를 쓴다(unstable_cache 적중).
    initialContentsPromise,
    profile.celeb_tier === 'fiction'
      ? getFictionSourcesForCeleb(userId, locale)
      : Promise.resolve([]),
    initialContentBriefPromise,
    getCelebExternalLinks(profile.wikidata_qid, locale),
  ]);

  const pageTitle = buildCelebTitle(
    createCelebMetaInput(profile, fictionSources),
    locale,
  );

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
  };

  // 인연 목록과 세력 배정표는 관계 구획이 화면에 다가올 때 브라우저가 다시 받는다.
  // 화면에 그리지 않는 자료를 HTML에 실으면 ISR 한 장이 그만큼 무거워진다.
  const clientProfile = { ...profile, relations: [], factionTags: [] };

  const jsonLd = buildCelebPageJsonLd({
    profile,
    slug,
    locale,
    pageTitle,
    contents: contentList,
    fictionSources,
    externalLinks,
  });

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
        fictionSources={fictionSources}
        worldId={worldId}
        worldBannerImages={worldBannerImages}
        externalLinksSlot={
          <CelebExternalLinksServer
            links={externalLinks}
            name={profile.nickname}
          />
        }
      >
        {/* 관계 인물 링크 — 관계 그래프는 모달 전용이라 크롤러가 못 따라간다.
            서버가 이미 든 relations로 실제 링크를 세워 인물 상세끼리 잇는다 */}
        <RelatedFigureLinks
          displayName={
            locale === "en" && profile.nickname_en
              ? profile.nickname_en
              : profile.nickname
          }
          celebId={userId}
          profession={profile.profession}
          nationality={profile.nationality}
          birthDate={profile.birth_date}
          celebTier={profile.celeb_tier}
          relations={profile.relations}
        />
        {profile.celeb_tier === "full" && <CelebAffiliateBooks userId={userId} />}
      </CelebPageContent>
    </>
  );
}
