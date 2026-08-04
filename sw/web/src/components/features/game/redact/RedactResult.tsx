'use client';

import { useTranslations } from 'next-intl';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import type { RedactGameState, RedactRoundData } from './types';
import { getRevealedRatio } from './engine';

interface Props {
  state: RedactGameState;
  roundData: RedactRoundData;
  onReplay: () => void;
  onLobby: () => void;
}

export default function RedactResult({ state, roundData, onReplay, onLobby }: Props) {
  const t = useTranslations('gameRedact');
  const won = state.phase === 'won';
  const revealedPercent = Math.round(getRevealedRatio(state.tokens) * 100);

  return (
    <div className="m-auto w-full max-w-md px-4 py-6 text-center">
      {/* 결과 아이콘 */}
      <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full ${won ? 'bg-emerald-500/20' : 'bg-zinc-500/20'}`}>
        <Trophy className={`h-8 w-8 ${won ? 'text-emerald-400' : 'text-zinc-400'}`} aria-hidden />
      </div>

      {/* 제목 */}
      <h2 className="mb-2 text-xl font-bold text-text-primary">
        {won ? t('result.wonTitle') : t('result.lostTitle')}
      </h2>

      {/* 정답 인물 공개 */}
      <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-text-secondary">{t('result.answerLabel')}</p>
        <p className="mt-1 text-lg font-bold text-text-primary">
          {roundData.nickname}
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {roundData.profession} · {roundData.birthDeath}
          {roundData.nationality && ` · ${roundData.nationality}`}
        </p>
      </div>

      {/* 통계 */}
      <div className="mb-6 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-lg font-bold text-text-primary">{state.guesses.length}</p>
          <p className="text-[11px] text-text-secondary">{t('result.guessCount')}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-lg font-bold text-text-primary">{revealedPercent}%</p>
          <p className="text-[11px] text-text-secondary">{t('result.revealedPercent')}</p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm text-emerald-200 hover:border-emerald-400/50 hover:text-emerald-100 active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {t('result.replay')}
        </button>
        <button
          type="button"
          onClick={onLobby}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-text-secondary hover:border-white/20 hover:text-text-primary active:scale-[0.98]"
        >
          <Home className="h-4 w-4" aria-hidden />
          {t('result.lobby')}
        </button>
      </div>
    </div>
  );
}
