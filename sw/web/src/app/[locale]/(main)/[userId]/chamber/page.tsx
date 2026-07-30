import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getDetailedStats } from "@/actions/user";
import { notFound } from "next/navigation";
import ProfileSettingsSection from "../ProfileSettingsSection";
import ProfileStatsSection from "../ProfileStatsSection";
import { getBlockedUsers } from "@/actions/moderation";
import { BlockedUsersCard } from "@/components/features/moderation";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("chamber"), robots: { index: false, follow: false } };
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function ChamberPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 본인만 접근 가능
  if (!currentUser || currentUser.id !== userId) {
    notFound();
  }

  const [myProfile, stats, blocked] = await Promise.all([
    getProfile(),
    getDetailedStats(userId),
    getBlockedUsers(),
  ]);

  const isEmailUser = currentUser.app_metadata?.provider === 'email';

  // 차단 목록 조회가 실패해도 화면은 살린다. 대신 빈 목록으로 위장하지 않고 0건으로 명시한다.
  const blockedUsers = blocked.success ? blocked.data.users : [];
  const blockedTotal = blocked.success ? blocked.data.total : 0;

  return (
    <div className="space-y-8">
      <ProfileStatsSection stats={stats} />
      <BlockedUsersCard users={blockedUsers} total={blockedTotal} />
      <ProfileSettingsSection isEmailUser={isEmailUser} />
    </div>
  );
}
