import { createClient } from "@/lib/supabase/server";
import { getProfile, getDetailedStats } from "@/actions/user";
import { notFound } from "next/navigation";
import ProfileSettingsSection from "../ProfileSettingsSection";
import ProfileStatsSection from "../ProfileStatsSection";

export const metadata = { title: "관리" };

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

  const [myProfile, stats] = await Promise.all([
    getProfile(),
    getDetailedStats(userId),
  ]);

  const isEmailUser = currentUser.app_metadata?.provider === 'email';

  return (
    <div className="space-y-8">
      <ProfileStatsSection stats={stats} />
      <ProfileSettingsSection isEmailUser={isEmailUser} />
    </div>
  );
}
