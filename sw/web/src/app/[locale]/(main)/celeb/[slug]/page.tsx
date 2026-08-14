import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getCelebInfluence } from "@/actions/home/getCelebInfluence";
import { getInfluenceExplorer } from "@/actions/home/getInfluenceExplorer";
import { getSimilarByCelebId } from "@/actions/spectrum/getSimilarByCelebId";
import { getContemporaries } from "@/actions/celebs/getContemporaries";
import { getCelebTimelineEvents } from "@/actions/celebs/getCelebTimelineEvents";
import { getCelebJsonLdContents, getCelebDialogueFull } from "@/actions/celebs/getCelebJsonLdData";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { getPublicGuestbookEntries } from "@/actions/guestbook";
import { getFictionSourcesForCeleb } from "@/actions/fiction/getFictionSources";
import { getFactionTagsByIds } from "@/actions/home/getFeaturedTags";
import { getDisplayDialogueQuote } from "@/lib/utils/celeb-dialogues";
import { resolveCelebWorld } from "@/lib/celeb/world";
import { getWorldBannerImages } from "@/lib/celeb/worldImages";
import CelebPageContent from "./CelebPageContent";
import CelebAffiliateBooks from "@/components/features/celeb/CelebAffiliateBooks";
import { buildCelebTitle } from "@/lib/celeb/meta";
import { buildCelebPageJsonLd, serializeJsonLd } from "./celebPageJsonLd";
import { buildCelebPageMetadata, createCelebMetaInput } from "./celebPageMetadata";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// 정적/ISR 렌더링: 로그인 의존 요소(방명록 본인 판정)를 클라이언트로 분리해
// 페이지 본문은 쿠키를 읽지 않는다. 봇 크롤이 HTML 캐시에 적중해 DB 조회가 발생하지 않는다.
// Next segment config는 import 상수가 아니라 정적 분석 가능한 숫자 리터럴이어야 한다.
export const revalidate = 604800;

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

  const [guestbookResult, influenceData, influenceExplorerData, spectrumData, contentList, dialogueData, contemporaries, timelineEvents, factionTags, initialContents, fictionSources] = await Promise.all([
    getPublicGuestbookEntries({ profileId: userId }),
    profile.celeb_tier === "fiction" ? Promise.resolve(null) : getCelebInfluence(userId, locale),
    profile.celeb_tier === "fiction" ? Promise.resolve(null) : getInfluenceExplorer(userId, locale),
    profile.celeb_tier === "fiction" ? Promise.resolve(null) : getSimilarByCelebId(userId, 3, locale),
    profile.celeb_tier === "full" ? getCelebJsonLdContents(userId) : Promise.resolve([]),
    getCelebDialogueFull(userId),
    profile.celeb_tier !== "fiction" && profile.birth_date
      ? getContemporaries(userId, profile.birth_date, profile.death_date, locale)
      : Promise.resolve([]),
    getCelebTimelineEvents(userId, locale),
    getFactionTagsByIds(profile.factionTags.map((tag) => tag.id)),
    // 서가 첫 화면을 서버에서 조회해 초기 HTML에 책·감상문 텍스트를 싣는다.
    // 셀럽은 항상 타인이므로 쿠키를 읽지 않는 공개 조회를 쓴다(unstable_cache 적중).
    profile.celeb_tier === 'full'
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
        }),
    profile.celeb_tier === 'fiction'
      ? getFictionSourcesForCeleb(userId, locale)
      : Promise.resolve([]),
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

  const jsonLd = buildCelebPageJsonLd({
    profile,
    slug,
    locale,
    pageTitle,
    contents: contentList,
    fictionSources,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

<CelebPageContent
        profile={profile}
        slug={slug}
        shareTitle={pageTitle}
        userId={userId}
        influenceData={influenceData}
        influenceExplorerData={influenceExplorerData}
        spectrumData={spectrumData}
        guestbookEntries={guestbookResult.entries}
        guestbookTotal={guestbookResult.total}
        greeting={greeting}
        dialogueLines={dialogueLines}
        contemporaries={contemporaries}
        timelineEvents={timelineEvents}
        factionTags={factionTags}
        initialContents={initialContents}
        fictionSources={fictionSources}
        worldId={worldId}
        worldBannerImages={worldBannerImages}
      >
        {profile.celeb_tier === "full" && <CelebAffiliateBooks userId={userId} />}
      </CelebPageContent>
    </>
  );
}
