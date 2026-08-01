import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { getProfilesBySlugs } from "@/actions/celebs/getProfilesBySlugs";

export async function generateMetadata() {
  const t = await getTranslations("site");
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: await getLocalizedAlternates("/"),
  };
}
import { getUserContents } from "@/actions/contents/getUserContents";
import { getRecentContents } from "@/actions/contents/getRecentContents";
import HomeRecordSection from "@/components/features/quickRecord/HomeRecordSection";
import TodayFigureSection from "@/components/features/figure/TodayFigureSection";
import HomeFreeBoardSection from "@/components/features/home/HomeFreeBoardSection";
import HomeTabSection from "@/components/features/home/HomeTabSection";
import { HomeNavigationLinks } from "@/components/features/home/HomeNavigationLinks";

import { getProfile } from "@/actions/user/getProfile";
import { getTodayFigure, getQuickRecordSuggestions } from "@/actions/library";
import PopularBooks from "@/components/features/home/PopularBooks";
import YoutubeChannelLink from "@/components/features/home/YoutubeChannelLink";

// #region 스켈레톤
function HomeSectionSkeleton() {
  return (
    <div className="w-full flex flex-col gap-8 animate-pulse">
      {/* 프로필 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/5" />
        <div className="h-5 w-32 bg-white/5 rounded" />
      </div>
      {/* 카테고리 탭 + 검색바 */}
      <div className="space-y-4">
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-12 bg-white/5 rounded-full" />
          ))}
        </div>
        <div className="h-10 w-full bg-white/5 rounded-lg" />
      </div>
      {/* 에디터 영역 */}
      <div className="h-[200px] bg-white/5 rounded-xl" />
    </div>
  );
}
// #endregion

export default async function MainPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = await getTranslations("home.ui.tabs");
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

  const rawChains = t.raw("inspirationChains") as { reader: string; author: string; text: string }[][];
  const slugSet = new Set<string>();
  rawChains.forEach(chain => chain.forEach(step => {
    slugSet.add(step.reader);
    slugSet.add(step.author);
  }));

  // 캐시 키 안정화 — 명단 순서가 흔들려도 같은 캐시를 쓴다
  const profileMap = await getProfilesBySlugs(Array.from(slugSet).sort());

  const isEn = locale === 'en';
  const inspirationChains = rawChains.map(chain => 
    chain.map(step => {
      const r = profileMap[step.reader];
      const a = profileMap[step.author];
      return {
        text: step.text,
        reader: r ? { avatar_url: r.avatar_url, name: (isEn ? r.nickname_en || r.nickname : r.nickname) ?? step.reader } : null,
        author: a ? { avatar_url: a.avatar_url, name: (isEn ? a.nickname_en || a.nickname : a.nickname) ?? step.author } : null,
      };
    })
  );

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
    <div className="pb-20">
      <HomeTabSection
        recordSection={RecordSection}
        figureSection={FigureSectionContent}
        freeSection={<HomeFreeBoardSection />}
        labels={{
          intro: t("intro"),
          introSub: t("introSub"),
          introLink: t("introLink"),
          todayFigure: t("todayFigure"),
          quickRecord: t("quickRecord"),
          freeBoard: t("freeBoard"),
          inspirationChainTitle: t("inspirationChainTitle"),
          inspirationChains: inspirationChains,
          inspirationConclusion: t("inspirationConclusion"),
        }}
      />
      {/* 쿠팡 제휴: AdSense 승인 전까지 비활성 */}
      {/* {locale === 'ko' && <PopularBooks />} */}
    </div>
  );
}
