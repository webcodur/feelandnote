"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import { buildPuzzleForToday, evaluate, getTodayDateKey, validatePuzzle } from "./engine";
import type { TopFivePool } from "./engine";
import TopFiveLobby from "./TopFiveLobby";
import TopFiveBoard from "./TopFiveBoard";
import TopFiveResult from "./TopFiveResult";
import type { SlotPlacement, TopFivePhase, TopFivePuzzle, TopFiveResult as TResult } from "./types";

interface Props {
  pool: TopFivePool;
  isFixture: boolean;
}

export default function TopFiveGame({ pool, isFixture }: Props) {
  const t = useTranslations("gameTopfive");

  const [phase, setPhase] = useState<TopFivePhase>("lobby");
  const [puzzle, setPuzzle] = useState<TopFivePuzzle | null>(null);
  const [result, setResult] = useState<TResult | null>(null);

  const canStart = pool.puzzles.length > 0;

  const startGame = useCallback(() => {
    const dateKey = getTodayDateKey();
    const newPuzzle = buildPuzzleForToday(pool, dateKey);
    if (!newPuzzle) return;

    // 유효성 검증
    const errors = validatePuzzle(newPuzzle);
    if (errors.length > 0) return;

    setPuzzle(newPuzzle);
    setResult(null);
    setPhase("playing");
  }, [pool]);

  const handleSubmit = useCallback(
    (placements: SlotPlacement[]) => {
      if (!puzzle) return;
      const evalResult = evaluate(placements, puzzle);
      setResult(evalResult);
      setPhase("result");
    },
    [puzzle]
  );

  const returnToLobby = useCallback(() => {
    setPhase("lobby");
    setPuzzle(null);
    setResult(null);
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.06),rgba(18,18,18,0.9)_60%,rgba(18,18,18,0.99))]" />
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
        <TopFiveLobby canStart={canStart} onStart={startGame} />
      )}

      {phase === "playing" && puzzle && (
        <TopFiveBoard puzzle={puzzle} onSubmit={handleSubmit} />
      )}

      {phase === "result" && result && puzzle && (
        <TopFiveResult
          result={result}
          categoryLabel={puzzle.categoryLabel}
          onReplay={startGame}
          onLobby={returnToLobby}
        />
      )}
    </GameFullScreen>
  );
}
