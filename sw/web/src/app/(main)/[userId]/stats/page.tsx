import { createClient } from "@/lib/supabase/server";
import { getDetailedStats } from "@/actions/user";
import { notFound } from "next/navigation";
import ProfileStatsSection from "../ProfileStatsSection";

export const metadata = { title: "통계" };

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function StatsPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 본인만 통계 페이지 접근 가능
  if (!currentUser || currentUser.id !== userId) {
    notFound();
  }

  const stats = await getDetailedStats();

  return <ProfileStatsSection stats={stats} />;
}
