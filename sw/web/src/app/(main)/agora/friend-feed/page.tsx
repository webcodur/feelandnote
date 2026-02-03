/*
  파일명: /app/(main)/agora/friend-feed/page.tsx
  기능: 광장 친구 피드 페이지
  책임: 친구들의 활동 피드를 보여준다.
*/ // ------------------------------

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import FriendFeedSection from "@/components/features/agora/FriendFeedSection";
import { getAgoraPageTitle } from "@/constants/agora";

export const metadata = { title: getAgoraPageTitle("friend-feed") };

function FeedSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-8 md:gap-12">
      {/* 카테고리 탭 스켈레톤 (석판 스타일) */}
      <div className="flex justify-center overflow-x-auto pb-4">
        <div className="inline-flex min-w-max p-1 bg-neutral-900/80 rounded-xl border border-white/10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-14 bg-bg-card rounded-lg mx-0.5" />
          ))}
        </div>
      </div>

      {/* ReviewCard 스켈레톤 */}
      <div className="space-y-4 min-h-[400px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-bg-card border border-border/50 rounded-xl overflow-hidden p-4 md:p-6 max-w-4xl mx-auto">
            {/* Desktop */}
            <div className="hidden md:flex gap-6 h-[280px]">
              <div className="w-[160px] lg:w-[180px] h-full bg-white/5 shrink-0 rounded" />
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="w-32 h-4 bg-white/10 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="w-full h-3 bg-white/5 rounded" />
                  <div className="w-full h-3 bg-white/5 rounded" />
                  <div className="w-2/3 h-3 bg-white/5 rounded" />
                </div>
              </div>
            </div>
            {/* Mobile */}
            <div className="md:hidden space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10" />
                  <div className="w-20 h-3 bg-white/10 rounded" />
                </div>
                <div className="w-12 h-6 bg-white/10 rounded" />
              </div>
              <div className="flex gap-4 p-3 bg-white/5 rounded-lg">
                <div className="w-16 h-20 bg-white/10 rounded shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="w-12 h-2 bg-white/10 rounded" />
                  <div className="w-3/4 h-4 bg-white/10 rounded" />
                  <div className="w-1/2 h-3 bg-white/10 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-3 bg-white/5 rounded" />
                <div className="w-2/3 h-3 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function FriendFeedServer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <FriendFeedSection userId={user?.id} />;
}

export default function FriendFeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FriendFeedServer />
    </Suspense>
  );
}
