import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/db/server";
import { getMemberRouteProfile } from "@/lib/profile-route";
import RecordsContent from "./RecordsContent";

interface PageProps {
  params: Promise<{ userId: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId, locale } = await params;
  const t = await getTranslations("pages");
  const { nickname } = await getMemberRouteProfile(userId, locale);
  return { title: t("userRecords", { nickname }) };
}

export default async function RecordsPage({ params }: PageProps) {
  const { userId, locale } = await params;
  const db = await createClient();
  const { data: { user: currentUser } } = await db.auth.getUser();

  const profile = await getMemberRouteProfile(userId, locale);

  const isOwner = currentUser?.id === userId;
  const nickname = profile.nickname ?? undefined;

  return <RecordsContent userId={userId} isOwner={isOwner} nickname={nickname} />;
}
