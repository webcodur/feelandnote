'use client';

import { Target, Trophy } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ProximityCeleb, ProximityGuessResult } from './types';

interface Props {
  target: ProximityCeleb;
  guesses: ProximityGuessResult[];
  gaveUp: boolean;
  bestGuesses: number | null;
  onReplay: () => void;
  onLobby: () => void;
}

export default function ProximityResult({
  target,
  guesses,
  gaveUp,
  bestGuesses,
  onReplay,
  onLobby,
}: Props) {
  const t = useTranslations('gameProximity');
  const won = !gaveUp && guesses.some((g) => g.isCorrect);
  const guessCount = guesses.length;

  return (
    <div className="m-auto w-full max-w-2xl py-4 text-center sm:py-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent sm:h-16 sm:w-16">
        {won ? (
          <Trophy className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        ) : (
          <Target className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        )}
      </div>

      <p className="mt-4 font-cinzel text-[9px] font-bold tracking-[0.24em] text-accent/70 sm:mt-5 sm:text-[10px]">
        {won ? 'FOUND!' : 'REVEALED'}
      </p>

      <h1 className="mt-2 font-serif text-2xl font-black text-text-primary sm:text-3xl">
        {won ? t('result.wonTitle') : t('result.lostTitle')}
      </h1>

      {/* 정답 공개 */}
      <div className="mx-auto mt-4 inline-flex items-center gap-3 rounded-xl border border-accent/25 bg-bg-main/70 px-5 py-3">
        {target.avatar_url ? (
          <Image src={target.avatar_url} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
            {target.nickname.charAt(0)}
          </div>
        )}
        <div className="text-left">
          <p className="font-serif text-lg font-bold text-text-primary">{target.nickname}</p>
          {target.nickname_en && (
            <p className="text-xs text-text-secondary">{target.nickname_en}</p>
          )}
        </div>
      </div>

      {/* 통계 */}
      <div className="mt-5 rounded-2xl border border-accent/20 bg-bg-main/75 p-4 backdrop-blur-sm sm:mt-7 sm:p-5">
        <div className="grid grid-cols-2 divide-x divide-white/10">
          <div className="px-3">
            <p className="font-cinzel text-2xl font-black text-accent">{guessCount}</p>
            <p className="mt-1 text-[10px] text-text-secondary">{t('result.guessCount')}</p>
          </div>
          <div className="px-3">
            <p className="font-cinzel text-2xl font-black text-text-primary">
              {won ? t('result.success') : t('result.gaveUp')}
            </p>
            <p className="mt-1 text-[10px] text-text-secondary">{t('result.outcome')}</p>
          </div>
        </div>
      </div>

      {bestGuesses !== null && (
        <p className="mt-3 text-xs font-bold text-accent/80">
          {t('bestRecord', { count: bestGuesses })}
        </p>
      )}

      <div className="mt-5 flex flex-col justify-center gap-2 sm:mt-6 sm:flex-row">
        <button
          type="button"
          onClick={onReplay}
          className="min-h-12 rounded-xl border border-accent/45 bg-accent/15 px-6 py-3 font-serif text-sm font-bold text-accent hover:border-accent hover:bg-accent/25 active:scale-[0.98]"
        >
          {t('result.replay')}
        </button>
        <button
          type="button"
          onClick={onLobby}
          className="min-h-12 rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-serif text-sm font-bold text-text-primary hover:border-white/35 hover:bg-white/10 active:scale-[0.98]"
        >
          {t('result.lobby')}
        </button>
      </div>
    </div>
  );
}
