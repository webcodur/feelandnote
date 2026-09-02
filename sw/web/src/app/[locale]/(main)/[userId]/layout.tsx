import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserProfile } from "@/actions/user";
import { getCelebSlugById } from "@/actions/celebs/getCelebSlugById";
import { redirect } from "@/i18n/navigation";
import PageContainer from "@/components/layout/PageContainer";
import RecentProfileTracker from "@/components/features/profile/RecentProfileTracker";
import ArchiveSectionHeader from "@/components/features/user/profile/ArchiveSectionHeader";
import ArchiveTabs from "@/components/features/user/profile/ArchiveTabs";
import PrismBanner from "@/components/lab/PrismBanner";
import PageBanner from "@/components/shared/PageBanner";
import { createClient } from "@/lib/db/server";
import MessageScope from "@/components/shared/MessageScope";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ userId: string; locale: string }>;
}

async function UserLayoutBody({ children, params }: LayoutProps) {
  const { userId, locale } = await params;
  const db = await createClient();
  const [profileResult, authResult, tCtx, tHome] = await Promise.all([
    getUserProfile(userId),
    db.auth.getUser(),
    getTranslations("contextHeader"),
    getTranslations("home"),
  ]);

  if (!profileResult.success || !profileResult.data) {
    /* 이 자리는 회원 전용이지만 인물 식별자로 만들어진 옛 주소가 밖에 돌아다닌다.
       인물이면 없는 화면이라 내치지 말고 정본 주소로 넘긴다. */
    const celebSlug = await getCelebSlugById(userId);
    if (celebSlug) {
      redirect({ href: `/celeb/${celebSlug}`, locale });
    }
    notFound();
  }

  const profile = profileResult.data;
  const isOwner = authResult.data.user?.id === userId;
  const pageTitle = tCtx("recordOf", { title: profile.nickname || "User" });
  const englishTitle = tHome("archive.englishTitle");

  return (
    <>
      <PageBanner title={pageTitle} subtitle={englishTitle}>
        <PrismBanner height={350} compact>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
            {pageTitle}
          </h1>
          {pageTitle.toLowerCase() !== englishTitle.toLowerCase() && (
            <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
              {englishTitle}
            </p>
          )}
        </PrismBanner>
      </PageBanner>
      <RecentProfileTracker
        profile={{
          id: userId,
          nickname: profile.nickname,
          nickname_en: profile.nickname_en,
          nickname_ko: profile.nickname_ko,
          avatarUrl: profile.avatar_url ?? null,
          title: profile.title ?? null,
          title_en: profile.title_en,
          title_ko: profile.title_ko,
          profileType: "USER",
        }}
      />
      <PageContainer>
        <ArchiveTabs userId={userId} isOwner={isOwner} isCeleb={false} />
        <main className="max-w-3xl mx-auto animate-fade-in">
          <ArchiveSectionHeader userId={userId} isOwner={isOwner} isCeleb={false} />
          {children}
        </main>
      </PageContainer>
    </>
  );
}

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function UserLayout(props: LayoutProps) {
  return (
    <MessageScope>
      <UserLayoutBody {...props} />
    </MessageScope>
  );
}
