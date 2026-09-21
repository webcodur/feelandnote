/*
  파일명: /components/features/home/HomeFigureLinks.tsx
  기능: 홈 인물 명부 본문 — 검색이 급증한 인물 링크 격자
  책임: 구획 제목·부제·더보기는 홈의 HubSection이 쥔다. 여기는 격자만 그린다.
        국가는 탐색과 같은 방식(방문자 국가, 모르면 KR)으로 정한다.
        트렌드 조회가 실패하거나 명부 자격을 통과한 인물이 없으면 기록순 명부로 조용히 대신한다.
*/

import { headers } from "next/headers";
import { getMostRecordedCelebLinks, getTrendingCelebLinks } from "@/actions/home/getCelebs";
import { parseTrendCountry } from "@/constants/trendCountries";
import FigureLinkGrid, { type FigureLinkItem } from "@/components/features/celeb/FigureLinkGrid";

/** 홈에서 지목할 인물 수. 늘리면 링크 하나하나의 무게가 옅어지고 화면에는 벽이 선다.
 *  전량 커버는 인물 사전과 직군 명부가 맡는다(docs/project/operations/seo.md).
 *  기다림 표시가 같은 칸 수로 서도록 page.tsx가 이 값을 가져다 쓴다 */
export const HOME_FIGURE_LINK_COUNT = 6;

/** 기록이 이만큼 쌓인 인물만 세운다 — 빈 상세로 보내면 링크가 신뢰를 깎는다 */
const MIN_CONTENT_COUNT = 5;

export default async function HomeFigureLinks() {
  const country = parseTrendCountry((await headers()).get("CF-IPCountry")) ?? "KR";
  // 조회만 try로 감싼다 — 성공 경로의 JSX 구성은 밖에서 한다(react-hooks/error-boundaries)
  let figures: FigureLinkItem[] = [];
  try {
    const trending = await getTrendingCelebLinks(country, HOME_FIGURE_LINK_COUNT, MIN_CONTENT_COUNT);
    figures = trending.map(({ trend, ...row }) => ({
      ...row,
      trendMatch: trend,
    }));
    if (figures.length === 0) {
      figures = await getMostRecordedCelebLinks(HOME_FIGURE_LINK_COUNT, MIN_CONTENT_COUNT);
    }
  } catch (error) {
    // 홈의 부가 구획이다. 재시도 안내를 세우지 않고 조용히 접는다
    console.error("[home] 인물 명부 조회 실패:", error);
    return null;
  }

  return <FigureLinkGrid figures={figures} />;
}
