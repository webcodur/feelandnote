'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import GameFullScreen, { type BreadcrumbItem } from '@/components/shared/GameFullScreen';
import { pickPair, judgeChoice, updateRecentIds, historyToRecentIds } from './engine';
import MorelessLobby from './MorelessLobby';
import MorelessBoard from './MorelessBoard';
import MorelessResult from './MorelessResult';
import type { MorelessCeleb, MorelessPair, MorelessPhase, MorelessRoundResult } from './types';
import { REVEAL_DELAY_MS } from './types';

interface Props {
  celebs: MorelessCeleb[];
  isFixtureMode: boolean;
}

const BEST_STREAK_KEY = 'feelandnote:moreless:best-streak';

export default function MorelessGame({ celebs, isFixtureMode }: Props) {
  const t = useTranslations('gameMoreless');
  const tGame = useTranslations('shared.game');

  const [phase, setPhase] = useState<MorelessPhase>('lobby');
  const [currentPair, setCurrentPair] = useState<MorelessPair | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState<number | null>(null);
  const [roundHistory, setRoundHistory] = useState<MorelessRoundResult[]>([]);
  /** 최근 사용된 인물 ID 이력 (쿨다운 관리) */
  const [recentHistory, setRecentHistory] = useState<string[][]>([]);
  /** 마지막 선택 결과 — reveal 중 표시용 */
  const [lastResult, setLastResult] = useState<MorelessRoundResult | null>(null);

  // 로컬 스토리지에서 최고 기록 로드
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = Number(window.localStorage.getItem(BEST_STREAK_KEY));
      if (Number.isFinite(stored) && stored > 0) setBestStreak(stored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const startGame = useCallback(() => {
    setStreak(0);
    setRoundHistory([]);
    setRecentHistory([]);
    setLastResult(null);

    const pair = pickPair(celebs, new Set());
    if (!pair) return;
    setCurrentPair(pair);
    setPhase('playing');
  }, [celebs]);

  const handleChoice = useCallback((chosen: 'left' | 'right') => {
    if (!currentPair || phase !== 'playing') return;

    const correct = judgeChoice(currentPair, chosen);
    const result: MorelessRoundResult = { pair: currentPair, chosen, correct };

    setLastResult(result);
    setRoundHistory((prev) => [...prev, result]);
    setRecentHistory((prev) => updateRecentIds(prev, currentPair));

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);

      // 최고 기록 갱신
      if (bestStreak === null || newStreak > bestStreak) {
        setBestStreak(newStreak);
        window.localStorage.setItem(BEST_STREAK_KEY, String(newStreak));
      }

      // 정답 연출 후 다음 문제
      setPhase('reveal');
      setTimeout(() => {
        const recentIds = historyToRecentIds(
          updateRecentIds(recentHistory, currentPair)
        );
        const pair = pickPair(celebs, recentIds);
        if (pair) {
          setCurrentPair(pair);
          setPhase('playing');
        } else {
          // 후보 소진 — 결과로
          setPhase('result');
        }
      }, REVEAL_DELAY_MS);
    } else {
      // 오답 — 게임 종료
      setPhase('reveal');
      setTimeout(() => {
        setPhase('result');
      }, REVEAL_DELAY_MS + 400);
    }
  }, [bestStreak, celebs, currentPair, phase, recentHistory, streak]);

  const returnToLobby = useCallback(() => {
    setPhase('lobby');
    setCurrentPair(null);
    setStreak(0);
    setRoundHistory([]);
    setRecentHistory([]);
    setLastResult(null);
  }, []);

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: t('title'), onClick: returnToLobby }];
    if (phase === 'playing' || phase === 'reveal') {
      items.push({ label: t('playing') });
    }
    if (phase === 'result') {
      items.push({ label: t('resultBreadcrumb') });
    }
    return items;
  }, [phase, returnToLobby, t]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      onHome={returnToLobby}
      initialFullScreen
      reserveSubtitleSpace={false}
      exitLabel={tGame('exit')}
      exitEscLabel={tGame('exitEsc')}
      background={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.05),rgba(18,18,18,0.85)_55%,rgba(18,18,18,0.98)_100%)]" />
          <div className="absolute inset-0 bg-bg-main/40" />
        </>
      }
    >
      {/* 체험 모드 배너 */}
      {isFixtureMode && (
        <div className="mx-auto mb-3 flex max-w-md items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{t('fixtureNotice')}</span>
        </div>
      )}

      {phase === 'lobby' ? (
        <MorelessLobby onStart={startGame} bestStreak={bestStreak} />
      ) : phase === 'result' ? (
        <MorelessResult
          streak={streak}
          bestStreak={bestStreak}
          history={roundHistory}
          onReplay={startGame}
          onLobby={returnToLobby}
        />
      ) : currentPair ? (
        <MorelessBoard
          pair={currentPair}
          streak={streak}
          onChoice={handleChoice}
          lastResult={lastResult}
          isRevealing={phase === 'reveal'}
        />
      ) : null}
    </GameFullScreen>
  );
}
