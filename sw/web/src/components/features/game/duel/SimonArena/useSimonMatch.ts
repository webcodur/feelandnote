/*
  파일명: components/features/game/duel/SimonArena/useSimonMatch.ts
  기능: 지략전 진행
  책임: 안내 → 3·2·1 → 라운드마다 순서 보여 주기 → 따라 누르기 → 상대 판정(통솔로 모의) → 다음 라운드나 결과 순서를 쥔다.
        한쪽만 틀리면 맞힌 쪽이 이기고, 둘 다 틀리거나 끝까지 둘 다 맞히면 비긴다.
*/
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BattleCard } from "@/lib/game/types";
import {
  MAX_ROUNDS, SHOW_DURATION, SHOW_INTERVAL,
  generatePattern, getPatternLength, isInputCorrectSoFar, isPatternComplete, simulateAiSimon,
} from "@/lib/game/simonEngine";
import { RESULT_HOLD_MS, type DuelWinner } from "../shared/types";
import { playCellTone } from "./simonSound";

export type SimonPhase = "intro" | "countdown" | "showing" | "input" | "wrongFlash" | "aiDecide" | "roundResult" | "result";
export type SimonOutcome = "bothSuccessDraw" | "roundSuccess" | "enemyFailed" | "playerFailed" | "bothFailedDraw";

/** 양쪽 성공 여부 → 결과 문구와 승자 (null이면 다음 라운드) */
function judge(playerOk: boolean, aiOk: boolean, lastRound: boolean): { outcome: SimonOutcome; winner: DuelWinner | null } {
  if (playerOk && aiOk) return lastRound ? { outcome: "bothSuccessDraw", winner: "draw" } : { outcome: "roundSuccess", winner: null };
  if (playerOk) return { outcome: "enemyFailed", winner: "player" };
  if (aiOk) return { outcome: "playerFailed", winner: "ai" };
  return { outcome: "bothFailedDraw", winner: "draw" };
}

export function useSimonMatch(aiCard: BattleCard, muted: boolean, onComplete: (winner: DuelWinner) => void) {
  const [phase, setPhase] = useState<SimonPhase>("intro");
  const [round, setRound] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [lit, setLit] = useState(-1);
  const [wrong, setWrong] = useState(-1);
  const [input, setInput] = useState<number[]>([]);
  const [playerOk, setPlayerOk] = useState(true);
  const [outcome, setOutcome] = useState<SimonOutcome | null>(null);
  const [winner, setWinner] = useState<DuelWinner>("draw");
  const [countdown, setCountdown] = useState(3);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const done = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const tone = useCallback((cell: number) => {
    if (!muted) playCellTone(cell);
  }, [muted]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const start = useCallback(() => {
    if (phase !== "intro") return;
    setCountdown(3);
    setPhase("countdown");
  }, [phase]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onCompleteRef.current(winner);
  }, [winner]);

  const startRound = useCallback((r: number) => {
    clearTimers();
    const next = generatePattern(getPatternLength(r));
    setPattern(next);
    setInput([]);
    setPlayerOk(true);
    setRound(r);
    setLit(-1);
    setWrong(-1);
    setPhase("showing");
    next.forEach((cell, i) => {
      timers.current.push(setTimeout(() => { setLit(cell); tone(cell); }, i * SHOW_INTERVAL));
      timers.current.push(setTimeout(() => setLit(-1), i * SHOW_INTERVAL + SHOW_DURATION));
    });
    timers.current.push(setTimeout(() => setPhase("input"), next.length * SHOW_INTERVAL + 200));
  }, [clearTimers, tone]);

  useEffect(() => {
    if (phase !== "countdown") return;
    const timer = setTimeout(() => (countdown > 1 ? setCountdown(countdown - 1) : startRound(1)), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, startRound]);

  const press = useCallback((cell: number) => {
    if (phase !== "input") return;
    const next = [...input, cell];
    setInput(next);
    setLit(cell);
    tone(cell);
    timers.current.push(setTimeout(() => setLit(-1), 200));
    if (!isInputCorrectSoFar(next, pattern)) {
      setWrong(cell);
      setPlayerOk(false);
      setPhase("wrongFlash");
      return;
    }
    if (isPatternComplete(next, pattern)) setPhase("aiDecide");
  }, [phase, input, pattern, tone]);

  useEffect(() => {
    if (phase !== "wrongFlash") return;
    const timer = setTimeout(() => {
      setWrong(-1);
      setPhase("aiDecide");
    }, 600);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "aiDecide") return;
    const timer = setTimeout(() => {
      const verdict = judge(playerOk, simulateAiSimon(aiCard, round), round >= MAX_ROUNDS);
      setOutcome(verdict.outcome);
      if (verdict.winner) setWinner(verdict.winner);
      setPhase(verdict.winner ? "result" : "roundResult");
    }, 800);
    return () => clearTimeout(timer);
  }, [phase, aiCard, round, playerOk]);

  useEffect(() => {
    if (phase !== "roundResult") return;
    const timer = setTimeout(() => startRound(round + 1), 1200);
    return () => clearTimeout(timer);
  }, [phase, round, startRound]);

  useEffect(() => {
    if (phase !== "result") return;
    const timer = setTimeout(finish, RESULT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase, finish]);

  return { phase, round, pattern, lit, wrong, input, outcome, winner, countdown, start, press, finish };
}
