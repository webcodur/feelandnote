/**
 * /lab/games/topfive — 상위 다섯 단독 시험 화면
 *
 * 이 화면 하나로 시작부터 결과까지 완주 가능.
 * 로그인 불필요, 공개 노출 경로 아님.
 */

import { getTopFiveData } from "@/actions/game/topfive";
import TopFiveGame from "@/components/features/game/topfive/TopFiveGame";

export const metadata = { title: "상위 다섯 | Lab" };

// 실험 게임은 매 요청 서버에서 그린다(문구·인물 데이터가 요청 맥락에 의존).
// 선언하지 않으면 Next가 정적 생성을 시도했다 실패하며 빌드 로그에 오류를 남긴다.
export const dynamic = "force-dynamic";

export default async function TopFiveLabPage() {
  const { pool, isFixture } = await getTopFiveData();
  return <TopFiveGame pool={pool} isFixture={isFixture} />;
}
