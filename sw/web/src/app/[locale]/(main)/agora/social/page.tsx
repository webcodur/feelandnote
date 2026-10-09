import hubStyles from "@/components/shared/HubSection.module.css";
/*
  파일명: /app/(main)/agora/social/page.tsx
  기능: 광장 소셜 페이지
  책임: 친구, 팔로잉, 팔로워, 취향 유사 유저를 한 페이지에 섹션별로 보여준다.
        구획마다 먼저 끝나는 자료부터 표시하고, 알려진 봇에는 완성 본문을 보낸다.
*/ // ------------------------------

import Lane from "@/components/ui/pending/Lane";
import { getTranslations } from "next-intl/server";
import { PendingBlock } from "@/components/ui/pending";
import { FriendsSection, FollowingSection, FollowersSection, SimilarSection } from "./sections";
import HubSection from "@/components/shared/HubSection";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { hubAtlasNavItems, hubSectionId } from "@/components/shared/hubSectionUtils";

export async function generateMetadata() {
  const t = await getTranslations("agora.social");
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function Page() {
  const t = await getTranslations("explore.people");
  const sections = [
    { title: t("friends"), Content: FriendsSection },
    { title: t("following"), Content: FollowingSection },
    { title: t("followers"), Content: FollowersSection },
    { title: t("similar"), Content: SimilarSection },
  ];
  const groupId = "social";

  return (
    <AsyncIntlProvider>
      <AtlasNavSections items={hubAtlasNavItems(sections.map(section => section.title), groupId)} />
      <div className={`mx-auto max-w-3xl ${hubStyles.page}`}>
        {sections.map(({ title, Content }, index) => (
          <HubSection key={title} id={hubSectionId(index, groupId)} title={title} index={index} total={sections.length} compact hideDivider={index === 0}>
            <Lane fallback={<PendingBlock variant="rows" count={3} />}>
              <Content />
            </Lane>
          </HubSection>
        ))}
      </div>
    </AsyncIntlProvider>
  );
}
