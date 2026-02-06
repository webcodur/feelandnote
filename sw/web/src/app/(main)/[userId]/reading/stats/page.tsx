import { getDetailedStats } from "@/actions/user";
import ProfileStatsSection from "@/app/(main)/[userId]/ProfileStatsSection";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function StatsPage({ params }: PageProps) {
  const { userId } = await params;
  const stats = await getDetailedStats(userId);

  return <ProfileStatsSection stats={stats} />;
}
