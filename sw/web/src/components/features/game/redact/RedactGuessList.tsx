'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { RedactGuess } from './types';

interface Props {
  guesses: RedactGuess[];
}

export default function RedactGuessList({ guesses }: Props) {
  const t = useTranslations('gameRedact');

  if (guesses.length === 0) return null;

  return (
    <div className="mt-4 space-y-1" role="log" aria-label={t('guessHistory')}>
      <h3 className="mb-2 text-xs font-medium text-text-secondary">
        {t('guessHistory')}
      </h3>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/5 bg-white/[0.02] p-2">
        {[...guesses].reverse().map((guess) => (
          <div
            key={guess.order}
            className="flex items-center gap-2 rounded px-2 py-1 text-xs"
          >
            <span className="w-5 text-right text-text-secondary/50">
              {guess.order}
            </span>
            <span className="flex-1 font-mono text-text-primary">
              {guess.word}
            </span>
            {guess.hits > 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                {t('hits', { count: guess.hits })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <XCircle className="h-3 w-3" aria-hidden />
                {t('miss')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
