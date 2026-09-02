import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/db/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import RecordsContent from "./RecordsContent";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const t = await getTranslations("pages");
  const result = await getUserProfile(userId);
  const nickname = result.success ? result.data?.nickname : t("userFallback");
  return { title: t("userRecords", { nickname }) };
}

export default async function RecordsPage({ params }: PageProps) {
  const { userId } = await params;
  const db = await createClient();
  const { data: { user: currentUser } } = await db.auth.getUser();

  const result = await getUserProfile(userId);
  if (!result.success || !result.data) {
    notFound();
  }

  const isOwner = currentUser?.id === userId;
  const nickname = result.data.nickname ?? undefined;

  return <RecordsContent userId={userId} isOwner={isOwner} nickname={nickname} />;
}
