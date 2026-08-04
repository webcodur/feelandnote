/**
 * /ko/lab/games/proximity — 근접도 게임 단독 시험 화면
 *
 * DB 접속 불가 시 체험 표본으로 대체. 화면에 그 사실을 명시한다.
 */
import ProximityGame from '@/components/features/game/proximity/ProximityGame';
import { getProximityCelebs } from '@/actions/game/proximity';
import { FIXTURE_CELEBS } from '@/components/features/game/proximity/fixture';
import type { ProximityCelebFull } from '@/components/features/game/proximity/types';

// 실험 게임은 매 요청 서버에서 그린다(문구·인물 데이터가 요청 맥락에 의존).
// 선언하지 않으면 Next가 정적 생성을 시도했다 실패하며 빌드 로그에 오류를 남긴다.
export const dynamic = "force-dynamic";

export default async function ProximityGamePage() {
  let celebs: ProximityCelebFull[];
  let isFixtureMode = false;

  try {
    celebs = await getProximityCelebs();
    if (!celebs || celebs.length === 0) {
      throw new Error('No celebs returned from DB');
    }
  } catch (err) {
    // DB 접속 실패 → 체험 표본 사용 (조용한 폴백 금지 — 화면에 표시하고 서버 로그에도 남긴다)
    console.error('[proximity] 실제 조회 실패 → 체험 표본으로 전환:', err);
    celebs = FIXTURE_CELEBS;
    isFixtureMode = true;
  }

  return <ProximityGame celebs={celebs} isFixtureMode={isFixtureMode} />;
}
