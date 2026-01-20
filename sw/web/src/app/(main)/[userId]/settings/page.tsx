import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import ProfileSettingsSection from "../ProfileSettingsSection";

export const metadata = { title: "설정" };

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 본인만 설정 페이지 접근 가능
  if (!currentUser || currentUser.id !== userId) {
    notFound();
  }

  const [profileResult, myProfile] = await Promise.all([
    getUserProfile(userId),
    getProfile(),
  ]);

  if (!profileResult.success || !profileResult.data) {
    notFound();
  }

  const apiKey = myProfile?.gemini_api_key ?? null;

  return <ProfileSettingsSection profile={profileResult.data} initialApiKey={apiKey} />;
}
