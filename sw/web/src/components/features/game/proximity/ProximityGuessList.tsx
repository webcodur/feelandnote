'use client';

import { Check, Flame, MapPin, Briefcase, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ProximityAxisHint, ProximityGuessResult } from './types';

interface Props {
  guesses: ProximityGuessResult[];
}

export default function ProximityGuessList({ guesses }: Props) {
  if (guesses.length === 0) return null;

  return (
    <div className="mx-auto mt-4 w-full max-w-md space-y-2">
      {[...guesses].reverse().map((guess, idx) => (
        <GuessRow key={`${guess.celeb.id}-${idx}`} guess={guess} rank={guesses.length - idx} />
      ))}
    </div>
  );
}

function GuessRow({ guess, rank }: { guess: ProximityGuessResult; rank: number }) {
  const t = useTranslations('gameProximity');
  const tempColor = getTemperatureColor(guess.temperature);
  const tempBg = getTemperatureBackground(guess.temperature);

  return (
    <div
      className={`rounded-xl border p-3 ${
        guess.isCorrect
          ? 'border-green-500/50 bg-green-500/10'
          : 'border-white/10 bg-bg-main/60'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-text-secondary">
          {rank}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-text-primary">
              {guess.celeb.nickname}
            </p>
            {guess.isCorrect && (
              <Check className="h-4 w-4 shrink-0 text-green-400" aria-label={t('correct')} />
            )}
          </div>
          {/* Temperature bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${tempBg}`}
                style={{ width: `${guess.temperature}%` }}
              />
            </div>
            <span className={`text-xs font-bold tabular-nums ${tempColor}`}>
              {guess.temperature}
            </span>
            <Flame className={`h-3 w-3 ${tempColor}`} aria-hidden />
          </div>
        </div>
      </div>

      {/* Axis hints */}
      {!guess.isCorrect && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
          {guess.axisHints.map((hint) => (
            <AxisBadge key={hint.axis} hint={hint} />
          ))}
        </div>
      )}
    </div>
  );
}

function AxisBadge({ hint }: { hint: ProximityAxisHint }) {
  const t = useTranslations('gameProximity');
  const icon = getAxisIcon(hint.axis);
  const colorClass = getProximityColor(hint.proximity);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${colorClass}`}
      title={hint.detail ?? t(`axis.${hint.axis}`)}
    >
      {icon}
      <span>{hint.detail ?? t(`axis.${hint.axis}`)}</span>
    </span>
  );
}

function getAxisIcon(axis: string) {
  switch (axis) {
    case 'era': return <Clock className="h-2.5 w-2.5" aria-hidden />;
    case 'region': return <MapPin className="h-2.5 w-2.5" aria-hidden />;
    case 'profession': return <Briefcase className="h-2.5 w-2.5" aria-hidden />;
    default: return <Flame className="h-2.5 w-2.5" aria-hidden />;
  }
}

function getProximityColor(proximity: string): string {
  switch (proximity) {
    case 'close': return 'bg-green-500/15 text-green-300 border border-green-500/20';
    case 'medium': return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20';
    case 'far': return 'bg-red-500/15 text-red-300 border border-red-500/20';
    default: return 'bg-white/5 text-text-secondary border border-white/10';
  }
}

function getTemperatureColor(temp: number): string {
  if (temp >= 80) return 'text-red-400';
  if (temp >= 60) return 'text-orange-400';
  if (temp >= 40) return 'text-yellow-400';
  if (temp >= 20) return 'text-blue-300';
  return 'text-blue-500';
}

function getTemperatureBackground(temp: number): string {
  if (temp >= 80) return 'bg-gradient-to-r from-red-600 to-red-400';
  if (temp >= 60) return 'bg-gradient-to-r from-orange-600 to-orange-400';
  if (temp >= 40) return 'bg-gradient-to-r from-yellow-600 to-yellow-400';
  if (temp >= 20) return 'bg-gradient-to-r from-blue-600 to-blue-400';
  return 'bg-gradient-to-r from-blue-800 to-blue-600';
}
