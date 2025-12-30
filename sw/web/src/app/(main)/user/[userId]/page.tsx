import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import UserProfileView from "@/components/views/main/UserProfileView";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  // 현재 로그인한 사용자 확인
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 본인 프로필이면 /profile로 리다이렉트
  if (currentUser?.id === userId) {
    redirect("/archive");
  }

  // 유저 프로필 조회
  const result = await getUserProfile(userId);

  if (!result.success || !result.data) {
    notFound();
  }

  return <UserProfileView profile={result.data} />;
}
