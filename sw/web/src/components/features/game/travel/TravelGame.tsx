"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import { bfs, calculateScore, generatePuzzle, getTodayDateKey } from "./engine";
import TravelBoard from "./TravelBoard";
import TravelLobby from "./TravelLobby";
import TravelResultView from "./TravelResult";
import type {
  AdjacencyEdge,
  TravelGraph,
  TravelOutcome,
  TravelPhase,
  TravelPuzzle,
  TravelResult,
  TravelStep,
} from "./types";

interface Props {
  graph: TravelGraph;
  isFixture: boolean;
}

export default function TravelGame({ graph, isFixture }: Props) {
  const t = useTranslations("gameTravel");

  const [phase, setPhase] = useState<TravelPhase>("lobby");
  const [puzzle, setPuzzle] = useState<TravelPuzzle | null>(null);
  const [currentId, setCurrentId] = useState<string>("");
  const [path, setPath] = useState<TravelStep[]>([]);
  const [result, setResult] = useState<TravelResult | null>(null);
  const [roundSuffix, setRoundSuffix] = useState(0);

  const canStart = Object.keys(graph.adjacency).length >= 10;

  const startGame = useCallback(() => {
    const dateKey = `${getTodayDateKey()}-${roundSuffix}`;
    const newPuzzle = generatePuzzle(graph, dateKey);
    if (!newPuzzle) return;

    setPuzzle(newPuzzle);
    setCurrentId(newPuzzle.startId);
    setPath([]);
    setResult(null);
    setPhase("playing");
    setRoundSuffix((s) => s + 1);
  }, [graph, roundSuffix]);

  const finishGame = useCallback(
    (outcome: TravelOutcome, finalPath: TravelStep[]) => {
      if (!puzzle) return;
      const optimalPath = bfs(graph.adjacency, puzzle.startId, puzzle.endId) ?? [
        puzzle.startId,
        puzzle.endId,
      ];
      const score = calculateScore(
        outcome,
        finalPath.length,
        puzzle.optimalLength,
        puzzle.budget,
      );
      setResult({
        outcome,
        path: finalPath,
        optimalPath,
        budget: puzzle.budget,
        score,
      });
      setPhase("result");
    },
    [graph.adjacency, puzzle],
  );

  const handleMove = useCallback(
    (targetId: string, edge: AdjacencyEdge) => {
      if (!puzzle) return;

      const newStep: TravelStep = {
        celebId: targetId,
        reason: edge.reasons[0],
      };
      const newPath = [...path, newStep];
      setPath(newPath);
      setCurrentId(targetId);

      // 도착했는지 확인
      if (targetId === puzzle.endId) {
        const outcome: TravelOutcome =
          newPath.length <= puzzle.budget ? "success" : "over_budget";
        finishGame(outcome, newPath);
        return;
      }

      // 예산 초과 체크 (초과해도 계속 이동 가능 — 감점만)
      // Travle 방식: 예산 초과해도 도착하면 부분 점수를 준다.
      // 다만 예산의 2배를 넘으면 강제 종료
      if (newPath.length >= puzzle.budget * 2) {
        finishGame("over_budget", newPath);
      }
    },
    [path, puzzle, finishGame],
  );

  const handleGiveUp = useCallback(() => {
    finishGame("give_up", path);
  }, [finishGame, path]);

  const returnToLobby = useCallback(() => {
    setPhase("lobby");
    setPuzzle(null);
    setPath([]);
    setResult(null);
    setCurrentId("");
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.06),rgba(18,18,18,0.9)_60%,rgba(18,18,18,0.99))]" />
          <div className="absolute inset-0 bg-bg-main/40" />
        </>
      }
    >
      {isFixture && (
        <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-900/70 px-4 py-1.5 text-xs font-bold text-amber-200 shadow-lg backdrop-blur-sm">
          {t("fixtureMode")}
        </div>
      )}

      {phase === "lobby" && <TravelLobby canStart={canStart} onStart={startGame} />}

      {phase === "playing" && puzzle && (
        <TravelBoard
          graph={graph}
          puzzle={puzzle}
          currentId={currentId}
          path={path}
          onMove={handleMove}
          onGiveUp={handleGiveUp}
        />
      )}

      {phase === "result" && result && puzzle && (
        <TravelResultView
          result={result}
          graph={graph}
          startId={puzzle.startId}
          endId={puzzle.endId}
          onReplay={startGame}
          onLobby={returnToLobby}
        />
      )}
    </GameFullScreen>
  );
}
