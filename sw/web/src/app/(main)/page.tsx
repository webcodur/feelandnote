import { Suspense } from "react";
import FeaturedCollections from "@/components/features/landing/FeaturedCollections";
import { getFeaturedTags } from "@/actions/home";
import { createClient } from "@/lib/supabase/server";

import HomeBanner from "@/components/features/home/HomeBanner";
import FeedPreview from "@/components/features/home/FeedPreview";
import ArchivePreview from "@/components/features/home/ArchivePreview";
import LoungePreview from "@/components/features/home/LoungePreview";
import BoardPreview from "@/components/features/home/BoardPreview";

import { getUserContents } from "@/actions/contents/getUserContents";
import type { RecordCardProps } from "@/components/ui/cards/RecordCard";
import SectionWrapper from "@/components/features/home/SectionWrapper";
import { HOME_SECTIONS } from "@/constants/home-sections";

// #region 서버 컴포넌트
async function FeaturedSection() {
  const tags = await getFeaturedTags();
  return <FeaturedCollections tags={tags} />;
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
      <SectionWrapper config={HOME_SECTIONS.EXPLORE}>
        <Suspense fallback={<div className="h-96 animate-pulse bg-bg-card/50 rounded-xl" />}>
          <FeaturedSection />
        </Suspense>
      </SectionWrapper>

      {/* 3. 피드 프리뷰 */}
      <SectionWrapper config={HOME_SECTIONS.FEED}>
        <Suspense fallback={null}>
          <FeedPreview />
        </Suspense>
      </SectionWrapper>

      {/* 4. 라운지 프리뷰 */}
      <SectionWrapper config={HOME_SECTIONS.LOUNGE}>
        <LoungePreview />
      </SectionWrapper>

      {/* 5. 게시판 프리뷰 */}
      <SectionWrapper config={HOME_SECTIONS.BOARD}>
        <BoardPreview />
      </SectionWrapper>

      {/* 6. 기록관 프리뷰 */}
      <SectionWrapper
        config={HOME_SECTIONS.ARCHIVE}
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
