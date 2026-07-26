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
import { getGuestbookEntries } from "@/actions/guestbook";
import { getFactionTagPreviews } from "@/actions/home/getFeaturedTags";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { getLocalizedAlternates } from "@/lib/seo";
import { flattenLocales } from "@/lib/utils/content-locale";
import { INDEXABLE_TIERS } from "@feelandnote/shared/constants/celeb-tiers";
import CelebPageContent from "./CelebPageContent";
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
export const revalidate = 3600;

// 서버에서 미리 그릴 서가 첫 화면 항목 수. 서재 훅의 기본 페이지 크기와 같아야
// 초기 HTML과 클라이언트 첫 페이지가 어긋나지 않는다.
const LIBRARY_FIRST_PAGE_SIZE = 10;


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
  const canonicalUrl = `https://feelandnote.com/celeb/${slug}`;

  // full 등급만 색인 대상이다. light/relation/fiction은 연결용 최소 등록이라
  // 본문이 얇아 색인되면 저품질 페이지로 잡힌다. 링크는 따라가도록 follow는 유지한다.
  // (사이트맵도 full 등급만 등재한다 — 같은 기준)
  const isIndexable = (INDEXABLE_TIERS as readonly string[]).includes(result.data.celeb_tier ?? 'full');

  // OG 이미지는 opengraph-image.tsx에서 자동 생성 (Next.js file convention)
  return {
    title: pageTitle,
    description,
    robots: isIndexable ? undefined : { index: false, follow: true },
    alternates: await getLocalizedAlternates(`/celeb/${slug}`),
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
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
  const titleInput: CelebMetaInput = {
    nickname: profile.nickname, title: profile.title, counts: profile.contentTypeCounts,
  };
  const pageTitle = locale === 'en' ? buildCelebTitleEn(titleInput) : buildCelebTitleKo(titleInput);

  const [guestbookResult, influenceData, personaData, contentList, dialogueData, contemporaries, timelineEvents, factionPreviews, initialContents] = await Promise.all([
    getGuestbookEntries({ profileId: userId }),
    getCelebInfluence(userId),
    getSimilarByCelebId(userId, 3, locale),
    getCelebJsonLdContents(userId),
    getCelebDialogueFull(userId),
    profile.birth_date
      ? getContemporaries(userId, profile.birth_date, profile.death_date, locale)
      : Promise.resolve([]),
    getCelebTimelineEvents(userId, locale),
    getFactionTagPreviews(profile.factionTags.map((tag) => tag.id)),
    // 서가 첫 화면을 서버에서 조회해 초기 HTML에 책·감상문 텍스트를 싣는다.
    // 셀럽은 항상 타인이므로 쿠키를 읽지 않는 공개 조회를 쓴다(unstable_cache 적중).
    getPublicUserContents({
      userId,
      page: 1,
      limit: LIBRARY_FIRST_PAGE_SIZE,
      sortBy: 'recent',
    }),
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
        ).filter(([, v]) => Array.isArray(v))
      ) as Record<string, string[]>
    : null;

  // JSON-LD 구조화 데이터: Person + ItemList
  const canonicalUrl = `https://feelandnote.com/celeb/${slug}`;
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
        ...(flat.creator && { author: { "@type": "Person", name: flat.creator } }),
      },
    };
  });

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: profile.nickname,
      ...(profile.nationality && { nationality: profile.nationality }),
      ...(profile.profession && { jobTitle: getCelebProfessionLabel(profile.profession, locale) }),
      url: canonicalUrl,
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
        factionPreviews={factionPreviews}
        initialContents={initialContents}
      />
    </>
  );
}
