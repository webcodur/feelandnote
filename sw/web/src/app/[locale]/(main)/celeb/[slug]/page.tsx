import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getCelebInfluence } from "@/actions/home/getCelebInfluence";
import { getSimilarByCelebId } from "@/actions/persona/getSimilarByCelebId";
import { getContemporaries } from "@/actions/celebs/getContemporaries";
import { getCelebTimelineEvents } from "@/actions/celebs/getCelebTimelineEvents";
import { getCelebJsonLdContents, getCelebDialogueFull } from "@/actions/celebs/getCelebJsonLdData";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { getPublicGuestbookEntries } from "@/actions/guestbook";
import { getFictionSourcesForCeleb } from "@/actions/fiction/getFictionSources";
import { getFactionTagsByIds } from "@/actions/home/getFeaturedTags";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { getAlternates, getCreativeWorkCreatorJsonLd, getSeoImageUrl } from "@/lib/seo";
import { flattenLocales } from "@/lib/utils/content-locale";
import { getCountryNameByLocale } from "@/lib/countries";
import { getDisplayDialogueQuote } from "@/lib/utils/celeb-dialogues";
import { resolveCelebWorld } from "@/lib/celeb/world";
import { getWorldBannerImages } from "@/lib/celeb/worldImages";
import { INDEXABLE_TIERS } from "@feelandnote/shared/constants/celeb-tiers";
import CelebPageContent from "./CelebPageContent";
import CelebAffiliateBooks from "@/components/features/celeb/CelebAffiliateBooks";
import {
  buildCelebTitleKo,
  buildCelebTitleEn,
  buildCelebDescriptionKo,
  buildCelebDescriptionEn,
  type CelebMetaInput,
} from "@/lib/celeb/meta";

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
  const result = await getCelebBySlug(slug, locale);

  if (!result.success || !result.data) {
    const t = await getTranslations("celebPage");
    return { title: t("notFound") };
  }

  const { nickname, title, contentTypeCounts, quotes, bio } = result.data;
  // 설명문에 그 사람의 한마디를 싣는다 — 1,257명이 같은 문장으로 나가던 것을 갈랐다
  const metaInput: CelebMetaInput = {
    nickname, title, counts: contentTypeCounts, quote: quotes, bio,
  };
  const pageTitle = locale === 'en' ? buildCelebTitleEn(metaInput) : buildCelebTitleKo(metaInput);
  const description = locale === 'en'
    ? buildCelebDescriptionEn(metaInput)
    : buildCelebDescriptionKo(metaInput);
  const alternates = getAlternates(
    `/celeb/${slug}`,
    locale === "en" ? "en" : "ko",
  );
  const canonicalUrl = alternates.canonical;
  const seoLocale = locale === "en" ? "en" : "ko";
  const seoImageUrl = getSeoImageUrl(
    "celeb",
    slug,
    seoLocale,
    result.data.avatar_url ?? result.data.photo_url,
  );
  const seoImageAlt = locale === "en"
    ? `${nickname} portrait`
    : `${nickname} 인물 이미지`;

  // full 등급만 색인 대상이다. light/fiction은 연결용 최소 등록이라
  // 본문이 얇아 색인되면 저품질 페이지로 잡힌다. 링크는 따라가도록 follow는 유지한다.
  // (사이트맵도 full 등급만 등재한다 — 같은 기준)
  const isIndexable = (INDEXABLE_TIERS as readonly string[]).includes(result.data.celeb_tier ?? 'full');

  return {
    title: pageTitle,
    description,
    robots: isIndexable ? undefined : { index: false, follow: true },
    alternates,
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      type: "profile",
      images: [{
        url: seoImageUrl,
        width: 800,
        height: 800,
        type: "image/png",
        alt: seoImageAlt,
      }],
    },
    twitter: {
      card: "summary",
      title: pageTitle,
      description,
      images: [{ url: seoImageUrl, alt: seoImageAlt }],
    },
  };
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
  const titleInput: CelebMetaInput = {
    nickname: profile.nickname, title: profile.title, counts: profile.contentTypeCounts,
  };
  const pageTitle = locale === 'en' ? buildCelebTitleEn(titleInput) : buildCelebTitleKo(titleInput);

  const [guestbookResult, influenceData, personaData, contentList, dialogueData, contemporaries, timelineEvents, factionTags, initialContents, fictionSources] = await Promise.all([
    getPublicGuestbookEntries({ profileId: userId }),
    getCelebInfluence(userId, locale),
    getSimilarByCelebId(userId, 3, locale),
    getCelebJsonLdContents(userId),
    getCelebDialogueFull(userId),
    profile.birth_date
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

  // JSON-LD 구조화 데이터: Person + ItemList
  const canonicalUrl = getAlternates(
    `/celeb/${slug}`,
    locale === "en" ? "en" : "ko",
  ).canonical;
  const personImageUrl = getSeoImageUrl(
    "celeb",
    slug,
    locale === "en" ? "en" : "ko",
    profile.avatar_url ?? profile.photo_url,
  );
  const wikidataQid = profile.wikidata_qid?.match(/^Q\d+$/)?.[0] ?? null;
  const alternateNames = [profile.nickname_ko, profile.nickname_en]
    .filter((name): name is string => Boolean(name && name !== profile.nickname));
  const contentItems = contentList.map((rawContent, idx) => {
    const flat = flattenLocales(rawContent.content_locales, locale);
    const schemaType = rawContent.type === 'BOOK' ? 'Book'
      : rawContent.type === 'VIDEO' ? 'Movie'
      : rawContent.type === 'MUSIC' ? 'MusicRecording'
      : rawContent.type === 'GAME' ? 'VideoGame'
      : 'CreativeWork';
    return {
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": schemaType,
        name: flat.title,
        url: getAlternates(
          `/content/${rawContent.id}`,
          locale === "en" ? "en" : "ko",
        ).canonical,
        ...getCreativeWorkCreatorJsonLd(rawContent.type, flat.creator),
      },
    };
  });

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${canonicalUrl}#person`,
      name: profile.nickname,
      ...(alternateNames.length > 0 && { alternateName: alternateNames }),
      ...(profile.bio && { description: profile.bio }),
      ...(profile.nationality && {
        nationality: getCountryNameByLocale(profile.nationality, locale),
      }),
      ...(profile.profession && { jobTitle: getCelebProfessionLabel(profile.profession, locale) }),
      ...(profile.birth_date && { birthDate: profile.birth_date }),
      ...(profile.death_date && { deathDate: profile.death_date }),
      ...(wikidataQid && {
        identifier: wikidataQid,
        sameAs: `https://www.wikidata.org/wiki/${wikidataQid}`,
      }),
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      image: personImageUrl,
    },
    ...(contentItems.length > 0
      ? [{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: pageTitle,
          numberOfItems: contentItems.length,
          itemListElement: contentItems,
        }]
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <CelebPageContent
        profile={profile}
        slug={slug}
        shareTitle={pageTitle}
        userId={userId}
        influenceData={influenceData}
        personaData={personaData}
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
      />

      {/* 제휴 도서 — 읽은 책·같은 직군·인기 순으로 물러나며 고른다. 영문 화면에서는 그리지 않는다 */}
      <CelebAffiliateBooks userId={userId} />
    </>
  );
}
