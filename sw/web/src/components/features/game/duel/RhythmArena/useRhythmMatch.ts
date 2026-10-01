/*
  파일명: components/features/game/duel/RhythmArena/useRhythmMatch.ts
  기능: 격돌 진행
  책임: 안내 → 3·2·1 → 내 차례(원마다 판정, 놓치면 저절로 놓침) → 상대 차례(무력으로 모의) → 결과 순서를 쥔다.
        원 하나를 두 번 판정하지 않도록 지금 원 번호는 입력 즉시 ref에 올린다. 원이 아직 먼데 누르면 무시한다.
*/
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BattleCard } from "@/lib/game/types";
import {
  NOTE_COUNT, calcRhythmScore, generateNotes, judgeInput, simulateAiRhythm,
  type Lane, type RhythmJudgment,
} from "@/lib/game/rhythmEngine";
import { RESULT_HOLD_MS, type DuelWinner } from "../shared/types";
import type { LastHit, Phase } from "./types";

/** 제 시각을 이만큼 넘기면 놓친 것으로 친다 (ms) */
const MISS_AFTER = 150;
/** 제 시각보다 이만큼 넘게 이르게 누르면 헛누름으로 보고 원을 남겨 둔다 (ms). 너무 이른 한 번에 원이 사라지지 않게 한다 */
const EARLY_IGNORE = 220;
const AI_THINK_MS = 1200;

export function useRhythmMatch(aiCard: BattleCard, onComplete: (winner: DuelWinner) => void) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [notes] = useState(() => generateNotes(NOTE_COUNT));
  const [currentNote, setCurrentNote] = useState(0);
  const [judgments, setJudgments] = useState<RhythmJudgment[]>([]);
  const [lastHit, setLastHit] = useState<LastHit | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [winner, setWinner] = useState<DuelWinner>("draw");
  const [countdown, setCountdown] = useState(3);

  const startTimeRef = useRef(0);
  const currentNoteRef = useRef(0);
  const judgeKey = useRef(0);
  const missTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const done = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const playerScore = calcRhythmScore(judgments);

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

  // 3·2·1 뒤 시작 시각을 적고 내 차례로
  useEffect(() => {
    if (phase !== "countdown") return;
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
        return;
      }
      startTimeRef.current = Date.now();
      setCountdown(0);
      setPhase("playing");
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const record = useCallback((judgment: RhythmJudgment, lane: Lane) => {
    judgeKey.current += 1;
    setJudgments((prev) => [...prev, judgment]);
    setLastHit({ lane, type: judgment, key: judgeKey.current });
    const next = currentNoteRef.current + 1;
    currentNoteRef.current = next;
    setCurrentNote(next);
    if (next >= notes.length) setPhase("aiTurn");
  }, [notes.length]);

  // 지금 원을 제때 치지 않으면 놓침으로 넘긴다
  useEffect(() => {
    if (phase !== "playing" || currentNote >= notes.length) return;
    const note = notes[currentNote];
    const remaining = note.targetTime + MISS_AFTER - (Date.now() - startTimeRef.current);
    missTimer.current = setTimeout(() => record("miss", note.lane), Math.max(0, remaining));
    return () => clearTimeout(missTimer.current);
  }, [phase, currentNote, notes, record]);

  const hit = useCallback((lane: Lane) => {
    if (phase !== "playing" || currentNoteRef.current >= notes.length) return;
    const note = notes[currentNoteRef.current];
    const elapsed = Date.now() - startTimeRef.current;
    if (note.targetTime - elapsed > EARLY_IGNORE) return;
    clearTimeout(missTimer.current);
    record(judgeInput(elapsed, note.targetTime, lane, note.lane), note.lane);
  }, [phase, notes, record]);

  useEffect(() => {
    if (phase !== "aiTurn") return;
    const timer = setTimeout(() => {
      const ai = simulateAiRhythm(aiCard, NOTE_COUNT);
      const mine = calcRhythmScore(judgments);
      setAiScore(ai.score);
      setWinner(mine > ai.score ? "player" : mine < ai.score ? "ai" : "draw");
      setPhase("result");
    }, AI_THINK_MS);
    return () => clearTimeout(timer);
  }, [phase, aiCard, judgments]);

  useEffect(() => {
    if (phase !== "result") return;
    const timer = setTimeout(finish, RESULT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase, finish]);

  return { phase, notes, currentNote, judgments, lastHit, countdown, playerScore, aiScore, winner, startTimeRef, currentNoteRef, start, hit, finish };
}
