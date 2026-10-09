import hubStyles from "@/components/shared/HubSection.module.css";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import { getTranslations } from "next-intl/server";
import { getRequestUser } from "@/lib/db/server";
import { getDetailedStats } from "@/actions/user";
import { notFound } from "next/navigation";
import ProfileSettingsSection from "../ProfileSettingsSection";
import ProfileStatsSection from "../ProfileStatsSection";
import { getBlockedUsers } from "@/actions/moderation";
import { BlockedUsersCard } from "@/components/features/moderation";
import HubSection from "@/components/shared/HubSection";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { hubAtlasNavItems, hubSectionId } from "@/components/shared/hubSectionUtils";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("chamber"), robots: { index: false, follow: false } };
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

async function ChamberPageBody({ params }: PageProps) {
  const { userId } = await params;
  const { data: { user: currentUser } } = await getRequestUser();

  // 본인만 접근 가능
  if (!currentUser || currentUser.id !== userId) {
    notFound();
  }

  const [stats, blocked] = await Promise.all([
    getDetailedStats(userId),
    getBlockedUsers(),
  ]);

  const isEmailUser = currentUser.app_metadata?.provider === 'email';
  const [profileT, blockedT] = await Promise.all([
    getTranslations("userProfile.sidebar"),
    getTranslations("moderation.blockedList"),
  ]);
  const titles = [profileT("stats"), blockedT("title"), profileT("settings")];
  const groupId = "chamber";

  // 차단 목록 조회가 실패해도 화면은 살린다. 대신 빈 목록으로 위장하지 않고 0건으로 명시한다.
  const blockedUsers = blocked.success ? blocked.data.users : [];
  const blockedTotal = blocked.success ? blocked.data.total : 0;

  return (
    <AsyncIntlProvider>
      <AtlasNavSections items={hubAtlasNavItems(titles, groupId)} />
      <div className={hubStyles.page}>
        <HubSection id={hubSectionId(0, groupId)} title={titles[0]} index={0} total={titles.length} compact hideDivider>
          <ProfileStatsSection stats={stats} />
        </HubSection>
        <HubSection id={hubSectionId(1, groupId)} title={titles[1]} index={1} total={titles.length} compact>
          <BlockedUsersCard users={blockedUsers} total={blockedTotal} hideHeading />
        </HubSection>
        <HubSection id={hubSectionId(2, groupId)} title={titles[2]} index={2} total={titles.length} compact>
          <ProfileSettingsSection isEmailUser={isEmailUser} />
        </HubSection>
      </div>
    </AsyncIntlProvider>
  );
}

export default function ChamberPage(props: PageProps) {
  return <Lane fallback={<PendingBlock variant="grid" count={6} />}><ChamberPageBody {...props} /></Lane>;
}
