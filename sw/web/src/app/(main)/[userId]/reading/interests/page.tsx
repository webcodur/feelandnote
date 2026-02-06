import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import InterestsContent from "./InterestsContent";

export const metadata = { title: "관심사" };

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function InterestsPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const result = await getUserProfile(userId);
  if (!result.success || !result.data) {
    notFound();
  }

  // 셀럽은 관심 페이지 미제공
  if (result.data.profile_type === 'CELEB') {
    notFound();
  }

  const isOwner = currentUser?.id === userId;

  return <InterestsContent userId={userId} isOwner={isOwner} />;
}
