import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import RecordsContent from "./RecordsContent";

interface PageProps {
  params: Promise<{ userId: string }>;
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

  return <RecordsContent userId={userId} isOwner={isOwner} />;
}
