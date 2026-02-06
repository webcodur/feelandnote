import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import ProfileSettingsSection from "../ProfileSettingsSection";

export const metadata = { title: "내실" };

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function ChamberPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 본인만 내실 접근 가능
  if (!currentUser || currentUser.id !== userId) {
    notFound();
  }

  const myProfile = await getProfile();
  const apiKey = myProfile?.gemini_api_key ?? null;

  // OAuth 사용자인지 확인
  const isEmailUser = currentUser.app_metadata?.provider === 'email';

  return <ProfileSettingsSection initialApiKey={apiKey} isEmailUser={isEmailUser} />;
}
