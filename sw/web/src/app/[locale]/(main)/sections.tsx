/*
  파일명: /app/(main)/sections.tsx
  기능: 홈 탭 구획 — 오늘의 인물·빠른기록·자유게시판 각각의 조회와 실패 처리
  책임: 탭 하나가 자기 조회만 기다리게 하고, 실패하면 제자리에 다시 시도 안내를 세운다.
*/ // ------------------------------

import { createClient } from "@/lib/supabase/server";
import { RetryBlock } from "@/components/ui/pending";
import { getUserContents, type UserContentPublic } from "@/actions/contents/getUserContents";
import { getProfile } from "@/actions/user/getProfile";
import { getTodayFigure, getQuickRecordSuggestions } from "@/actions/library";
import type { TodayFigureResult, LibraryContent } from "@/actions/library";
import type { UserProfile } from "@/actions/user/getProfile";
import HomeRecordSection from "@/components/features/quickRecord/HomeRecordSection";
import TodayFigureSection from "@/components/features/figure/TodayFigureSection";
import HomeFreeBoardSection from "@/components/features/home/HomeFreeBoardSection";
import YoutubeChannelLink from "@/components/features/home/YoutubeChannelLink";
import { HomeNavigationLinks } from "@/components/features/home/HomeNavigationLinks";

/** 오늘의 인물 탭 — 색인 대상. 인물이 없는 날도 있다(오류가 아니다) */
export async function FigureSection() {
  // 조회만 try로 감싼다 — 성공 경로의 JSX 구성은 밖에서 한다(react-hooks/error-boundaries)
  let result: TodayFigureResult;
  try {
    result = await getTodayFigure();
  } catch (error) {
    console.error("[home] 오늘의 인물 조회 실패:", error);
    return <RetryBlock />;
  }

  return (
    <div className="flex flex-col gap-12">
      {result.figure && (
        <TodayFigureSection figure={result.figure} contents={result.contents} source={result.source} />
      )}
      <YoutubeChannelLink />
      <HomeNavigationLinks />
    </div>
  );
}

/** 빠른기록 탭 — 로그인 사용자별 비캐시 조회를 한 레인 안에서 묶는다 */
export async function RecordSection() {
  let unreviewedResult: { items: UserContentPublic[] } = { items: [] };
  let reviewedResult: { items: UserContentPublic[] } = { items: [] };
  let profile: UserProfile | null = null;
  let initialSuggestions: LibraryContent[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    [unreviewedResult, reviewedResult, profile, initialSuggestions] = await Promise.all([
      user
        ? getUserContents({ userId: user.id, hasReview: false, limit: 10, sortBy: "recent" })
        : Promise.resolve({ items: [] }),
      user
        ? getUserContents({ userId: user.id, hasReview: true, limit: 10, sortBy: "recent" })
        : Promise.resolve({ items: [] }),
      getProfile(),
      getQuickRecordSuggestions("BOOK"),
    ]);
  } catch (error) {
    console.error("[home] 빠른기록 조회 실패:", error);
    return <RetryBlock />;
  }

  return (
    <HomeRecordSection
      unreviewedList={unreviewedResult.items}
      reviewedList={reviewedResult.items}
      profile={profile}
      initialSuggestions={initialSuggestions}
    />
  );
}

/** 자유게시판 탭 — 컴포넌트는 그대로 두고 실패만 이 레인에서 잡는다 */
export async function FreeBoardSection() {
  let content: Awaited<ReturnType<typeof HomeFreeBoardSection>>;
  try {
    content = await HomeFreeBoardSection();
  } catch (error) {
    console.error("[home] 자유게시판 조회 실패:", error);
    return <RetryBlock />;
  }
  return content;
}
