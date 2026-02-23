import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getSimilarByCelebId } from "@/actions/persona/getSimilarByCelebId";
import { getGuestbookEntries } from "@/actions/guestbook";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
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
  if (counts.BOOK > 0) parts.push(`${counts.BOOK}권의 책`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO}편의 영화`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC}곡의 음악`);
  if (counts.GAME > 0) parts.push(`${counts.GAME}개의 게임`);

  if (parts.length === 0) {
    return `${professionLabel} ${nickname}의 감상 기록`;
  }
  const particle = subjectParticle(nickname);
  return `${professionLabel} ${nickname}${particle} 감상한 ${parts.join(", ")}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCelebBySlug(slug);

  if (!result.success || !result.data) {
    return { title: "셀럽을 찾을 수 없습니다" };
  }

  const { nickname, profession, avatar_url, contentTypeCounts } = result.data;
  const description = buildPageTitle(nickname, profession, contentTypeCounts);
  const canonicalUrl = `https://feelandnote.com/celeb/${slug}`;

  return {
    title: `${nickname}의 감상 기록 - Feel&Note`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: description,
      description: `${nickname}의 감상 기록을 탐색하세요.`,
      url: canonicalUrl,
      images: avatar_url ? [avatar_url] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: description,
      description: `${nickname}의 감상 기록을 탐색하세요.`,
      images: avatar_url ? [avatar_url] : [],
    },
  };
}

export default async function CelebPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const result = await getCelebBySlug(slug);
  if (!result.success || !result.data) {
    notFound();
  }
  const profile = result.data;
  const userId = profile.id;
  const pageTitle = buildPageTitle(profile.nickname, profile.profession, profile.contentTypeCounts);

  const [guestbookResult, personaData] = await Promise.all([
    getGuestbookEntries({ profileId: userId }),
    getSimilarByCelebId(userId, 3),
  ]);

  const guestbookCurrentUser = currentUser
    ? { id: currentUser.id, nickname: profile.nickname, avatar_url: profile.avatar_url }
    : null;

  // JSON-LD 구조화 데이터
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.nickname,
    ...(profile.nationality && { nationality: profile.nationality }),
    ...(profile.profession && { jobTitle: getCelebProfessionLabel(profile.profession) }),
    url: `https://feelandnote.com/celeb/${slug}`,
  };

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
      />
    </>
  );
}
