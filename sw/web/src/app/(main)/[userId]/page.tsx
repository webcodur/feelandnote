import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import { getUserContents } from "@/actions/contents/getUserContents";
import { getGuestbookEntries, markGuestbookAsRead } from "@/actions/guestbook";
import ProfileContent from "./ProfileContent";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const result = await getUserProfile(userId);
  const nickname = result.success ? result.data?.nickname : "사용자";
  return { title: nickname };
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

  // 병렬로 데이터 조회
  const [contentsResult, guestbookResult] = await Promise.all([
    getUserContents({ userId, limit: 9 }),
    getGuestbookEntries({ profileId: userId }),
  ]);

  const recentContents = contentsResult.items;

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

  return (
    <ProfileContent
      profile={profile}
      userId={userId}
      isOwner={isOwner}
      recentContents={recentContents}
      guestbookEntries={guestbookResult.entries}
      guestbookTotal={guestbookResult.total}
      guestbookCurrentUser={guestbookCurrentUser}
    />
  );
}
