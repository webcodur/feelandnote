/**
 * /ko/lab/games/travel — 경로 잇기 게임 단독 시험 화면
 *
 * DB 접속 불가 시 체험 표본으로 대체. 화면에 그 사실을 명시한다.
 */
import TravelGame from "@/components/features/game/travel/TravelGame";
import { getTravelGameData } from "@/actions/game/travel";

export const metadata = { title: "경로 잇기 | Lab" };

// 실험 게임은 매 요청 서버에서 그린다(문구·인물 데이터가 요청 맥락에 의존).
// 선언하지 않으면 Next가 정적 생성을 시도했다 실패하며 빌드 로그에 오류를 남긴다.
export const dynamic = "force-dynamic";

export default async function TravelGamePage() {
  const { graph, isFixture } = await getTravelGameData();

  return (
    <section className="flex min-h-screen flex-col">
      <TravelGame graph={graph} isFixture={isFixture} />
    </section>
  );
}
