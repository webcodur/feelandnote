'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Flag } from 'lucide-react';
import GameFullScreen, { type BreadcrumbItem } from '@/components/shared/GameFullScreen';
import { processGuess, pickDailyTarget, generateAxisHints } from './engine';
import { calculateFixtureTemperature } from './fixture';
import ProximityLobby from './ProximityLobby';
import ProximityResult from './ProximityResult';
import ProximityGuessInput from './ProximityGuessInput';
import ProximityGuessList from './ProximityGuessList';
import type {
  ProximityCeleb,
  ProximityCelebFull,
  ProximityGuessResult,
  ProximityPhase,
} from './types';
import { PROXIMITY_MAX_GUESSES, PROXIMITY_TEMPERATURE_CORRECT } from './types';

interface Props {
  celebs: ProximityCelebFull[];
  /** 체험 모드 여부 — fixture 사용 중이면 true */
  isFixtureMode: boolean;
}

const BEST_GUESSES_KEY = 'feelandnote:proximity:best-guesses';

export default function ProximityGame({ celebs, isFixtureMode }: Props) {
  const t = useTranslations('gameProximity');
  const tGame = useTranslations('shared.game');
  const locale = useLocale() as 'ko' | 'en';

  const [phase, setPhase] = useState<ProximityPhase>('lobby');
  const [target, setTarget] = useState<ProximityCelebFull | null>(null);
  const [guesses, setGuesses] = useState<ProximityGuessResult[]>([]);
  const [gaveUp, setGaveUp] = useState(false);
  const [bestGuesses, setBestGuesses] = useState<number | null>(null);

  // 로컬 스토리지에서 최고 기록 로드
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = Number(window.localStorage.getItem(BEST_GUESSES_KEY));
      if (Number.isFinite(stored) && stored > 0) setBestGuesses(stored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const guessedIds = useMemo(
    () => new Set(guesses.map((g) => g.celeb.id)),
    [guesses]
  );

  /** 자동완성에 쓸 간략 인물 목록 (locale은 이미 서버에서 적용됨) */
  const celebList = useMemo<ProximityCeleb[]>(
    () => celebs.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      nickname_en: c.nickname_en,
      profession: c.profession,
      nationality: c.nationality,
      birth_date: c.birth_date,
      death_date: c.death_date,
      avatar_url: c.avatar_url,
    })),
    [celebs]
  );

  const startGame = useCallback(() => {
    const picked = pickDailyTarget(celebs);
    if (!picked) return;
    setTarget(picked);
    setGuesses([]);
    setGaveUp(false);
    setPhase('playing');
  }, [celebs]);

  const handleGuess = useCallback((selectedCeleb: ProximityCeleb) => {
    if (!target) return;
    if (guessedIds.has(selectedCeleb.id)) return;

    // 체험 모드에서는 대체 거리 계산
    const guessFull = celebs.find((c) => c.id === selectedCeleb.id);
    if (!guessFull) return;

    let result: ProximityGuessResult;

    if (isFixtureMode) {
      // 체험 모드: 성향 점수 없이 시대·지역·직군으로만 거리 계산
      const isCorrect = guessFull.id === target.id;
      const temperature = isCorrect
        ? PROXIMITY_TEMPERATURE_CORRECT
        : calculateFixtureTemperature(guessFull, target);
      const axisHints = isCorrect
        ? [
            { axis: 'era' as const, proximity: 'close' as const, detail: t('correct') },
            { axis: 'region' as const, proximity: 'close' as const, detail: t('correct') },
            { axis: 'profession' as const, proximity: 'close' as const, detail: t('correct') },
            { axis: 'spectrum' as const, proximity: 'close' as const },
          ]
        : generateAxisHints(guessFull, target, locale);
      result = { celeb: selectedCeleb, temperature, axisHints, isCorrect };
    } else {
      result = processGuess(guessFull, target, locale);
    }

    const nextGuesses = [...guesses, result];
    setGuesses(nextGuesses);

    // 정답이거나 최대 추측 횟수 도달
    if (result.isCorrect) {
      const count = nextGuesses.length;
      const newBest = bestGuesses === null ? count : Math.min(bestGuesses, count);
      setBestGuesses(newBest);
      window.localStorage.setItem(BEST_GUESSES_KEY, String(newBest));
      setPhase('result');
    } else if (nextGuesses.length >= PROXIMITY_MAX_GUESSES) {
      setPhase('result');
    }
  }, [bestGuesses, celebs, guessedIds, guesses, isFixtureMode, locale, t, target]);

  const handleGiveUp = useCallback(() => {
    setGaveUp(true);
    setPhase('result');
  }, []);

  const returnToLobby = useCallback(() => {
    setPhase('lobby');
    setGuesses([]);
    setTarget(null);
  }, []);

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: t('title'), onClick: returnToLobby }];
    if (phase === 'playing') {
      items.push({ label: t('playing') });
    }
    if (phase === 'result') {
      items.push({ label: t('result.breadcrumb') });
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.06),rgba(18,18,18,0.85)_55%,rgba(18,18,18,0.98)_100%)]" />
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
        <ProximityLobby onStart={startGame} bestGuesses={bestGuesses} />
      ) : phase === 'result' && target ? (
        <ProximityResult
          target={{
            id: target.id,
            nickname: target.nickname,
            nickname_en: target.nickname_en,
            profession: target.profession,
            nationality: target.nationality,
            birth_date: target.birth_date,
            death_date: target.death_date,
            avatar_url: target.avatar_url,
          }}
          guesses={guesses}
          gaveUp={gaveUp}
          bestGuesses={bestGuesses}
          onReplay={startGame}
          onLobby={returnToLobby}
        />
      ) : (
        <div className="m-auto w-full max-w-lg px-2 py-3 sm:py-6">
          {/* 추측 카운터 */}
          <p className="mb-3 text-center text-xs text-text-secondary">
            {t('guessCounter', { current: guesses.length, max: PROXIMITY_MAX_GUESSES })}
          </p>

          {/* 입력 */}
          <ProximityGuessInput
            celebs={celebList}
            guessedIds={guessedIds}
            onSelect={handleGuess}
            disabled={phase !== 'playing'}
          />

          {/* 포기 버튼 */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleGiveUp}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[11px] text-text-secondary hover:border-white/25 hover:text-text-primary active:scale-[0.98]"
            >
              <Flag className="h-3 w-3" aria-hidden />
              {t('giveUp')}
            </button>
          </div>

          {/* 추측 이력 */}
          <ProximityGuessList guesses={guesses} />
        </div>
      )}
    </GameFullScreen>
  );
}
