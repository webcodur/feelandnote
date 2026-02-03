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
    <div className="animate-pulse bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10 shadow-inner shadow-black/20">
      {/* PC Grid */}
      <div className="hidden sm:grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-bg-card" />
            <div className="h-3 w-12 bg-bg-card rounded" />
          </div>
        ))}
      </div>
      {/* Mobile Compact List */}
      <div className="sm:hidden flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[58px] bg-bg-card border-2 border-accent-dim/10 rounded-sm flex items-center gap-3 px-2.5 py-3.5">
            <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 bg-white/10 rounded" />
              <div className="h-2 w-12 bg-white/5 rounded" />
            </div>
            <div className="w-4 h-4 bg-white/5 rounded" />
          </div>
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
