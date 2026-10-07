import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import { getTranslations } from "next-intl/server";
import { getRequestUser } from "@/lib/db/server";
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

async function MeritsPageBody({ params }: PageProps) {
  const { userId } = await params;
  const { data: { user: currentUser } } = await getRequestUser();

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

export default function MeritsPage(props: PageProps) {
  return <Lane fallback={<PendingBlock variant="grid" count={6} />}><MeritsPageBody {...props} /></Lane>;
}
