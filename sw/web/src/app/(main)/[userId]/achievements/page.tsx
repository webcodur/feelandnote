import { createClient } from "@/lib/supabase/server";
import { getAchievementData } from "@/actions/achievements";
import { notFound } from "next/navigation";
import ProfileAchievementsSection from "../ProfileAchievementsSection";

export const metadata = { title: "칭호" };

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AchievementsPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 본인만 칭호 페이지 접근 가능
  if (!currentUser || currentUser.id !== userId) {
    notFound();
  }

  const [achievements, profileResult] = await Promise.all([
    getAchievementData(),
    supabase.from("profiles").select("selected_title_id").eq("id", userId).single(),
  ]);

  if (!achievements) {
    notFound();
  }

  const selectedTitleId = profileResult.data?.selected_title_id || null;

  return <ProfileAchievementsSection achievements={achievements} selectedTitleId={selectedTitleId} />;
}
