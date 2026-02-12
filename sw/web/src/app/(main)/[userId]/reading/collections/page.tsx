import { createClient } from "@/lib/supabase/server";
import Flows from "@/components/features/user/flows/Flows";

export const metadata = { title: "플로우" };

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const isOwner = currentUser?.id === userId;

  return <Flows userId={userId} isOwner={isOwner} />;
}
