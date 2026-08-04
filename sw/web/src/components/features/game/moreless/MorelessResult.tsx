'use client';

import { useTranslations } from 'next-intl';
import { Flame, RotateCcw, Home, Trophy } from 'lucide-react';
import type { MorelessRoundResult } from './types';

interface Props {
  streak: number;
  bestStreak: number | null;
  history: MorelessRoundResult[];
  onReplay: () => void;
  onLobby: () => void;
}

export default function MorelessResult({ streak, bestStreak, history, onReplay, onLobby }: Props) {
  const t = useTranslations('gameMoreless');
  const isNewRecord = bestStreak !== null && streak === bestStreak && streak > 0;

  return (
    <div className="m-auto w-full max-w-lg px-3 py-4 text-center sm:py-8">
      {/* 제목 */}
      <div className="mb-2 flex items-center justify-center gap-2">
        <Flame className="h-6 w-6 text-accent" aria-hidden />
        <h1 className="font-serif text-xl font-black text-text-primary sm:text-3xl">
          {t('resultTitle')}
        </h1>
      </div>

      {/* 점수 */}
      <p className="mt-4 text-sm text-text-secondary">{t('finalStreak')}</p>
      <p className="mt-1 font-mono text-5xl font-black text-accent sm:text-6xl">{streak}</p>

      {/* 신기록 배지 */}
      {isNewRecord && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
          <Trophy className="h-3.5 w-3.5" aria-hidden />
          {t('newRecord')}
        </div>
      )}

      {/* 최고 기록 */}
      {bestStreak !== null && !isNewRecord && (
        <p className="mt-3 text-xs text-text-secondary">
          {t('bestRecord', { count: bestStreak })}
        </p>
      )}

      {/* 마지막 오답 — 뭐가 달랐는지 */}
      {history.length > 0 && !history[history.length - 1].correct && (
        <div className="mx-auto mt-5 max-w-sm rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left">
          <p className="mb-2 text-xs font-bold text-text-secondary">{t('lastRound')}</p>
          <LastRoundSummary result={history[history.length - 1]} />
        </div>
      )}

      {/* 버튼 */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/45 bg-accent/15 px-6 py-2.5 text-sm font-bold text-accent hover:border-accent hover:bg-accent/25 active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {t('replay')}
        </button>
        <button
          type="button"
          onClick={onLobby}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 text-sm text-text-secondary hover:border-white/30 hover:text-text-primary active:scale-[0.98]"
        >
          <Home className="h-4 w-4" aria-hidden />
          {t('toLobby')}
        </button>
      </div>
    </div>
  );
}

function LastRoundSummary({ result }: { result: MorelessRoundResult }) {
  const t = useTranslations('gameMoreless');
  const { pair } = result;

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex-1">
        <p className="font-bold text-text-primary">{pair.left.nickname}</p>
        <p className="text-text-secondary">{pair.left.total_score} {t('points')}</p>
      </div>
      <span className="mx-2 text-text-secondary/40">vs</span>
      <div className="flex-1 text-right">
        <p className="font-bold text-text-primary">{pair.right.nickname}</p>
        <p className="text-text-secondary">{pair.right.total_score} {t('points')}</p>
      </div>
    </div>
  );
}
