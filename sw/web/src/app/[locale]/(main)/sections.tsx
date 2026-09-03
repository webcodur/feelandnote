/*
  파일명: /app/(main)/sections.tsx
  기능: 홈 구획 — 오늘의 인물·빠른기록·자유게시판 각각의 조회와 실패 처리
  책임: 구획 하나가 자기 조회만 기다리게 하고, 실패하면 제자리에 다시 시도 안내를 세운다.
        홈의 적층 순서는 page.tsx가 쥔다 — 여기는 구획 본문만 만든다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/db/server";
import { RetryBlock } from "@/components/ui/pending";
import { getUserContents, type UserContentPublic } from "@/actions/contents/getUserContents";
import { getProfile } from "@/actions/user/getProfile";
import { getTodayFigure, getQuickRecordSuggestions } from "@/actions/library";
import type { TodayFigureResult, LibraryContent } from "@/actions/library";
import type { UserProfile } from "@/actions/user/getProfile";
import HomeIntroPanel from "./about/HomeIntroPanel";
import HomeRecordSection from "@/components/features/quickRecord/HomeRecordSection";
import TodayFigureSection from "@/components/features/figure/TodayFigureSection";
import HomeNoticeSection from "@/components/features/home/HomeNoticeSection";
import QuickRecordDock from "@/components/features/home/QuickRecordDock";

/** 오늘의 인물 — 홈 머리기사. 인물이 없는 날도 있다(오류가 아니다) */
export async function FigureSection() {
  // 조회만 try로 감싼다 — 성공 경로의 JSX 구성은 밖에서 한다(react-hooks/error-boundaries)
  let result: TodayFigureResult;
  try {
    result = await getTodayFigure();
  } catch (error) {
    console.error("[home] 오늘의 인물 조회 실패:", error);
    return <RetryBlock />;
  }

  if (!result.figure) return null;
  return (
    <TodayFigureSection
      figure={result.figure}
      contents={result.contents}
      source={result.source}
      embedded
    />
  );
}

/** 브랜드 줄 아래 한 슬롯 — 방문자에게는 첫인사 액자, 로그인 유저에게는 기록 도구.
 *  첫인사는 서비스를 모르는 사람을 위한 것이고, 도구는 이미 쓰는 사람을 위한 것이라
 *  같은 자리를 상태로 갈라 쓴다. 첫인사 액자는 여기가 유일한 자리다(/about 계약 유지) */
export async function GreetingSection() {
  // 1단계: 로그인 판정만. 판정 실패는 방문자로 취급한다 — 첫인사는 언제나 세울 수 있다
  let userId: string | null = null;
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    userId = user?.id ?? null;
  } catch (error) {
    console.error("[home] 로그인 판정 실패:", error);
  }

  if (!userId) {
    return (
      <div className="mx-auto w-full max-w-3xl px-3 md:px-6">
        <HomeIntroPanel />
      </div>
    );
  }

  // 2단계: 로그인 유저의 기록 도구 조회
  let unreviewedResult: { items: UserContentPublic[] } = { items: [] };
  let reviewedResult: { items: UserContentPublic[] } = { items: [] };
  let profile: UserProfile | null = null;
  let initialSuggestions: LibraryContent[] = [];

  try {
    [unreviewedResult, reviewedResult, profile, initialSuggestions] = await Promise.all([
      getUserContents({ userId, hasReview: false, limit: 10, sortBy: "recent" }),
      getUserContents({ userId, hasReview: true, limit: 10, sortBy: "recent" }),
      getProfile(),
      getQuickRecordSuggestions("BOOK"),
    ]);
  } catch (error) {
    console.error("[home] 빠른기록 조회 실패:", error);
    return <RetryBlock />;
  }

  const t = await getTranslations("home.ui.quickRecordDock");

  return (
    <QuickRecordDock
      title={t("title")}
    >
      {/* userId를 빠뜨리면 로그인한 사람도 손님으로 취급돼 기록이 기기에만 남는다 */}
      <HomeRecordSection
        embedded
        userId={userId}
        unreviewedList={unreviewedResult.items}
        reviewedList={reviewedResult.items}
        profile={profile}
        initialSuggestions={initialSuggestions}
      />
    </QuickRecordDock>
  );
}

/** 공지사항 티저 — 컴포넌트는 그대로 두고 실패만 이 레인에서 잡는다 */
export async function NoticeSection() {
  let content: Awaited<ReturnType<typeof HomeNoticeSection>>;
  try {
    content = await HomeNoticeSection();
  } catch (error) {
    console.error("[home] 공지사항 조회 실패:", error);
    return <RetryBlock />;
  }
  return content;
}