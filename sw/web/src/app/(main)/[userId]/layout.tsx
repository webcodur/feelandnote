import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import UserProfileSidebar from "@/components/features/user/profile/UserProfileSidebar";
import PrismBanner from "@/components/lab/PrismBanner";
import { PAGE_BANNER } from "@/constants/navigation";

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

  const { titleSuffix, englishTitle } = PAGE_BANNER.archive;
  const pageTitle = `${profile.nickname || "User"}${titleSuffix}`;

  return (
    <div className="min-h-screen bg-bg-main relative overflow-hidden">
      {/* Prism Banner */}
      <PrismBanner height={350} compact>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
          {pageTitle}
        </h1>
        <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
          {englishTitle}
        </p>
      </PrismBanner>

      <div className="max-w-[1400px] 2xl:max-w-[1800px] mx-auto px-2 md:px-4 lg:pr-8 py-6 md:py-10 relative z-10">
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
