import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import RecordsContent from "./RecordsContent";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const result = await getUserProfile(userId);
  const nickname = result.success ? result.data?.nickname : "사용자";
  return { title: `${nickname}의 기록` };
}

export default async function RecordsPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const result = await getUserProfile(userId);
  if (!result.success || !result.data) {
    notFound(); 
  }

  const isOwner = currentUser?.id === userId;
  const nickname = result.data.nickname ?? undefined;

  return <RecordsContent userId={userId} isOwner={isOwner} nickname={nickname} />;
}
