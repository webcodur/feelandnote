import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getSimilarByCelebId } from "@/actions/persona/getSimilarByCelebId";
import { getContemporaries } from "@/actions/celebs/getContemporaries";
import { getGuestbookEntries } from "@/actions/guestbook";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { getAlternates } from "@/lib/seo";
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from "@/lib/utils/content-locale";
import CelebPageContent from "./CelebPageContent";

interface PageProps {
  params: Promise<{ slug: string }>;
}

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
  profession: string | null,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const professionLabel = getCelebProfessionLabel(profession);
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`추천 책 ${counts.BOOK}권`);
  if (counts.VIDEO > 0) parts.push(`추천 영화 ${counts.VIDEO}편`);
  if (counts.MUSIC > 0) parts.push(`추천 음악 ${counts.MUSIC}곡`);
  if (counts.GAME > 0) parts.push(`추천 게임 ${counts.GAME}개`);

  if (parts.length === 0) {
    return `${professionLabel} ${nickname} 추천 책·영화·음악`;
  }
  return `${professionLabel} ${nickname} ${parts.join(", ")}`;
}

function buildPageTitleEn(
  nickname: string,
  profession: string | null,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const professionLabel = getCelebProfessionLabel(profession);
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`${counts.BOOK} recommended books`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO} favorite movies`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC} favorite songs`);
  if (counts.GAME > 0) parts.push(`${counts.GAME} favorite games`);

  if (parts.length === 0) {
    return `${professionLabel} ${nickname}'s Recommended Books & Movies`;
  }
  return `${professionLabel} ${nickname}: ${parts.join(", ")}`;
}

function buildMetaDescriptionEn(
  nickname: string,
  profession: string | null,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const professionLabel = getCelebProfessionLabel(profession);
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`${counts.BOOK} recommended books`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO} favorite movies`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC} favorite songs`);
  if (counts.GAME > 0) parts.push(`${counts.GAME} favorite games`);

  if (parts.length === 0) {
    return `Discover ${professionLabel} ${nickname}'s book recommendations, favorite movies, music, and cultural philosophy on Feel&Note.`;
  }
  return `${professionLabel} ${nickname}'s ${parts.join(", ")}. Explore their cultural taste, reading philosophy, and personal recommendations.`;
}

/** 120~160자 분량의 SEO description 생성 */
function buildMetaDescription(
  nickname: string,
  profession: string | null,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const professionLabel = getCelebProfessionLabel(profession);
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`추천 책 ${counts.BOOK}권`);
  if (counts.VIDEO > 0) parts.push(`추천 영화 ${counts.VIDEO}편`);
  if (counts.MUSIC > 0) parts.push(`추천 음악 ${counts.MUSIC}곡`);
  if (counts.GAME > 0) parts.push(`추천 게임 ${counts.GAME}개`);

  if (parts.length === 0) {
    return `${professionLabel} ${nickname}이 추천한 책, 영화, 음악, 게임 목록과 감상 편력. ${nickname}의 문화적 취향과 영감의 원천을 탐색하세요.`;
  }

  return `${professionLabel} ${nickname}의 ${parts.join(", ")} 목록. ${nickname}이 직접 추천하거나 즐겨본 작품과 감상 편력을 확인하세요.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const result = await getCelebBySlug(slug, locale);

  if (!result.success || !result.data) {
    const t = await getTranslations("celebPage");
    return { title: t("notFound") };
  }

  const { nickname, profession, contentTypeCounts } = result.data;
  const pageTitle = locale === 'en'
    ? buildPageTitleEn(nickname, profession, contentTypeCounts)
    : buildPageTitle(nickname, profession, contentTypeCounts);
  const description = locale === 'en'
    ? buildMetaDescriptionEn(nickname, profession, contentTypeCounts)
    : buildMetaDescription(nickname, profession, contentTypeCounts);
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
  const { slug } = await params;
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const result = await getCelebBySlug(slug, locale);
  if (!result.success || !result.data) {
    notFound();
  }
  const profile = result.data;
  const userId = profile.id;
  const pageTitle = locale === 'en'
    ? buildPageTitleEn(profile.nickname, profile.profession, profile.contentTypeCounts)
    : buildPageTitle(profile.nickname, profile.profession, profile.contentTypeCounts);

  const [guestbookResult, personaData, contentListResult, dialogueResult, contemporaries] = await Promise.all([
    getGuestbookEntries({ profileId: userId }),
    getSimilarByCelebId(userId, 3, locale),
    // JSON-LD ItemList용 콘텐츠 목록 (최대 50개)
    supabase
      .from('user_contents')
      .select(`contents!inner(id, type, content_locales(${CL_SELECT}))`)
      .eq('user_id', userId)
      .limit(50),
    supabase
      .from('celeb_dialogues')
      .select('lines, lines_en')
      .eq('celeb_id', userId)
      .maybeSingle(),
    profile.birth_date
      ? getContemporaries(userId, profile.birth_date, profile.death_date, locale)
      : Promise.resolve([]),
  ]);

  const dialogueData = dialogueResult.data as { lines: Record<string, string[]>; lines_en: Record<string, string[]> | null } | null;
  const greeting = locale === 'en' && dialogueData?.lines_en?.greeting
    ? dialogueData.lines_en.greeting
    : dialogueData?.lines?.greeting ?? null;

  const guestbookCurrentUser = currentUser
    ? { id: currentUser.id, nickname: profile.nickname, avatar_url: profile.avatar_url }
    : null;

  // JSON-LD 구조화 데이터: Person + ItemList
  const canonicalUrl = `https://feelandnote.com/celeb/${slug}`;
  const contentItems = (contentListResult.data ?? []).map((row, idx) => {
    const rawContent = row.contents as unknown as { id: string; type: string; content_locales: ContentLocaleRow[] | null };
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
      ...(profile.profession && { jobTitle: getCelebProfessionLabel(profile.profession) }),
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
        userId={userId}
        personaData={personaData}
        guestbookEntries={guestbookResult.entries}
        guestbookTotal={guestbookResult.total}
        guestbookCurrentUser={guestbookCurrentUser}
        greeting={greeting}
        contemporaries={contemporaries}
      />
    </>
  );
}
