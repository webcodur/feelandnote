'use client';

import type { ReactNode } from 'react';
import { Crosshair, Globe, Sparkles, Target, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  onStart: () => void;
  bestGuesses: number | null;
}

export default function ProximityLobby({ onStart, bestGuesses }: Props) {
  const t = useTranslations('gameProximity');

  return (
    <div className="m-auto w-full max-w-3xl py-3 text-center sm:py-6">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-accent/35 bg-accent/10 text-accent shadow-[0_0_40px_-14px_rgba(212,175,55,0.8)] sm:mb-5 sm:h-16 sm:w-16">
        <Target className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
      </div>
      <p className="mb-1.5 font-cinzel text-[9px] font-bold tracking-[0.25em] text-accent/70 sm:mb-2 sm:text-[10px] sm:tracking-[0.28em]">
        WHO IS IT?
      </p>
      <h1 className="font-serif text-2xl font-black text-text-primary sm:text-4xl">
        {t('title')}
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-text-secondary sm:mt-3 sm:text-base">
        {t('intro')}
      </p>

      <div className="mx-auto mt-4 max-w-md rounded-lg border border-accent/15 bg-bg-main/65 px-3 py-2 text-xs text-text-secondary sm:hidden">
        {t('mobileRule')}
      </div>

      {bestGuesses !== null && (
        <p className="mt-4 text-xs font-bold text-accent/80">
          {t('bestRecord', { count: bestGuesses })}
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

      <div className="mx-auto mt-7 hidden max-w-2xl grid-cols-3 gap-3 text-left sm:grid">
        <RuleCard icon={<Crosshair />} title={t('rules.guessTitle')} body={t('rules.guessBody')} />
        <RuleCard icon={<Globe />} title={t('rules.hintsTitle')} body={t('rules.hintsBody')} />
        <RuleCard icon={<Users />} title={t('rules.narrowTitle')} body={t('rules.narrowBody')} />
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
