import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getSimilarByCelebId } from "@/actions/persona/getSimilarByCelebId";
import { getContemporaries } from "@/actions/celebs/getContemporaries";
import { getCelebJsonLdContents, getCelebDialogueFull } from "@/actions/celebs/getCelebJsonLdData";
import { getGuestbookEntries } from "@/actions/guestbook";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { getAlternates } from "@/lib/seo";
import { flattenLocales } from "@/lib/utils/content-locale";
import CelebPageContent from "./CelebPageContent";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// 정적/ISR 렌더링: 로그인 의존 요소(방명록 본인 판정)를 클라이언트로 분리해
// 페이지 본문은 쿠키를 읽지 않는다. 봇 크롤이 HTML 캐시에 적중해 DB 조회가 발생하지 않는다.
export const revalidate = 3600;

// SEO h1/description 생성
/** 마지막 글자의 받침 유무로 '이/가' 반환 */
function subjectParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  // 한글 범위(0xAC00~0xD7A3) 밖이면 '이'로 폴백
  if (last < 0xac00 || last > 0xd7a3) return "이";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

function buildPageTitle(
  nickname: string,
  title: string | null,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const prefix = title ?? '';
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`추천 책 ${counts.BOOK}권`);
  if (counts.VIDEO > 0) parts.push(`추천 영화 ${counts.VIDEO}편`);
  if (counts.MUSIC > 0) parts.push(`추천 음악 ${counts.MUSIC}곡`);
  if (counts.GAME > 0) parts.push(`추천 게임 ${counts.GAME}개`);

  if (parts.length === 0) {
    return `${prefix} ${nickname} 추천 책·영화·음악`.trim();
  }
  return `${prefix} ${nickname} ${parts.join(", ")}`.trim();
}

function buildPageTitleEn(
  nickname: string,
  title: string | null,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const prefix = title ?? '';
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`${counts.BOOK} recommended books`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO} favorite movies`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC} favorite songs`);
  if (counts.GAME > 0) parts.push(`${counts.GAME} favorite games`);

  if (parts.length === 0) {
    return `${prefix} ${nickname}'s Recommended Books & Movies`.trim();
  }
  return `${prefix} ${nickname}: ${parts.join(", ")}`.trim();
}

function buildMetaDescriptionEn(
  nickname: string,
  title: string | null,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const prefix = title ?? '';
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`${counts.BOOK} recommended books`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO} favorite movies`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC} favorite songs`);
  if (counts.GAME > 0) parts.push(`${counts.GAME} favorite games`);

  if (parts.length === 0) {
    return `Discover ${prefix} ${nickname}'s book recommendations, favorite movies, music, and cultural journey on Feel&Note.`.replace(/  +/g, ' ');
  }
  return `${prefix} ${nickname}'s ${parts.join(", ")}. Explore their cultural taste, cultural journey, and personal recommendations.`.replace(/  +/g, ' ');
}

/** 120~160자 분량의 SEO description 생성 */
function buildMetaDescription(
  nickname: string,
  title: string | null,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const prefix = title ?? '';
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`추천 책 ${counts.BOOK}권`);
  if (counts.VIDEO > 0) parts.push(`추천 영화 ${counts.VIDEO}편`);
  if (counts.MUSIC > 0) parts.push(`추천 음악 ${counts.MUSIC}곡`);
  if (counts.GAME > 0) parts.push(`추천 게임 ${counts.GAME}개`);

  if (parts.length === 0) {
    return `${prefix} ${nickname}${subjectParticle(nickname)} 추천한 책, 영화, 음악, 게임 목록과 감상 여정. ${nickname}의 문화적 취향과 영감의 원천을 탐색하세요.`.trim();
  }

  return `${prefix} ${nickname}의 ${parts.join(", ")} 목록. ${nickname}${subjectParticle(nickname)} 직접 추천하거나 즐겨본 작품과 감상 여정을 확인하세요.`.trim();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const result = await getCelebBySlug(slug, locale);

  if (!result.success || !result.data) {
    const t = await getTranslations("celebPage");
    return { title: t("notFound") };
  }

  const { nickname, title, contentTypeCounts } = result.data;
  const pageTitle = locale === 'en'
    ? buildPageTitleEn(nickname, title, contentTypeCounts)
    : buildPageTitle(nickname, title, contentTypeCounts);
  const description = locale === 'en'
    ? buildMetaDescriptionEn(nickname, title, contentTypeCounts)
    : buildMetaDescription(nickname, title, contentTypeCounts);
  const canonicalUrl = `https://feelandnote.com/celeb/${slug}`;

  // OG 이미지는 opengraph-image.tsx에서 자동 생성 (Next.js file convention)
  return {
    title: pageTitle,
    description,
    alternates: getAlternates(`/celeb/${slug}`),
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
  const pageTitle = locale === 'en'
    ? buildPageTitleEn(profile.nickname, profile.title, profile.contentTypeCounts)
    : buildPageTitle(profile.nickname, profile.title, profile.contentTypeCounts);

  const [guestbookResult, personaData, contentList, dialogueData, contemporaries] = await Promise.all([
    getGuestbookEntries({ profileId: userId }),
    getSimilarByCelebId(userId, 3, locale),
    getCelebJsonLdContents(userId),
    getCelebDialogueFull(userId),
    profile.birth_date
      ? getContemporaries(userId, profile.birth_date, profile.death_date, locale)
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
        personaData={personaData}
        guestbookEntries={guestbookResult.entries}
        guestbookTotal={guestbookResult.total}
        greeting={greeting}
        dialogueLines={dialogueLines}
        contemporaries={contemporaries}
      />
    </>
  );
}
