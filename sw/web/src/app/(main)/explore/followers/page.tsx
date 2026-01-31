/*
  파일명: /app/(main)/explore/followers/page.tsx
  기능: 팔로워 탐색 페이지
  책임: 팔로워 목록을 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import FollowersSection from "@/components/features/user/explore/sections/FollowersSection";
import { getProfile, getFollowers } from "@/actions/user";

export const metadata = { title: "팔로워 | 탐색" };

function SectionSkeleton() {
  return (
    <div className="animate-pulse bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10">
      <div className="hidden sm:grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="aspect-square bg-bg-card rounded-xl" />
        ))}
      </div>
      <div className="sm:hidden flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-bg-card rounded-lg" />
        ))}
      </div>
    </div>
  );
}

async function FollowersContent() {
  const profile = await getProfile();
  const result = profile ? await getFollowers(profile.id) : { success: true, data: [] };
  const followers = result.success ? result.data : [];
  const nonMutualFollowers = followers.filter((f) => !f.is_following);
  return <FollowersSection followers={nonMutualFollowers} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <FollowersContent />
    </Suspense>
  );
}
