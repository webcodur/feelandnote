/*
  파일명: /components/features/home/HomeFigureLinks.tsx
  기능: 홈 인물 명부 본문 — 기록이 쌓인 인물 링크 격자
  책임: 구획 제목·부제·더보기는 홈의 HubSection이 쥔다. 여기는 격자만 그린다.
        인물 상세가 인물 사전(/explore/directory) 한 곳에서만 링크되던 구조를 홈에서도 잇는다.
*/

import { getCelebs } from "@/actions/home";
import FigureLinkGrid from "@/components/features/celeb/FigureLinkGrid";

/** 홈에서 지목할 인물 수. 늘리면 링크 하나하나의 무게가 옅어지고 화면에는 벽이 선다.
 *  전량 커버는 인물 사전과 직군 명부가 맡는다(docs/project/operations/seo.md).
 *  기다림 표시가 같은 칸 수로 서도록 page.tsx가 이 값을 가져다 쓴다 */
export const HOME_FIGURE_LINK_COUNT = 6;

/** 기록이 이만큼 쌓인 인물만 세운다 — 빈 상세로 보내면 링크가 신뢰를 깎는다 */
const MIN_CONTENT_COUNT = 5;

export default async function HomeFigureLinks() {
  // 조회만 try로 감싼다 — 성공 경로의 JSX 구성은 밖에서 한다(react-hooks/error-boundaries)
  let celebs: Awaited<ReturnType<typeof getCelebs>>["celebs"] = [];
  try {
    ({ celebs } = await getCelebs({
      sortBy: "content_count",
      minContentCount: MIN_CONTENT_COUNT,
      limit: HOME_FIGURE_LINK_COUNT,
    }));
  } catch (error) {
    // 홈의 부가 구획이다. 재시도 안내를 세우지 않고 조용히 접는다
    console.error("[home] 인물 명부 조회 실패:", error);
    return null;
  }

  return <FigureLinkGrid figures={celebs} />;
}
