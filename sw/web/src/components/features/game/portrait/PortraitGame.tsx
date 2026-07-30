"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import { createPortraitRounds } from "./engine";
import PortraitLobby from "./PortraitLobby";
import PortraitResult from "./PortraitResult";
import PortraitRoundView from "./PortraitRoundView";
import {
  PORTRAIT_CHOICE_COUNT,
  PORTRAIT_REVEAL_INTERVAL_MS,
  PORTRAIT_REVEAL_POINTS,
  PORTRAIT_ROUND_COUNT,
  type PortraitAnswerState,
  type PortraitFigure,
  type PortraitImageStatus,
  type PortraitRound,
} from "./types";

interface Props {
  figures: PortraitFigure[];
  initialFullScreen?: boolean;
  onExitFullScreenExternal?: () => void;
}

type GamePhase = "lobby" | "playing" | "result";

const BEST_SCORE_KEY = "feelandnote:portrait:best-score";

export default function PortraitGame({
  figures,
  initialFullScreen,
  onExitFullScreenExternal,
}: Props) {
  const t = useTranslations("rest.arena.portrait");
  const tGame = useTranslations("shared.game");
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [rounds, setRounds] = useState<PortraitRound[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [imageStatus, setImageStatus] = useState<PortraitImageStatus>("loading");
  const [answer, setAnswer] = useState<PortraitAnswerState | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const round = rounds[roundIndex];
  const canStart = figures.length >= PORTRAIT_CHOICE_COUNT;
  const answeredRounds = Math.max(0, rounds.length - skippedCount);
  const maxScore = answeredRounds * PORTRAIT_REVEAL_POINTS[0];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = Number(window.localStorage.getItem(BEST_SCORE_KEY));
      if (Number.isFinite(stored) && stored > 0) setBestScore(stored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const startGame = useCallback(() => {
    const nextRounds = createPortraitRounds(figures, PORTRAIT_ROUND_COUNT);
    if (nextRounds.length === 0) return;

    setRounds(nextRounds);
    setRoundIndex(0);
    setRevealStep(0);
    setImageStatus("loading");
    setAnswer(null);
    setScore(0);
    setCorrectCount(0);
    setSkippedCount(0);
    setStreak(0);
    setBestStreak(0);
    setPhase("playing");
  }, [figures]);

  const handleAnswer = useCallback((selectedId: string | null) => {
    if (!round || answer || imageStatus !== "ready") return;

    const isCorrect = selectedId === round.target.id;
    const kind = selectedId === null ? "timeout" : isCorrect ? "correct" : "wrong";
    const points = isCorrect ? PORTRAIT_REVEAL_POINTS[revealStep] : 0;
    setAnswer({ selectedId, kind, points });

    if (isCorrect) {
      const nextStreak = streak + 1;
      setScore((current) => current + points);
      setCorrectCount((current) => current + 1);
      setStreak(nextStreak);
      setBestStreak((current) => Math.max(current, nextStreak));
    } else {
      setStreak(0);
    }
  }, [answer, imageStatus, revealStep, round, streak]);

  const handleImageLoad = useCallback(() => {
    if (!answer) setImageStatus("ready");
  }, [answer]);

  const handleImageError = useCallback(() => {
    if (answer) return;
    setImageStatus("error");
    setSkippedCount((current) => current + 1);
    setAnswer({ selectedId: null, kind: "skipped", points: 0 });
  }, [answer]);

  const advanceRound = useCallback(() => {
    if (!answer) return;
    if (roundIndex >= rounds.length - 1) {
      const nextBest = Math.max(bestScore, score);
      setBestScore(nextBest);
      window.localStorage.setItem(BEST_SCORE_KEY, String(nextBest));
      setPhase("result");
      return;
    }

    setRoundIndex((current) => current + 1);
    setRevealStep(0);
    setImageStatus("loading");
    setAnswer(null);
  }, [answer, bestScore, roundIndex, rounds.length, score]);

  useEffect(() => {
    if (phase !== "playing" || imageStatus !== "ready" || answer || !round) return;
    const timer = window.setTimeout(() => {
      if (revealStep < PORTRAIT_REVEAL_POINTS.length - 1) {
        setRevealStep((current) => current + 1);
      } else {
        handleAnswer(null);
      }
    }, PORTRAIT_REVEAL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [answer, handleAnswer, imageStatus, phase, revealStep, round]);

  useEffect(() => {
    if (phase !== "playing") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (answer && event.key === "Enter") {
        event.preventDefault();
        advanceRound();
        return;
      }

      const choiceIndex = Number(event.key) - 1;
      if (!answer && imageStatus === "ready" && round && choiceIndex >= 0 && choiceIndex < round.choices.length) {
        event.preventDefault();
        handleAnswer(round.choices[choiceIndex].id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advanceRound, answer, handleAnswer, imageStatus, phase, round]);

  const returnToLobby = useCallback(() => {
    setPhase("lobby");
    setAnswer(null);
  }, []);

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: t("label"), onClick: returnToLobby }];
    if (phase === "playing") {
      items.push({ label: t("round", { current: roundIndex + 1, total: rounds.length }) });
    }
    if (phase === "result") items.push({ label: t("result.breadcrumb") });
    return items;
  }, [phase, returnToLobby, roundIndex, rounds.length, t]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      onHome={returnToLobby}
      onExitFullScreen={onExitFullScreenExternal}
      initialFullScreen={initialFullScreen}
      reserveSubtitleSpace={false}
      exitLabel={tGame("exit")}
      exitEscLabel={tGame("exitEsc")}
      background={
        <>
          <Image
            src="/images/games/memory-card.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(212,175,55,0.08),rgba(18,18,18,0.82)_58%,rgba(18,18,18,0.98)_100%)]" />
          <div className="absolute inset-0 bg-bg-main/35" />
        </>
      }
    >
      {phase === "lobby" ? (
        <PortraitLobby canStart={canStart} bestScore={bestScore} onStart={startGame} />
      ) : phase === "result" ? (
        <PortraitResult
          score={score}
          maxScore={maxScore}
          bestScore={bestScore}
          correctCount={correctCount}
          answeredRounds={answeredRounds}
          skippedCount={skippedCount}
          bestStreak={bestStreak}
          onReplay={startGame}
          onLobby={returnToLobby}
        />
      ) : round ? (
        <PortraitRoundView
          round={round}
          roundIndex={roundIndex}
          totalRounds={rounds.length}
          revealStep={revealStep}
          imageStatus={imageStatus}
          answer={answer}
          score={score}
          streak={streak}
          onImageLoad={handleImageLoad}
          onImageError={handleImageError}
          onAnswer={handleAnswer}
          onNext={advanceRound}
        />
      ) : null}
    </GameFullScreen>
  );
}
