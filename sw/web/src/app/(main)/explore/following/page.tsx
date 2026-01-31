/*
  파일명: /app/(main)/explore/following/page.tsx
  기능: 팔로잉 탐색 페이지
  책임: 팔로잉 목록을 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import FollowingSection from "@/components/features/user/explore/sections/FollowingSection";
import { getMyFollowing } from "@/actions/user";

export const metadata = { title: "팔로잉 | 탐색" };

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

async function FollowingContent() {
  const result = await getMyFollowing();
  const following = result.success ? result.data.map(f => ({ ...f, is_friend: false })) : [];
  const nonFriendFollowing = following.filter((f) => !f.is_friend);
  return <FollowingSection following={nonFriendFollowing} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <FollowingContent />
    </Suspense>
  );
}
