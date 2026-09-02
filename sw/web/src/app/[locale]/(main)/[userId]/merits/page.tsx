import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/db/server";
import { getAchievementData } from "@/actions/achievements";
import { getProfileShowcase } from "@/actions/achievements/getProfileShowcase";
import { notFound } from "next/navigation";
import ProfileAchievementsSection from "../ProfileAchievementsSection";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("merits") };
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function MeritsPage({ params }: PageProps) {
  const { userId } = await params;
  const db = await createClient();
  const { data: { user: currentUser } } = await db.auth.getUser();

  const isOwner = currentUser?.id === userId;

  const [achievements, showcaseCodes] = await Promise.all([
    getAchievementData(userId),
    getProfileShowcase(userId),
  ]);

  if (!achievements) {
    notFound();
  }

  return (
    <ProfileAchievementsSection
      achievements={achievements}
      showcaseCodes={showcaseCodes}
      isOwner={isOwner}
    />
  );
}
