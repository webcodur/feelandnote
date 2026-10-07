import { getTranslations } from "next-intl/server";
import { getMemberRouteProfile } from "@/lib/profile-route";
import PageContainer from "@/components/layout/PageContainer";
import RecentProfileTracker from "@/components/features/profile/RecentProfileTracker";
import ArchiveSectionHeader from "@/components/features/user/profile/ArchiveSectionHeader";
import ArchiveTabs from "@/components/features/user/profile/ArchiveTabs";
import PrismBanner from "@/components/lab/PrismBanner";
import PageBanner from "@/components/shared/PageBanner";
import { BANNER_TITLE_CLASS } from "@/components/shared/bannerStyles";
import { getRequestUser } from "@/lib/db/server";
import MessageScope from "@/components/shared/MessageScope";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ userId: string; locale: string }>;
}

async function UserLayoutBody({ children, params }: LayoutProps) {
  const { userId, locale } = await params;
  const [profile, authResult, tCtx] = await Promise.all([
    getMemberRouteProfile(userId, locale),
    getRequestUser(),
    getTranslations("contextHeader"),
  ]);

  const isOwner = authResult.data.user?.id === userId;
  const pageTitle = tCtx("recordOf", { title: profile.nickname || "User" });

  return (
    <>
      <PageBanner title={pageTitle}>
        <PrismBanner height={350} compact>
          <h1 className={BANNER_TITLE_CLASS}>{pageTitle}</h1>
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
        <div className="max-w-3xl mx-auto animate-fade-in">
          <ArchiveSectionHeader userId={userId} isOwner={isOwner} isCeleb={false} />
          {children}
        </div>
      </PageContainer>
    </>
  );
}

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function UserLayout(props: LayoutProps) {
  return (
    <MessageScope>
      <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-80" className="mx-auto max-w-3xl my-8" />}>
        <UserLayoutBody {...props} />
      </Lane>
    </MessageScope>
  );
}
