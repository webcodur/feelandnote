/**
 * /ko/lab/games/redact — 가림 해제 게임 단독 시험 화면
 *
 * DB 접속 불가 시 체험 표본으로 대체. 화면에 그 사실을 명시한다.
 */
import RedactGameClient from '@/components/features/game/redact/RedactGameClient';
import { getRedactRound } from '@/actions/game/redact';
import { getFixtureRound } from '@/components/features/game/redact/fixture';
import type { RedactRoundData } from '@/components/features/game/redact/types';

// 실험 게임은 매 요청 서버에서 그린다(문구·인물 데이터가 요청 맥락에 의존).
// 선언하지 않으면 Next가 정적 생성을 시도했다 실패하며 빌드 로그에 오류를 남긴다.
export const dynamic = "force-dynamic";

export default async function RedactGamePage() {
  let roundData: RedactRoundData;
  let isFixtureMode = false;

  try {
    roundData = await getRedactRound();
  } catch (err) {
    // DB 접속 실패 → 체험 표본 사용 (조용한 폴백 금지 — 화면에 표시하고 서버 로그에도 남긴다)
    console.error('[redact] 실제 조회 실패 → 체험 표본으로 전환:', err);
    roundData = getFixtureRound();
    isFixtureMode = true;
  }

  return <RedactGameClient initialRound={roundData} isFixtureMode={isFixtureMode} />;
}
