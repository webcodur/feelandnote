/*
  파일명: /components/features/home/HomeFigureLinks.tsx
  기능: 홈 인물 명부 본문 — 검색이 급증한 인물 링크 격자
  책임: 구획 제목·부제·더보기는 홈의 HubSection이 쥔다. 여기는 격자만 그린다.
        국가는 탐색에서 직접 고른 국가, 방문자 국가, KR 순으로 정한다.
        명부 자격을 통과한 급상승 인물이 없으면 다른 인물로 대체하지 않고 안내한다.
*/

import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getTrendingCelebLinks } from "@/actions/home/getCelebs";
import { resolveTrendCountry, TREND_COUNTRY_COOKIE } from "@/constants/trendCountries";
import FigureLinkGrid, { type FigureLinkItem } from "@/components/features/celeb/FigureLinkGrid";

/** 홈에서 지목할 인물 수. 늘리면 링크 하나하나의 무게가 옅어지고 화면에는 벽이 선다.
 *  전량 커버는 인물 사전과 직군 명부가 맡는다(docs/project/operations/ops-02-seo.md).
 *  기다림 표시가 같은 칸 수로 서도록 page.tsx가 이 값을 가져다 쓴다 */
export const HOME_FIGURE_LINK_COUNT = 6;

/** 홈 명부의 열 구성 — 6명을 3행 2열로 세운다. 기다림 표시가 같은 모양이 되도록
 *  page.tsx의 FigureLinkGridPending에도 같은 값을 넘긴다 */
export const HOME_FIGURE_LINK_COLS = "grid-cols-1 sm:grid-cols-2";

/** 기록이 있는 급상승 인물을 보여 주고, 기록이 전혀 없는 상세는 제외한다. */
const MIN_CONTENT_COUNT = 1;

export default async function HomeFigureLinks() {
  const [requestCookies, requestHeaders, t] = await Promise.all([cookies(), headers(), getTranslations("home.ui.trends")]);
  const country = resolveTrendCountry(undefined, requestCookies.get(TREND_COUNTRY_COOKIE)?.value, requestHeaders.get("CF-IPCountry"));
  // 조회만 try로 감싼다 — 성공 경로의 JSX 구성은 밖에서 한다(react-hooks/error-boundaries)
  let figures: FigureLinkItem[] = [];
  try {
    const trending = await getTrendingCelebLinks(country, HOME_FIGURE_LINK_COUNT, MIN_CONTENT_COUNT);
    figures = trending.map(({ trend, ...row }) => ({
      ...row,
      trendMatch: trend,
    }));
  } catch (error) {
    console.error("[home] 인물 명부 조회 실패:", error);
  }

  if (figures.length === 0) {
    return <p className="py-6 text-center text-sm text-text-secondary">{t("homeEmpty")}</p>;
  }
  return <FigureLinkGrid figures={figures} cols={HOME_FIGURE_LINK_COLS} />;
}
