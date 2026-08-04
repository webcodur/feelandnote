'use client';

import type { ReactNode } from 'react';
import { ArrowUpDown, Flame, Sparkles, Trophy, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  onStart: () => void;
  bestStreak: number | null;
}

export default function MorelessLobby({ onStart, bestStreak }: Props) {
  const t = useTranslations('gameMoreless');

  return (
    <div className="m-auto w-full max-w-3xl py-3 text-center sm:py-6">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-accent/35 bg-accent/10 text-accent shadow-[0_0_40px_-14px_rgba(212,175,55,0.8)] sm:mb-5 sm:h-16 sm:w-16">
        <ArrowUpDown className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
      </div>
      <p className="mb-1.5 font-cinzel text-[9px] font-bold tracking-[0.25em] text-accent/70 sm:mb-2 sm:text-[10px] sm:tracking-[0.28em]">
        HIGHER OR LOWER
      </p>
      <h1 className="font-serif text-2xl font-black text-text-primary sm:text-4xl">
        {t('title')}
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-text-secondary sm:mt-3 sm:text-base">
        {t('intro')}
      </p>

      {/* 모바일 규칙 요약 */}
      <div className="mx-auto mt-4 max-w-md rounded-lg border border-accent/15 bg-bg-main/65 px-3 py-2 text-xs text-text-secondary sm:hidden">
        {t('mobileRule')}
      </div>

      {bestStreak !== null && (
        <p className="mt-4 text-xs font-bold text-accent/80">
          {t('bestRecord', { count: bestStreak })}
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        className="mt-4 inline-flex min-h-12 min-w-52 items-center justify-center gap-2 rounded-xl border border-accent/45 bg-accent/15 px-7 py-3 font-serif text-base font-black text-accent shadow-[0_12px_32px_-18px_rgba(212,175,55,0.8)] hover:border-accent hover:bg-accent/25 active:scale-[0.98] sm:mt-6 sm:py-3.5"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {t('startGame')}
      </button>

      {/* 규칙 카드 (데스크톱) */}
      <div className="mx-auto mt-7 hidden max-w-2xl grid-cols-3 gap-3 text-left sm:grid">
        <RuleCard icon={<Zap />} title={t('rules.compareTitle')} body={t('rules.compareBody')} />
        <RuleCard icon={<Flame />} title={t('rules.streakTitle')} body={t('rules.streakBody')} />
        <RuleCard icon={<Trophy />} title={t('rules.recordTitle')} body={t('rules.recordBody')} />
      </div>
    </div>
  );
}

function RuleCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-bg-main/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
      <h2 className="font-serif text-sm font-bold text-text-primary">{title}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{body}</p>
    </div>
  );
}
