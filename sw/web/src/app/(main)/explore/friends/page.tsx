/*
  파일명: /app/(main)/explore/friends/page.tsx
  기능: 친구 탐색 페이지
  책임: 친구 목록을 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import FriendsSection from "@/components/features/user/explore/sections/FriendsSection";
import { getFriends } from "@/actions/user";

export const metadata = { title: "친구 | 탐색" };

function SectionSkeleton() {
  return (
    <div className="animate-pulse bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10 shadow-inner shadow-black/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[82px] bg-bg-card rounded-sm flex items-center gap-4 p-4">
            {/* 아바타 */}
            <div className="w-14 h-14 rounded-full bg-white/10 shrink-0" />
            {/* 정보 */}
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-white/10 rounded" />
              <div className="h-3 w-12 bg-white/5 rounded" />
            </div>
            {/* 기록 수 */}
            <div className="shrink-0 flex flex-col items-center border-l border-white/10 pl-3">
              <div className="h-6 w-8 bg-white/10 rounded" />
              <div className="h-2 w-6 bg-white/5 rounded mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function FriendsContent() {
  const result = await getFriends();
  const friends = result.success ? result.data : [];
  return <FriendsSection friends={friends} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <FriendsContent />
    </Suspense>
  );
}
