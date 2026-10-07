/*
  파일명: /app/(main)/agora/social/page.tsx
  기능: 광장 소셜 페이지
  책임: 친구, 팔로잉, 팔로워, 취향 유사 유저를 한 페이지에 섹션별로 보여준다.
        구획마다 먼저 끝나는 자료부터 표시하고, 알려진 봇에는 완성 본문을 보낸다.
*/ // ------------------------------

import Lane from "@/components/ui/pending/Lane";
import { Users, UserCheck, UserPlus, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PendingBlock } from "@/components/ui/pending";
import { FriendsSection, FollowingSection, FollowersSection, SimilarSection } from "./sections";

export async function generateMetadata() {
  const t = await getTranslations("agora.social");
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-accent" />
      <h2 className="text-sm font-semibold text-white/90">{title}</h2>
    </div>
  );
}

export default async function Page() {
  const t = await getTranslations("explore.people");

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader icon={Users} title={t("friends")} />
        <Lane fallback={<PendingBlock variant="rows" count={3} />}>
          <FriendsSection />
        </Lane>
      </section>

      <section>
        <SectionHeader icon={UserCheck} title={t("following")} />
        <Lane fallback={<PendingBlock variant="rows" count={3} />}>
          <FollowingSection />
        </Lane>
      </section>

      <section>
        <SectionHeader icon={UserPlus} title={t("followers")} />
        <Lane fallback={<PendingBlock variant="rows" count={3} />}>
          <FollowersSection />
        </Lane>
      </section>

      <section>
        <SectionHeader icon={Star} title={t("similar")} />
        <Lane fallback={<PendingBlock variant="rows" count={3} />}>
          <SimilarSection />
        </Lane>
      </section>
    </div>
  );
}
