'use client';

import { useCallback, useState } from 'react';
import RedactGame from './RedactGame';
import { getFixtureRound } from './fixture';
import type { RedactRoundData } from './types';

interface Props {
  initialRound: RedactRoundData;
  isFixtureMode: boolean;
}

/**
 * 클라이언트 래퍼: 새 라운드 전환을 관리한다.
 * fixture 모드에서는 클라이언트에서 직접 새 표본을 뽑는다.
 * 배포 모드에서는 서버 액션을 호출한다 (현재 fixture만 구현).
 */
export default function RedactGameClient({ initialRound, isFixtureMode }: Props) {
  const [roundData, setRoundData] = useState<RedactRoundData>(initialRound);
  const [roundKey, setRoundKey] = useState(0);

  const handleNewRound = useCallback(() => {
    // fixture 모드: 클라이언트에서 새 표본 뽑기
    // 배포 모드: 페이지 새로고침으로 서버 액션 재호출 (SPA 내 라우팅)
    if (isFixtureMode) {
      setRoundData(getFixtureRound());
      setRoundKey((k) => k + 1);
    } else {
      // 배포 환경에서는 전체 리로드로 새 라운드 (서버 사이드 랜덤)
      window.location.reload();
    }
  }, [isFixtureMode]);

  return (
    <RedactGame
      key={roundKey}
      roundData={roundData}
      isFixtureMode={isFixtureMode}
      onNewRound={handleNewRound}
    />
  );
}
