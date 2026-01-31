import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import UserProfileSidebar from "@/components/features/user/profile/UserProfileSidebar";
import PrismBanner from "@/components/lab/PrismBanner";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}

export default async function UserLayout({ children, params }: LayoutProps) {
  const { userId } = await params;
  const supabase = await createClient();

  // 1. 유저 정보 조회
  const result = await getUserProfile(userId);
  if (!result.success || !result.data) {
    notFound();
  }
  const profile = result.data;

  // 2. 현재 로그인한 유저 확인 (Owner 체크)
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === userId;

  return (
    <div className="min-h-screen bg-bg-main relative overflow-hidden">
      {/* Prism Banner */}
      <PrismBanner
        height={350}
        compact
        title={`${profile.nickname || "User"}의 기록관`}
        subtitle="Official Sacred Record"
      />

      <div className="max-w-[1400px] mx-auto px-2 md:px-4 lg:pr-8 py-6 md:py-10 relative z-10">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <UserProfileSidebar profile={profile} isOwner={isOwner} userId={userId} />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 w-full animate-fade-in space-y-12">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
