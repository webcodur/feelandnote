import { createClient } from "@/lib/supabase/server";
import Playlists from "@/components/features/user/playlists/Playlists";

export const metadata = { title: "묶음" };

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const isOwner = currentUser?.id === userId;

  return <Playlists userId={userId} isOwner={isOwner} />;
}
