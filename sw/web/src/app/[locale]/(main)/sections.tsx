/*
  파일명: /app/(main)/sections.tsx
  기능: 홈 구획 — 오늘의 인물·방문자 첫인사·공지사항 각각의 조회와 실패 처리
  책임: 구획 하나가 자기 조회만 기다리게 하고, 실패하면 제자리에 다시 시도 안내를 세운다.
        홈의 적층 순서는 page.tsx가 쥔다 — 여기는 구획 본문만 만든다.
*/ // ------------------------------

import { getRequestUser } from "@/lib/db/server";
import { RetryBlock } from "@/components/ui/pending";
import { getTodayFigure } from "@/actions/library";
import type { TodayFigureResult } from "@/actions/library";
import HomeIntroPanel from "./about/HomeIntroPanel";
import TodayFigureSection from "@/components/features/figure/TodayFigureSection";
import HomeNoticeSection from "@/components/features/home/HomeNoticeSection";
import HomeFeaturedReviewSample from "@/components/features/home/HomeFeaturedReviewSample";
import HomeFreeBoardSection from "@/components/features/home/HomeFreeBoardSection";

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
  // data-nosnippet: 매일 바뀌는 인물 소개가 홈의 검색 스니펫을 차지하지 않게 한다.
  // site: 결과에서 홈 설명이 그날 인물의 소개문으로 나왔다(26.09.11 실측). 색인·순위에는 영향이 없다.
  return (
    <div data-nosnippet>
      <TodayFigureSection
        figure={result.figure}
        contents={result.contents}
        date={result.date}
        source={result.source}
        embedded
      />
    </div>
  );
}

/** 방문자 첫인사 액자 — 서비스를 모르는 사람을 위한 것이라 로그인 유저에게는 그리지 않는다.
 *  첫인사 액자는 여기가 유일한 자리다(/about 계약 유지). 로그인 판정 실패는 방문자로 취급한다 */
export async function VisitorIntroSection() {
  let isLoggedIn = false;
  try {
    const {
      data: { user },
    } = await getRequestUser();
    isLoggedIn = !!user;
  } catch (error) {
    console.error("[home] 로그인 판정 실패:", error);
  }

  if (isLoggedIn) return null;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <HomeIntroPanel />
    </div>
  );
}

// #region 빠른기록 — 일단 주석 처리
// 로그인 유저의 기록 도구(빠른기록)를 홈 구획 사이에 두었으나, 설명·목차 없이 끼어 들어가 서비스 앞단에서 의미가 약해 뺐다.
// 재투입 여부는 상황에 맞게 정한다. 되살릴 때는 아래 주석을 풀고 page.tsx의 「빠른기록 자리」 주석 위치에 넣는다.
// 관련 부품(QuickRecordDock·HomeRecordSection·quickRecord/homeSection)과 번역(home.ui.quickRecordDock·quickRecord.home)은
// 지우지 않고 둔다.
//
// import { getTranslations } from "next-intl/server";
// import { getUserContents, type UserContentPublic } from "@/actions/contents/getUserContents";
// import { getProfile, type UserProfile } from "@/actions/user/getProfile";
// import { getQuickRecordSuggestions, type LibraryContent } from "@/actions/library";
// import HomeRecordSection from "@/components/features/quickRecord/HomeRecordSection";
// import QuickRecordDock from "@/components/features/home/QuickRecordDock";
//
// export async function QuickRecordSection() {
//   let userId: string | null = null;
//   try {
//     const db = await createClient();
//     const { data: { user } } = await db.auth.getUser();
//     userId = user?.id ?? null;
//   } catch (error) {
//     console.error("[home] 로그인 판정 실패:", error);
//   }
//   if (!userId) return null;
//
//   let unreviewedResult: { items: UserContentPublic[] } = { items: [] };
//   let reviewedResult: { items: UserContentPublic[] } = { items: [] };
//   let profile: UserProfile | null = null;
//   let initialSuggestions: LibraryContent[] = [];
//   try {
//     [unreviewedResult, reviewedResult, profile, initialSuggestions] = await Promise.all([
//       getUserContents({ userId, hasReview: false, limit: 10, sortBy: "recent" }),
//       getUserContents({ userId, hasReview: true, limit: 10, sortBy: "recent" }),
//       getProfile(),
//       getQuickRecordSuggestions("BOOK"),
//     ]);
//   } catch (error) {
//     console.error("[home] 빠른기록 조회 실패:", error);
//     return <RetryBlock />;
//   }
//
//   const t = await getTranslations("home.ui.quickRecordDock");
//   // userId를 빠뜨리면 로그인한 사람도 손님으로 취급돼 기록이 기기에만 남는다
//   return (
//     <QuickRecordDock title={t("title")}>
//       <HomeRecordSection
//         embedded
//         userId={userId}
//         unreviewedList={unreviewedResult.items}
//         reviewedList={reviewedResult.items}
//         profile={profile}
//         initialSuggestions={initialSuggestions}
//       />
//     </QuickRecordDock>
//   );
// }
// #endregion

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

export async function FeaturedReviewSection() {
  let content: Awaited<ReturnType<typeof HomeFeaturedReviewSample>>;
  try {
    content = await HomeFeaturedReviewSample();
  } catch (error) {
    console.error("[home] 주목할 만한 감상 조회 실패:", error);
    return <RetryBlock />;
  }
  return content;
}

export async function FreeBoardSection({ sectionId }: { sectionId: string }) {
  let content: Awaited<ReturnType<typeof HomeFreeBoardSection>>;
  try {
    content = await HomeFreeBoardSection({ sectionId });
  } catch (error) {
    console.error("[home] 자유게시판 조회 실패:", error);
    return <div id={sectionId}><RetryBlock /></div>;
  }
  return content;
}
