import { Suspense } from "react";
import FeaturedCollections from "@/components/features/landing/FeaturedCollections";
import { getFeaturedTags } from "@/actions/home";
import { createClient } from "@/lib/supabase/server";

import HomeBanner from "@/components/features/home/HomeBanner";
import ArchivePreview from "@/components/features/home/ArchivePreview";
import AgoraPreview from "@/components/features/home/AgoraPreview";
import ScripturesPreview from "@/components/features/home/ScripturesPreview";
import ArenaPreview from "@/components/features/home/ArenaPreview";

import { getUserContents } from "@/actions/contents/getUserContents";
import type { RecordCardProps } from "@/components/ui/cards/RecordCard";
import SectionWrapper from "@/components/features/home/SectionWrapper";
import { HOME_SECTIONS } from "@/constants/navigation";

// #region 스켈레톤
function FeaturedSkeleton() {
  return (
    <div className="w-full animate-pulse">
      {/* Desktop */}
      <div className="hidden md:flex flex-col gap-8 md:gap-12">
        {/* CuratedExhibition 스켈레톤 */}
        <div className="w-full h-96 bg-bg-card/50 rounded-2xl" />
        {/* QuickBrowse 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-bg-card/30 rounded-xl" />
          ))}
        </div>
      </div>
      {/* Mobile */}
      <div className="md:hidden flex flex-col gap-6">
        {/* 탭 스켈레톤 */}
        <div className="flex gap-2 px-2 pb-2 border-b border-white/5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-bg-card rounded-full" />
          ))}
        </div>
        {/* CuratedExhibition 스켈레톤 */}
        <div className="h-80 bg-bg-card/50 rounded-xl mx-2" />
        {/* QuickBrowse 스켈레톤 */}
        <div className="grid grid-cols-3 gap-3 px-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-bg-card/30 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
// #endregion

// #region 서버 컴포넌트
async function FeaturedSection() {
  const tags = await getFeaturedTags();
  const activeTags = tags.filter(tag => tag.is_featured);
  return <FeaturedCollections tags={activeTags} />;
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 사용자 기록 조회 (로그인 시)
  let userRecords: RecordCardProps[] = [];
  if (user) {
    try {
      const { items } = await getUserContents({ 
        userId: user.id, 
        limit: 4 
      });

      userRecords = items.map(item => ({
        contentId: item.content_id,
        contentType: item.content.type,
        title: item.content.title,
        creator: item.content.creator,
        thumbnail: item.content.thumbnail_url,
        status: item.status,
        rating: item.public_record?.rating,
        review: item.public_record?.content_preview,
      }));
    } catch (e) {
      console.error("Failed to fetch user contents:", e);
    }
  }

  return (
    <div className="bg-bg-main">

      {/* 1. 배너(히어로) */}
      <section id="home-banner">
        <HomeBanner />
      </section>

      {/* 2. 탐색 프리뷰 */}
      <SectionWrapper config={HOME_SECTIONS.explore}>
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedSection />
        </Suspense>
      </SectionWrapper>

      {/* 3. 서고 프리뷰 */}
      <SectionWrapper config={HOME_SECTIONS.scriptures}>
        <Suspense fallback={null}>
          <ScripturesPreview />
        </Suspense>
      </SectionWrapper>

      {/* 4. 광장 프리뷰 */}
      <SectionWrapper config={HOME_SECTIONS.agora}>
        <AgoraPreview />
      </SectionWrapper>

      {/* 5. 전장 프리뷰 */}
      <SectionWrapper config={HOME_SECTIONS.arena}>
        <ArenaPreview />
      </SectionWrapper>

      {/* 6. 기록관 프리뷰 */}
      <SectionWrapper
        config={HOME_SECTIONS.archive}
        linkOverride={user ? `/${user.id}` : "/login"}
      >
        <ArchivePreview
          initialRecords={userRecords}
          userId={user?.id}
        />
      </SectionWrapper>

    </div>
  );
}
