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
    <div className="animate-pulse bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-bg-card rounded-xl" />
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
