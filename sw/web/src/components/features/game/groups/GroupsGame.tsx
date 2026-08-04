"use client";

/**
 * 넷씩 넷 (Groups) — 메인 게임 컴포넌트
 *
 * 로비 → 플레이 → 결과 흐름을 관리한다.
 * GameFullScreen을 사용하여 전체화면 지원.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import GameFullScreen, { type BreadcrumbItem } from "@/components/shared/GameFullScreen";
import {
  buildPuzzleFromPool,
  evaluateGuess,
  getTodayDateKey,
  isGameOver,
  validatePuzzle,
  type PuzzlePool,
} from "./engine";
import {
  GROUP_SIZE,
  type GamePhase,
  type GroupsPuzzle,
  type GuessResult,
  type SolvedGroup,
} from "./types";
import GroupsLobby from "./GroupsLobby";
import GroupsBoard from "./GroupsBoard";
import GroupsResult from "./GroupsResult";

interface Props {
  pool: PuzzlePool;
  isFixture: boolean;
}

export default function GroupsGame({ pool, isFixture }: Props) {
  const t = useTranslations("gameGroups");
  const tGame = useTranslations("shared.game");

  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [puzzle, setPuzzle] = useState<GroupsPuzzle | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<SolvedGroup[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [guessHistory, setGuessHistory] = useState<GuessResult[]>([]);
  const [shakeIds, setShakeIds] = useState<string[]>([]);
  const [won, setWon] = useState(false);

  const dateKey = useMemo(() => getTodayDateKey(), []);

  const canStart = pool.groups.length >= 4;

  const startGame = useCallback(() => {
    const newPuzzle = buildPuzzleFromPool(pool, dateKey);
    if (!newPuzzle) return;

    const errors = validatePuzzle(newPuzzle);
    if (errors.length > 0) {
      console.error("[GroupsGame] Puzzle validation failed:", errors);
      return;
    }

    setPuzzle(newPuzzle);
    setSelectedIds([]);
    setSolvedGroups([]);
    setMistakes(0);
    setGuessHistory([]);
    setShakeIds([]);
    setWon(false);
    setPhase("playing");
  }, [pool, dateKey]);

  const toggleSelection = useCallback(
    (id: string) => {
      if (phase !== "playing") return;
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= GROUP_SIZE) return prev;
        return [...prev, id];
      });
    },
    [phase]
  );

  const handleDeselect = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!puzzle || selectedIds.length !== GROUP_SIZE) return;

    const result = evaluateGuess(selectedIds, puzzle.items, solvedGroups);
    setGuessHistory((prev) => [...prev, result]);

    if (result.correct && result.groupIndex !== undefined) {
      // 정답
      const items = puzzle.items.filter(
        (it) => it.groupIndex === result.groupIndex
      );
      setSolvedGroups((prev) => [
        ...prev,
        { groupIndex: result.groupIndex!, items },
      ]);
      setSelectedIds([]);

      // 게임 종료 체크
      const nextSolved = [...solvedGroups, { groupIndex: result.groupIndex, items }];
      const { over, won: isWon } = isGameOver(nextSolved, mistakes);
      if (over) {
        setWon(isWon);
        setPhase("result");
      }
    } else {
      // 오답
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setShakeIds([...selectedIds]);
      setTimeout(() => setShakeIds([]), 500);
      setSelectedIds([]);

      // 게임 종료 체크
      const { over } = isGameOver(solvedGroups, nextMistakes);
      if (over) {
        setWon(false);
        // 게임 오버 시 잠시 보여주고 결과로
        setTimeout(() => setPhase("result"), 800);
      }
    }
  }, [puzzle, selectedIds, solvedGroups, mistakes]);

  // 키보드: Enter로 제출
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selectedIds.length === GROUP_SIZE) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, selectedIds, handleSubmit]);

  const returnToLobby = useCallback(() => {
    setPhase("lobby");
  }, []);

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: t("title"), onClick: returnToLobby }];
    if (phase === "playing") items.push({ label: t("breadcrumb.playing") });
    if (phase === "result") items.push({ label: t("breadcrumb.result") });
    return items;
  }, [phase, returnToLobby, t]);

  return (
    <GameFullScreen
      breadcrumbs={breadcrumbs}
      onHome={returnToLobby}
      initialFullScreen
      reserveSubtitleSpace={false}
      exitLabel={tGame("exit")}
      exitEscLabel={tGame("exitEsc")}
      background={
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f23] via-[#1a1a2e] to-[#16213e]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(100,100,200,0.06),transparent_60%)]" />
        </div>
      }
    >
      {/* 체험 모드 배너 */}
      {isFixture && (
        <div className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs text-center py-1.5 px-3 rounded-md mb-3 max-w-lg mx-auto">
          {t("fixtureMode")}
        </div>
      )}

      {phase === "lobby" && (
        <GroupsLobby dateKey={dateKey} canStart={canStart} onStart={startGame} />
      )}

      {phase === "playing" && puzzle && (
        <GroupsBoard
          puzzle={puzzle}
          selectedIds={selectedIds}
          solvedGroups={solvedGroups}
          mistakes={mistakes}
          shakeIds={shakeIds}
          onToggle={toggleSelection}
          onSubmit={handleSubmit}
          onDeselect={handleDeselect}
        />
      )}

      {phase === "result" && puzzle && (
        <GroupsResult
          puzzle={puzzle}
          solvedGroups={solvedGroups}
          mistakes={mistakes}
          won={won}
          guessHistory={guessHistory}
          onReplay={startGame}
        />
      )}
    </GameFullScreen>
  );
}
