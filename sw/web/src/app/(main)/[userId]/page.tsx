import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import { getActivityLogs } from "@/actions/activity";
import { getUserContents } from "@/actions/contents/getUserContents";
import ProfileContent from "./ProfileContent";

interface PageProps {
  params: Promise<{ userId: string }>;
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

  const { items: recentContents } = await getUserContents({ userId, limit: 9 });

  // 하이라이트 피드: 리뷰 + 완료 상태 변경만
  const { logs: rawLogs } = await getActivityLogs({
    userId,
    limit: 10,
    actionTypes: ['REVIEW_UPDATE', 'STATUS_CHANGE']
  });
  // STATUS_CHANGE 중 완료(COMPLETED)만 필터링
  const logs = rawLogs.filter(log => {
    if (log.action_type === 'REVIEW_UPDATE') return true;
    if (log.action_type === 'STATUS_CHANGE') {
      const metadata = log.metadata as { to_status?: string } | null;
      return metadata?.to_status === 'COMPLETED';
    }
    return false;
  }).slice(0, 5);

  // 본인일 때만 API 키 조회
  let apiKey: string | null = null;
  if (isOwner) {
    const myProfile = await getProfile();
    apiKey = myProfile?.gemini_api_key ?? null;
  }

  return (
    <ProfileContent
      profile={profile}
      userId={userId}
      isOwner={isOwner}
      recentContents={recentContents}
      activityLogs={logs}
      initialApiKey={apiKey}
    />
  );
}
