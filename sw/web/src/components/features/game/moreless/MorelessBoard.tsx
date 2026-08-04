'use client';

import { useTranslations } from 'next-intl';
import { ArrowUp, Check, X } from 'lucide-react';
import type { MorelessPair, MorelessRoundResult } from './types';

interface Props {
  pair: MorelessPair;
  streak: number;
  onChoice: (side: 'left' | 'right') => void;
  lastResult: MorelessRoundResult | null;
  isRevealing: boolean;
}

export default function MorelessBoard({ pair, streak, onChoice, lastResult, isRevealing }: Props) {
  const t = useTranslations('gameMoreless');

  const isRevealingThisPair = isRevealing && lastResult?.pair === pair;

  return (
    <div className="m-auto flex w-full max-w-3xl flex-col items-center px-2 py-3 sm:py-6">
      {/* 연속 정답 카운터 */}
      <div className="mb-4 flex items-center gap-2 sm:mb-6">
        <span className="text-xs text-text-secondary">{t('streak')}</span>
        <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 font-mono text-sm font-bold text-accent">
          {streak}
        </span>
      </div>

      {/* 질문 */}
      <p className="mb-4 text-center text-sm text-text-secondary sm:mb-6 sm:text-base">
        {t('question')}
      </p>

      {/* 두 카드 */}
      <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:gap-4">
        <CelebCard
          celeb={pair.left}
          side="left"
          onChoice={onChoice}
          isRevealing={isRevealingThisPair}
          wasChosen={isRevealingThisPair && lastResult?.chosen === 'left'}
          wasCorrect={isRevealingThisPair ? lastResult?.correct ?? false : false}
        />

        {/* VS 구분자 */}
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-cinzel text-xs font-bold tracking-wider text-text-secondary">
            VS
          </span>
        </div>

        <CelebCard
          celeb={pair.right}
          side="right"
          onChoice={onChoice}
          isRevealing={isRevealingThisPair}
          wasChosen={isRevealingThisPair && lastResult?.chosen === 'right'}
          wasCorrect={isRevealingThisPair ? lastResult?.correct ?? false : false}
        />
      </div>

      {/* 안내 문구 */}
      <p className="mt-4 text-center text-[10px] text-text-secondary/60 sm:mt-6 sm:text-xs">
        {t('hint')}
      </p>
    </div>
  );
}

// ─── 인물 카드 ───

interface CelebCardProps {
  celeb: { nickname: string; nickname_en: string | null; profession: string | null; total_score: number };
  side: 'left' | 'right';
  onChoice: (side: 'left' | 'right') => void;
  isRevealing: boolean;
  wasChosen: boolean;
  wasCorrect: boolean;
}

function CelebCard({ celeb, side, onChoice, isRevealing, wasChosen, wasCorrect }: CelebCardProps) {
  const t = useTranslations('gameMoreless');

  const handleClick = () => {
    if (isRevealing) return;
    onChoice(side);
  };

  // 정답/오답 테두리 색
  let borderClass = 'border-white/15 hover:border-accent/60';
  if (isRevealing && wasChosen) {
    borderClass = wasCorrect ? 'border-green-400/70' : 'border-red-400/70';
  } else if (isRevealing) {
    borderClass = 'border-white/10';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRevealing}
      aria-label={t('cardAriaLabel', { name: celeb.nickname })}
      className={`group relative flex flex-1 flex-col items-center justify-center rounded-2xl border bg-white/[0.03] px-4 py-8 text-center backdrop-blur-sm transition-colors sm:py-12 ${borderClass} ${
        isRevealing ? 'cursor-default' : 'cursor-pointer hover:bg-white/[0.06] active:scale-[0.98]'
      }`}
    >
      {/* 이름 */}
      <h2 className="font-serif text-lg font-black text-text-primary sm:text-2xl">
        {celeb.nickname}
      </h2>
      {celeb.nickname_en && (
        <p className="mt-1 text-xs text-text-secondary/70">{celeb.nickname_en}</p>
      )}

      {/* 점수 — 공개 전에는 "?" */}
      <div className="mt-4 flex flex-col items-center gap-1">
        {isRevealing ? (
          <span className="animate-fade-in-up font-mono text-3xl font-black text-accent sm:text-4xl">
            {celeb.total_score}
          </span>
        ) : (
          <span className="font-mono text-3xl font-black text-white/20 sm:text-4xl">?</span>
        )}
        <span className="text-[10px] text-text-secondary/60">
          {t('influenceScore')}
        </span>
      </div>

      {/* 선택 화살표 (호버 시) */}
      {!isRevealing && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowUp className="h-4 w-4 text-accent" aria-hidden />
        </div>
      )}

      {/* 정답/오답 아이콘 */}
      {isRevealing && wasChosen && (
        <div className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full ${
          wasCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {wasCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </div>
      )}
    </button>
  );
}
