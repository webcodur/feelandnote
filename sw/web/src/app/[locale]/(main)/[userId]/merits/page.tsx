import { createClient } from "@/lib/supabase/server";
import { getAchievementData } from "@/actions/achievements";
import { notFound } from "next/navigation";
import ProfileAchievementsSection from "../ProfileAchievementsSection";

export const metadata = { title: "업적" };

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function MeritsPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const isOwner = currentUser?.id === userId;

  const [achievements, profileResult] = await Promise.all([
    getAchievementData(userId),
    supabase.from("profiles").select("showcase_titles").eq("id", userId).single(),
  ]);

  if (!achievements) {
    notFound();
  }

  const showcaseCodes = (profileResult.data?.showcase_titles as string[]) || [];

  return (
    <ProfileAchievementsSection
      achievements={achievements}
      showcaseCodes={showcaseCodes}
      isOwner={isOwner}
    />
  );
}
