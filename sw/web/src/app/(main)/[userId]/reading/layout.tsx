import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import ReadingSubTabs from "@/components/features/user/profile/ReadingSubTabs";
import { DecorativeLabel } from "@/components/ui";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}

export default async function ReadingLayout({ children, params }: LayoutProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === userId;

  const result = await getUserProfile(userId);
  if (!result.success || !result.data) {
    notFound();
  }

  const isCeleb = result.data.profile_type === "CELEB";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <DecorativeLabel label="열람실" />
        <ReadingSubTabs userId={userId} isCeleb={isCeleb} isOwner={isOwner} />
      </div>
      {children}
    </div>
  );
}
