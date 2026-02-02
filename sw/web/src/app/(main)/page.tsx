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
        <Suspense fallback={<div className="h-96 animate-pulse bg-bg-card/50 rounded-xl" />}>
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
