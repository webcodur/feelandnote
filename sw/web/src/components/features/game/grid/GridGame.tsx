"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import { generatePuzzle, validateAnswer } from "./engine";
import GridBoard from "./GridBoard";
import GridLobby from "./GridLobby";
import GridResult from "./GridResult";
import {
  GRID_SIZE,
  GRID_TOTAL_CELLS,
  type GridCell,
  type GridCeleb,
  type GridCondition,
  type GridPhase,
  type GridPuzzle,
} from "./types";

interface Props {
  celebs: GridCeleb[];
  conditions: GridCondition[];
  isFixture: boolean;
}

export default function GridGame({ celebs, conditions, isFixture }: Props) {
  const t = useTranslations("gameGrid");

  const [phase, setPhase] = useState<GridPhase>("lobby");
  const [puzzle, setPuzzle] = useState<GridPuzzle | null>(null);
  const [cells, setCells] = useState<GridCell[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  const canStart = celebs.length >= 20 && conditions.length >= 6;

  const startGame = useCallback(() => {
    const newPuzzle = generatePuzzle(celebs, conditions);
    if (!newPuzzle) return;

    setPuzzle(newPuzzle);
    setCells(
      Array.from({ length: GRID_TOTAL_CELLS }, (_, i) => ({
        row: Math.floor(i / GRID_SIZE),
        col: i % GRID_SIZE,
        answerId: null,
        correct: null,
      })),
    );
    setUsedIds(new Set());
    setActiveCell(null);
    setPhase("playing");
  }, [celebs, conditions]);

  const handleCellSelect = useCallback((row: number, col: number) => {
    setActiveCell({ row, col });
  }, []);

  const handleAnswer = useCallback(
    (celebId: string) => {
      if (!puzzle || !activeCell) return;
      const { row, col } = activeCell;
      const cellIdx = row * GRID_SIZE + col;

      // 이미 답한 칸이면 무시
      if (cells[cellIdx].answerId !== null) return;

      const isCorrect = validateAnswer(puzzle, row, col, celebId, usedIds);

      setCells((prev) => {
        const next = [...prev];
        next[cellIdx] = { ...next[cellIdx], answerId: celebId, correct: isCorrect };
        return next;
      });

      if (isCorrect) {
        setUsedIds((prev) => new Set([...prev, celebId]));
      }

      setActiveCell(null);
    },
    [activeCell, cells, puzzle, usedIds],
  );

  // 모든 칸이 채워지면 결과로
  useEffect(() => {
    if (phase !== "playing") return;
    const allFilled = cells.every((c) => c.answerId !== null);
    if (allFilled && cells.length === GRID_TOTAL_CELLS) {
      const timer = setTimeout(() => setPhase("result"), 800);
      return () => clearTimeout(timer);
    }
  }, [cells, phase]);

  const correctCount = useMemo(() => cells.filter((c) => c.correct === true).length, [cells]);

  const returnToLobby = useCallback(() => {
    setPhase("lobby");
    setPuzzle(null);
    setCells([]);
    setUsedIds(new Set());
    setActiveCell(null);
  }, []);

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: t("title"), onClick: returnToLobby }];
    if (phase === "playing") items.push({ label: t("playing") });
    if (phase === "result") items.push({ label: t("resultTitle") });
    return items;
  }, [phase, returnToLobby, t]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      onHome={returnToLobby}
      initialFullScreen={false}
      exitLabel={t("exit")}
      exitEscLabel={t("exitEsc")}
      background={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(99,102,241,0.06),rgba(18,18,18,0.9)_60%,rgba(18,18,18,0.99))]" />
          <div className="absolute inset-0 bg-bg-main/40" />
        </>
      }
    >
      {isFixture && (
        <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-900/70 px-4 py-1.5 text-xs font-bold text-amber-200 shadow-lg backdrop-blur-sm">
          {t("fixtureMode")}
        </div>
      )}

      {phase === "lobby" && (
        <GridLobby canStart={canStart} onStart={startGame} />
      )}

      {phase === "playing" && puzzle && (
        <GridBoard
          puzzle={puzzle}
          cells={cells}
          celebs={celebs}
          activeCell={activeCell}
          usedIds={usedIds}
          onCellSelect={handleCellSelect}
          onAnswer={handleAnswer}
        />
      )}

      {phase === "result" && (
        <GridResult
          correctCount={correctCount}
          totalCells={GRID_TOTAL_CELLS}
          onReplay={startGame}
          onLobby={returnToLobby}
        />
      )}
    </GameFullScreen>
  );
}
