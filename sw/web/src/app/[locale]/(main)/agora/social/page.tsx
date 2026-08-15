/*
  파일명: /app/(main)/agora/social/page.tsx
  기능: 광장 소셜 페이지
  책임: 친구, 팔로잉, 팔로워, 취향 유사 유저를 한 페이지에 섹션별로 보여준다.
        비색인 화면이라 구획마다 독립된 Suspense로 감싸 먼저 끝나는 구획부터 뜨게 한다.
*/ // ------------------------------

import { Suspense } from "react";
import { Users, UserCheck, UserPlus, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PendingBlock } from "@/components/ui/pending";
import { getProfile } from "@/actions/user";
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
  // 팔로워 구획이 본인 id를 필요로 하므로 프로필만 먼저 확인한다. 나머지 네 조회는 각 구획이 스스로 한다.
  const profile = await getProfile();

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader icon={Users} title={t("friends")} />
        <Suspense fallback={<PendingBlock variant="rows" count={3} />}>
          <FriendsSection />
        </Suspense>
      </section>

      <section>
        <SectionHeader icon={UserCheck} title={t("following")} />
        <Suspense fallback={<PendingBlock variant="rows" count={3} />}>
          <FollowingSection />
        </Suspense>
      </section>

      <section>
        <SectionHeader icon={UserPlus} title={t("followers")} />
        <Suspense fallback={<PendingBlock variant="rows" count={3} />}>
          <FollowersSection profileId={profile?.id ?? null} />
        </Suspense>
      </section>

      <section>
        <SectionHeader icon={Star} title={t("similar")} />
        <Suspense fallback={<PendingBlock variant="rows" count={3} />}>
          <SimilarSection />
        </Suspense>
      </section>
    </div>
  );
}
