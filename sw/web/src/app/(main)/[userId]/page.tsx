import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import { getGuestbookEntries, markGuestbookAsRead } from "@/actions/guestbook";
import { getCelebInfluence } from "@/actions/home/getCelebInfluence";
import { getSimilarByCelebId } from "@/actions/persona/getSimilarByCelebId";
import ProfileContent from "./ProfileContent";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const result = await getUserProfile(userId);
  
  if (!result.success || !result.data) {
    return { title: "사용자를 찾을 수 없습니다" };
  }

  const profile = result.data;
  const nickname = profile.nickname;
  // 셀럽이면 bio, 아니면 기본 설명
  const description = profile.profile_type === 'CELEB' && profile.bio 
    ? profile.bio.slice(0, 160) 
    : `${nickname}님의 문화 기록관입니다.`;

  return {
    title: `${nickname} - Feel&Note`,
    description,
    openGraph: {
      title: `${nickname} - Feel&Note`,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${nickname} - Feel&Note`,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  };
}

export default async function OverviewPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwner = currentUser?.id === userId;

  const result = await getUserProfile(userId);
  if (!result.success || !result.data) {
    notFound();
  }
  const profile = result.data;

  const guestbookResult = await getGuestbookEntries({ profileId: userId });

  // 본인일 때만 방명록 읽음 처리
  if (isOwner) {
    await markGuestbookAsRead();
  }

  // 현재 유저 정보 (방명록 작성용)
  const guestbookCurrentUser = currentUser ? {
    id: currentUser.id,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
  } : null;

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
      guestbookCurrentUser={guestbookCurrentUser}
      influenceData={influenceData}
      personaData={personaData}
    />
  );
}
