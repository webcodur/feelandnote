'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Eye, Flag, Lightbulb } from 'lucide-react';
import GameFullScreen, { type BreadcrumbItem } from '@/components/shared/GameFullScreen';
import { tokenize, processGuess, getRevealedRatio, getHiddenCount, getHint, type HintType } from './engine';
import type {
  RedactGuess,
  RedactPhase,
  RedactRoundData,
  RedactGameState,
} from './types';
import { REDACT_MAX_GUESSES, REDACT_HINTS } from './types';
import RedactTextDisplay from './RedactTextDisplay';
import RedactGuessInput from './RedactGuessInput';
import RedactGuessList from './RedactGuessList';
import RedactResult from './RedactResult';

interface Props {
  roundData: RedactRoundData;
  isFixtureMode: boolean;
  onNewRound: () => void;
}

export default function RedactGame({ roundData, isFixtureMode, onNewRound }: Props) {
  const t = useTranslations('gameRedact');
  const tGame = useTranslations('shared.game');

  const [state, setState] = useState<RedactGameState>(() => initState(roundData));

  // 라운드 변경 시 상태 초기화
  useEffect(() => {
    setState(initState(roundData));
  }, [roundData]);

  const handleGuess = useCallback((word: string) => {
    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      if (prev.guesses.length >= REDACT_MAX_GUESSES) return prev;

      // 중복 추측 방지
      const normWord = word.toLowerCase().trim();
      if (prev.guesses.some((g) => g.word.toLowerCase() === normWord)) return prev;

      const { updatedTokens, hits } = processGuess(word, prev.tokens);
      const newGuess: RedactGuess = {
        word,
        hits,
        order: prev.guesses.length + 1,
      };
      const newGuesses = [...prev.guesses, newGuess];

      // 최대 추측 도달 시 패배
      const newPhase: RedactPhase =
        newGuesses.length >= REDACT_MAX_GUESSES ? 'lost' : 'playing';

      return {
        ...prev,
        tokens: updatedTokens,
        guesses: newGuesses,
        phase: newPhase,
      };
    });
  }, []);

  const handleIdentityGuess = useCallback((guessedName: string) => {
    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      // 정규화 비교
      const guessNorm = guessedName.toLowerCase().replace(/\s+/g, '');
      const answerNorm = prev.answerName.toLowerCase().replace(/\s+/g, '');
      if (guessNorm === answerNorm) {
        return { ...prev, phase: 'won' };
      }
      // 오답 — 횟수 차감
      const newGuess: RedactGuess = {
        word: `👤 ${guessedName}`,
        hits: 0,
        order: prev.guesses.length + 1,
      };
      const newGuesses = [...prev.guesses, newGuess];
      const newPhase: RedactPhase =
        newGuesses.length >= REDACT_MAX_GUESSES ? 'lost' : 'playing';
      return {
        ...prev,
        guesses: newGuesses,
        phase: newPhase,
        identityGuessMode: false,
      };
    });
  }, []);

  const handleGiveUp = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'lost' }));
  }, []);

  const handleHint = useCallback((hintType: string) => {
    setState((prev) => {
      if (prev.hintsUsed.has(hintType)) return prev;
      const newHints = new Set(prev.hintsUsed);
      newHints.add(hintType);
      return { ...prev, hintsUsed: newHints };
    });
  }, []);

  const toggleIdentityMode = useCallback(() => {
    setState((prev) => ({ ...prev, identityGuessMode: !prev.identityGuessMode }));
  }, []);

  const returnToLobby = useCallback(() => {
    onNewRound();
  }, [onNewRound]);

  const revealedRatio = useMemo(() => getRevealedRatio(state.tokens), [state.tokens]);
  const hiddenCount = useMemo(() => getHiddenCount(state.tokens), [state.tokens]);

  // 힌트 데이터
  const activeHints = useMemo(() => {
    const hints: { type: string; value: string }[] = [];
    state.hintsUsed.forEach((hintType) => {
      const h = getHint(hintType as HintType, roundData);
      hints.push(h);
    });
    return hints;
  }, [state.hintsUsed, roundData]);

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: t('title'), onClick: returnToLobby }];
    if (state.phase === 'playing') items.push({ label: t('playing') });
    if (state.phase === 'won' || state.phase === 'lost') items.push({ label: t('result.breadcrumb') });
    return items;
  }, [state.phase, returnToLobby, t]);

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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(100,149,237,0.06),rgba(18,18,18,0.85)_55%,rgba(18,18,18,0.98)_100%)]" />
          <div className="absolute inset-0 bg-bg-main/40" />
        </>
      }
    >
      {/* 체험 모드 배너 */}
      {isFixtureMode && (
        <div className="mx-auto mb-3 flex max-w-2xl items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{t('fixtureNotice')}</span>
        </div>
      )}

      {state.phase === 'won' || state.phase === 'lost' ? (
        <RedactResult
          state={state}
          roundData={roundData}
          onReplay={onNewRound}
          onLobby={returnToLobby}
        />
      ) : (
        <div className="m-auto w-full max-w-2xl px-2 py-3 sm:py-6">
          {/* 상단 정보 바 */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
            <span>
              {t('guessCounter', {
                current: state.guesses.length,
                max: REDACT_MAX_GUESSES,
              })}
            </span>
            <span>
              {t('revealedRatio', {
                percent: Math.round(revealedRatio * 100),
                hidden: hiddenCount,
              })}
            </span>
          </div>

          {/* 힌트 표시 영역 */}
          {activeHints.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {activeHints.map((h) => (
                <span
                  key={h.type}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-200"
                >
                  <Lightbulb className="h-3 w-3" aria-hidden />
                  {t(`hint.${h.type}`)}: {h.value}
                </span>
              ))}
            </div>
          )}

          {/* 가려진 본문 */}
          <RedactTextDisplay tokens={state.tokens} ariaLabel={t('ariaRedactedText')} />

          {/* 입력 영역 */}
          <div className="mt-4">
            {state.identityGuessMode ? (
              <div className="space-y-2">
                <p className="text-center text-xs text-amber-300">
                  {t('identityGuessPrompt')}
                </p>
                <RedactGuessInput
                  onSubmit={handleIdentityGuess}
                  placeholder={t('identityPlaceholder')}
                  submitLabel={t('submitGuess')}
                  disabled={state.phase !== 'playing'}
                  isIdentityMode
                />
                <button
                  type="button"
                  onClick={toggleIdentityMode}
                  className="mx-auto block text-xs text-text-secondary hover:text-text-primary"
                >
                  {t('backToWordGuess')}
                </button>
              </div>
            ) : (
              <RedactGuessInput
                onSubmit={handleGuess}
                placeholder={t('guessPlaceholder')}
                submitLabel={t('submitGuess')}
                disabled={state.phase !== 'playing'}
              />
            )}
          </div>

          {/* 액션 버튼 행 */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {/* 정체 맞히기 */}
            {!state.identityGuessMode && (
              <button
                type="button"
                onClick={toggleIdentityMode}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200 hover:border-amber-400/50 hover:text-amber-100 active:scale-[0.98]"
              >
                <Eye className="h-3 w-3" aria-hidden />
                {t('guessIdentity')}
              </button>
            )}

            {/* 힌트 버튼들 */}
            {!state.hintsUsed.has(REDACT_HINTS.PROFESSION) && (
              <button
                type="button"
                onClick={() => handleHint(REDACT_HINTS.PROFESSION)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-text-secondary hover:border-white/25 hover:text-text-primary active:scale-[0.98]"
              >
                <Lightbulb className="h-3 w-3" aria-hidden />
                {t('hint.useProfession')}
              </button>
            )}
            {!state.hintsUsed.has(REDACT_HINTS.ERA) && (
              <button
                type="button"
                onClick={() => handleHint(REDACT_HINTS.ERA)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-text-secondary hover:border-white/25 hover:text-text-primary active:scale-[0.98]"
              >
                <Lightbulb className="h-3 w-3" aria-hidden />
                {t('hint.useEra')}
              </button>
            )}
            {!state.hintsUsed.has(REDACT_HINTS.NATIONALITY) && (
              <button
                type="button"
                onClick={() => handleHint(REDACT_HINTS.NATIONALITY)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-text-secondary hover:border-white/25 hover:text-text-primary active:scale-[0.98]"
              >
                <Lightbulb className="h-3 w-3" aria-hidden />
                {t('hint.useNationality')}
              </button>
            )}

            {/* 포기 */}
            <button
              type="button"
              onClick={handleGiveUp}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-text-secondary hover:border-white/25 hover:text-text-primary active:scale-[0.98]"
            >
              <Flag className="h-3 w-3" aria-hidden />
              {t('giveUp')}
            </button>
          </div>

          {/* 추측 이력 */}
          <RedactGuessList guesses={state.guesses} />
        </div>
      )}
    </GameFullScreen>
  );
}

function initState(roundData: RedactRoundData): RedactGameState {
  const tokens = tokenize(roundData.text, roundData.censoredWords);
  return {
    phase: 'playing',
    tokens,
    guesses: [],
    answerName: roundData.nickname,
    answerProfession: roundData.profession,
    answerNationality: roundData.nationality,
    answerBirthDeath: roundData.birthDeath,
    answerAvatarUrl: roundData.avatarUrl,
    hintsUsed: new Set(),
    identityGuessMode: false,
  };
}
