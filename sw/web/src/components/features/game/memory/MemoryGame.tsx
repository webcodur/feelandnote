"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import { createMemoryBoard } from "./engine";
import MemoryBoard from "./MemoryBoard";
import MemoryLobby from "./MemoryLobby";
import MemoryResult from "./MemoryResult";
import {
  MEMORY_DIFFICULTIES,
  type MemoryCardData,
  type MemoryDifficulty,
  type MemoryFigure,
} from "./types";

interface Props {
  figures: MemoryFigure[];
  initialFullScreen?: boolean;
  onExitFullScreenExternal?: () => void;
}

type GamePhase = "lobby" | "playing" | "result";

export default function MemoryGame({
  figures,
  initialFullScreen,
  onExitFullScreenExternal,
}: Props) {
  const t = useTranslations("rest.arena.memory");
  const tGame = useTranslations("shared.game");
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [difficulty, setDifficulty] = useState<MemoryDifficulty>("easy");
  const [board, setBoard] = useState<MemoryCardData[]>([]);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(() => new Set());
  const [moves, setMoves] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState("");
  const timeoutIds = useRef<number[]>([]);

  const config = MEMORY_DIFFICULTIES.find((item) => item.key === difficulty)
    ?? MEMORY_DIFFICULTIES[0];
  const difficultyIndex = MEMORY_DIFFICULTIES.findIndex((item) => item.key === difficulty);
  const hasNextDifficulty = difficultyIndex < MEMORY_DIFFICULTIES.length - 1;
  const remainingPairs = Math.max(0, (board.length - matchedIds.size) / 2);
  const progress = board.length === 0 ? 0 : (matchedIds.size / board.length) * 100;

  const clearTimeouts = useCallback(() => {
    for (const id of timeoutIds.current) window.clearTimeout(id);
    timeoutIds.current = [];
  }, []);

  const queueTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timeoutIds.current.push(id);
  }, []);

  const startGame = useCallback((targetDifficulty: MemoryDifficulty = difficulty) => {
    const target = MEMORY_DIFFICULTIES.find((item) => item.key === targetDifficulty)
      ?? MEMORY_DIFFICULTIES[0];
    clearTimeouts();
    setDifficulty(target.key);
    setBoard(createMemoryBoard(figures, target.pairs));
    setOpenIds([]);
    setMatchedIds(new Set());
    setMoves(0);
    setElapsedSeconds(0);
    setLocked(false);
    setFeedback("");
    setPhase("playing");
  }, [clearTimeouts, difficulty, figures]);

  const handleSelect = useCallback((card: MemoryCardData) => {
    if (locked || matchedIds.has(card.instanceId) || openIds.includes(card.instanceId)) return;
    if (openIds.length === 0) {
      setOpenIds([card.instanceId]);
      return;
    }

    const firstCard = board.find((item) => item.instanceId === openIds[0]);
    if (!firstCard) return;

    setOpenIds([firstCard.instanceId, card.instanceId]);
    setMoves((current) => current + 1);
    setLocked(true);

    if (firstCard.figure.id === card.figure.id) {
      const nextMatched = new Set(matchedIds);
      nextMatched.add(firstCard.instanceId);
      nextMatched.add(card.instanceId);
      setMatchedIds(nextMatched);
      setOpenIds([]);
      setLocked(false);
      setFeedback("");
      if (nextMatched.size === board.length) setPhase("result");
      return;
    }

    setFeedback(t("mismatch"));
    queueTimeout(() => {
      setOpenIds([]);
      setLocked(false);
      setFeedback("");
    }, 900);
  }, [board, locked, matchedIds, openIds, queueTimeout, t]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(
      () => setElapsedSeconds((current) => current + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => clearTimeouts, [clearTimeouts]);

  const breadcrumbs = useMemo(() => {
    const items: BreadcrumbItem[] = [{ label: t("label"), onClick: () => setPhase("lobby") }];
    if (phase === "playing") items.push({ label: t(`difficulty.${difficulty}.label`) });
    if (phase === "result") items.push({ label: t("result.breadcrumb") });
    return items;
  }, [difficulty, phase, t]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      onHome={() => setPhase("lobby")}
      onExitFullScreen={onExitFullScreenExternal}
      initialFullScreen={initialFullScreen}
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
            className="object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(18,18,18,0.65)_55%,rgba(18,18,18,0.96)_100%)]" />
          <div className="absolute inset-0 bg-bg-main/45" />
        </>
      }
    >
      {phase === "lobby" ? (
        <MemoryLobby
          difficulty={difficulty}
          availableFigures={figures.length}
          onDifficultyChange={setDifficulty}
          onStart={() => startGame()}
        />
      ) : phase === "result" ? (
        <MemoryResult
          difficulty={difficulty}
          moves={moves}
          elapsedSeconds={elapsedSeconds}
          hasNextDifficulty={hasNextDifficulty}
          onReplay={() => startGame()}
          onNext={() => startGame(MEMORY_DIFFICULTIES[difficultyIndex + 1].key)}
          onLobby={() => setPhase("lobby")}
        />
      ) : (
        <MemoryBoard
          board={board}
          difficulty={difficulty}
          gridClassName={config.gridClassName}
          openIds={openIds}
          matchedIds={matchedIds}
          moves={moves}
          elapsedSeconds={elapsedSeconds}
          remainingPairs={remainingPairs}
          progress={progress}
          locked={locked}
          feedback={feedback}
          onSelect={handleSelect}
          onRestart={() => startGame()}
        />
      )}
    </GameFullScreen>
  );
}
