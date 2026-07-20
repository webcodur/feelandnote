import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getGuestbookEntries, markGuestbookAsRead } from "@/actions/guestbook";
import { getCelebInfluence } from "@/actions/home/getCelebInfluence";
import { getSimilarByCelebId } from "@/actions/persona/getSimilarByCelebId";
import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import ProfileContent from "./ProfileContent";

interface PageProps {
  params: Promise<{ userId: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const t = await getTranslations("profilePage");
  const result = await getUserProfile(userId);

  if (!result.success || !result.data) {
    return { title: t("userNotFound") };
  }

  const profile = result.data;
  const nickname = profile.nickname;
  // 셀럽이면 bio, 아니면 기본 설명
  const description = profile.profile_type === 'CELEB' && profile.bio
    ? profile.bio.slice(0, 160)
    : t("metaDescription", { nickname });

  return {
    title: nickname,
    description,
    openGraph: {
      title: nickname,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: nickname,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
    alternates: await getLocalizedAlternates(`/${userId}`),
  };
}

export default async function OverviewPage({ params }: PageProps) {
  const { userId, locale } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwner = currentUser?.id === userId;

  const result = await getUserProfile(userId);
  if (!result.success || !result.data) {
    notFound();
  }
  const profile = result.data;

  // 셀럽이면 slug 기반 URL로 redirect
  if (profile.profile_type === 'CELEB' && profile.slug) {
    redirect({ href: `/celeb/${profile.slug}`, locale });
  }

  const guestbookResult = await getGuestbookEntries({ profileId: userId });

  // 본인일 때만 방명록 읽음 처리
  if (isOwner) {
    await markGuestbookAsRead();
  }

  // 방명록은 작성 폼 노출·본인 글 수정/삭제 판정에 로그인 사용자 id만 쓴다.
  // 작성자 표시는 서버가 내려주는 entry.author가 담당한다.
  const guestbookCurrentUserId = currentUser?.id ?? null;

  // 셀럽 영향력 데이터
  const influenceData = profile.profile_type === "CELEB"
    ? await getCelebInfluence(userId)
    : null;

  // 셀럽 인물 분석 + 유사 인물
  const personaData = profile.profile_type === "CELEB"
    ? await getSimilarByCelebId(userId, 5)
    : null;

  return (
    <ProfileContent
      profile={profile}
      userId={userId}
      isOwner={isOwner}
      guestbookEntries={guestbookResult.entries}
      guestbookTotal={guestbookResult.total}
      guestbookCurrentUserId={guestbookCurrentUserId}
      influenceData={influenceData}
      personaData={personaData}
    />
  );
}
