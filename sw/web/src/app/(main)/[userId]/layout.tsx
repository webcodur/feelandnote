import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/actions/user";
import { notFound } from "next/navigation";
import ArchiveTabs from "@/components/features/user/profile/ArchiveTabs";
import ArchiveSectionHeader from "@/components/features/user/profile/ArchiveSectionHeader";
import PrismBanner from "@/components/lab/PrismBanner";
import PageContainer from "@/components/layout/PageContainer";
import { PAGE_BANNER } from "@/constants/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}

export default async function UserLayout({ children, params }: LayoutProps) {
  const { userId } = await params;
  const supabase = await createClient();

  const result = await getUserProfile(userId);
  if (!result.success || !result.data) {
    notFound();
  }
  const profile = result.data;

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === userId;
  const isCeleb = profile.profile_type === "CELEB";

  const { titleSuffix, englishTitle } = PAGE_BANNER.archive;
  const pageTitle = `${profile.nickname || "User"}${titleSuffix}`;

  return (
    <>
      <PrismBanner height={350} compact>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
          {pageTitle}
        </h1>
        <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
          {englishTitle}
        </p>
      </PrismBanner>
      <PageContainer>
        <ArchiveTabs userId={userId} isOwner={isOwner} isCeleb={isCeleb} />
        <main className="max-w-3xl mx-auto animate-fade-in">
          <ArchiveSectionHeader userId={userId} isOwner={isOwner} isCeleb={isCeleb} />
          {children}
        </main>
      </PageContainer>
    </>
  );
}
