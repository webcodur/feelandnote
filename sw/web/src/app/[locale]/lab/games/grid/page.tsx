import { getGridGameData } from "@/actions/game/grid";
import GridGame from "@/components/features/game/grid/GridGame";

export const metadata = { title: "교차 격자 | Lab" };

// 실험 게임은 매 요청 서버에서 그린다(문구·인물 데이터가 요청 맥락에 의존).
// 선언하지 않으면 Next가 정적 생성을 시도했다 실패하며 빌드 로그에 오류를 남긴다.
export const dynamic = "force-dynamic";

export default async function GridGamePage() {
  const { celebs, conditions, isFixture } = await getGridGameData();

  return (
    <section className="flex min-h-screen flex-col">
      <GridGame celebs={celebs} conditions={conditions} isFixture={isFixture} />
    </section>
  );
}
