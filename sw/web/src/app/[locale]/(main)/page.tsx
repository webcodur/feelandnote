import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedAlternates, getWebSiteJsonLd } from "@/lib/seo";
import HomeIntroPanel from "./about/HomeIntroPanel";

export async function generateMetadata() {
  const t = await getTranslations("site");
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: await getLocalizedAlternates("/"),
  };
}
import { getUserContents } from "@/actions/contents/getUserContents";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import HomeRecordSection from "@/components/features/quickRecord/HomeRecordSection";
import TodayFigureSection from "@/components/features/figure/TodayFigureSection";
import HomeFreeBoardSection from "@/components/features/home/HomeFreeBoardSection";
import HomeTabSection from "@/components/features/home/HomeTabSection";
import { HomeNavigationLinks } from "@/components/features/home/HomeNavigationLinks";

import { getProfile } from "@/actions/user/getProfile";
import { getTodayFigure, getQuickRecordSuggestions } from "@/actions/library";
import PopularBooks from "@/components/features/home/PopularBooks";
import YoutubeChannelLink from "@/components/features/home/YoutubeChannelLink";

export default async function MainPage() {
  const [supabase, t, siteT] = await Promise.all([
    createClient(),
    getTranslations("home.ui.tabs"),
    getTranslations("site"),
  ]);
  const webSiteJsonLd = getWebSiteJsonLd(siteT("description"));
  // 환영판은 첫인사 액자만 세운다. 맺음 문장이 서비스 소개(/about)로 가는 문이다
  const aboutPanel = <HomeIntroPanel />;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. 작성 대기 중인 목록 (리뷰 없음)
  const unreviewedPromise = user 
    ? getUserContents({ userId: user.id, hasReview: false, limit: 10, sortBy: 'recent' }) 
    : Promise.resolve({ items: [] });

  // 2. 나의 최근 기록 (리뷰 있음)
  const reviewedPromise = user 
    ? getUserContents({ userId: user.id, hasReview: true, limit: 10, sortBy: 'recent' }) 
    : Promise.resolve({ items: [] });
    
  // 3. 사용자 프로필
  const profilePromise = getProfile();

  // 4. 오늘의 인물 (Today's Figure)
  const todayFigurePromise = getTodayFigure();



  const [unreviewedResult, reviewedResult, profile, todayFigureResult, initialSuggestions] = await Promise.all([
    unreviewedPromise, 
    reviewedPromise,
    profilePromise,
    todayFigurePromise,
    getQuickRecordSuggestions('BOOK')
  ]);

  const RecordSection = (
    <HomeRecordSection
        unreviewedList={unreviewedResult.items}
        reviewedList={reviewedResult.items}
        profile={profile}
        initialSuggestions={initialSuggestions}
    />
  );

  const FigureSectionContent = (
    <div className="flex flex-col gap-12">
      {todayFigureResult.figure && (
        <TodayFigureSection figure={todayFigureResult.figure} contents={todayFigureResult.contents} source={todayFigureResult.source} />
      )}

      <YoutubeChannelLink />

      <HomeNavigationLinks />
    </div>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      {/* 비동기 서버 페이지가 클라이언트 구획(HomeTabSection 등)을 그리므로 intl 컨텍스트를 재공급한다(code-rules.md) */}
      <AsyncIntlProvider>
        <div className="pb-20">
          <HomeTabSection
            recordSection={RecordSection}
            figureSection={FigureSectionContent}
            freeSection={<HomeFreeBoardSection />}
            aboutPanel={aboutPanel}
            brandHeading={siteT("brandHeading")}
            brandAlias={siteT("brandAlias")}
            labels={{
              todayFigure: t("todayFigure"),
              quickRecord: t("quickRecord"),
              freeBoard: t("freeBoard"),
            }}
          />
          {/* 제휴 도서 — 링크가 걸린 책이 없거나 영문 화면이면 컴포넌트가 스스로 접는다 */}
          <PopularBooks />
        </div>
      </AsyncIntlProvider>
    </>
  );
}
