/*
  파일명: components/features/game/duel/RhythmArena.tsx
  기능: 전투(assault) 접전 — 낙하노트 리듬 미니게임
  책임: rAF 기반 노트 낙하, Space/탭 판정, AI 시뮬, 승패 결정
*/
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleCard } from "@/lib/game/types";
import {
  type RhythmJudgment,
  generateNotes,
  judgeInput,
  calcRhythmScore,
  simulateAiRhythm,
  NOTE_FALL_DURATION,
} from "@/lib/game/rhythmEngine";
import ArenaLayout from "./shared/ArenaLayout";
import ArenaHud from "./shared/ArenaHud";
import ArenaIntro from "./shared/ArenaIntro";
import ArenaResult from "./shared/ArenaResult";

// ─── Props ───

interface Props {
  playerCard: BattleCard;
  aiCard: BattleCard;
  onComplete: (winner: "player" | "ai" | "draw") => void;
}

// ─── 판정 스타일 ───

const JUDGMENT_STYLE: Record<RhythmJudgment, { color: string; label: string }> = {
  perfect: { color: "#d4af37", label: "PERFECT" },
  good: { color: "#c0c0c0", label: "GOOD" },
  miss: { color: "#a03030", label: "MISS" },
};

// ─── 상수 ───

const LANE_HEIGHT = 300;     // 노트 낙하 영역 높이 (px)
const JUDGE_LINE_Y = 260;    // 판정선 Y 위치 (px, 상단 기준)
const NOTE_SIZE = 36;

type Phase = "intro" | "playing" | "aiTurn" | "result";

// ─── 메인 컴포넌트 ───

export default function RhythmArena({ playerCard, aiCard, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [notes] = useState(() => generateNotes(5));
  const [currentNote, setCurrentNote] = useState(0);
  const [judgments, setJudgments] = useState<RhythmJudgment[]>([]);
  const [lastJudgment, setLastJudgment] = useState<{ type: RhythmJudgment; key: number } | null>(null);
  const [notePositions, setNotePositions] = useState<number[]>(() => notes.map(() => -NOTE_SIZE));
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState<"player" | "ai" | "draw">("draw");

  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentNoteRef = useRef(0);
  const judgeKeyRef = useRef(0);

  // currentNote를 ref로도 추적 (rAF 콜백에서 최신값 접근)
  useEffect(() => { currentNoteRef.current = currentNote; }, [currentNote]);

  // ─── rAF 루프: 노트 위치 계산 ───
  const tick = useCallback(() => {
    const now = Date.now();
    const elapsed = now - startTimeRef.current;

    setNotePositions(notes.map((note) => {
      const progress = (elapsed - (note.targetTime - NOTE_FALL_DURATION)) / NOTE_FALL_DURATION;
      if (progress < 0) return -NOTE_SIZE; // 아직 시작 전
      return progress * JUDGE_LINE_Y;
    }));

    rafRef.current = requestAnimationFrame(tick);
  }, [notes]);

  // ─── Intro (탭-투-스타트) ───
  const dismissIntro = useCallback(() => {
    if (phase !== "intro") return;
    startTimeRef.current = Date.now();
    setPhase("playing");
  }, [phase]);

  // playing 시작 시 rAF 시작
  useEffect(() => {
    if (phase === "playing") {
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [phase, tick]);

  // ─── 노트 자동 miss 타이머 ───
  useEffect(() => {
    if (phase !== "playing" || currentNote >= notes.length) return;

    const target = notes[currentNote].targetTime;
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = target + 150 - elapsed; // 판정선 통과 후 150ms

    noteTimerRef.current = setTimeout(() => {
      judgeKeyRef.current++;
      setJudgments(prev => [...prev, "miss"]);
      setLastJudgment({ type: "miss", key: judgeKeyRef.current });
      setCurrentNote(prev => prev + 1);
    }, Math.max(0, remaining));

    return () => clearTimeout(noteTimerRef.current);
  }, [phase, currentNote, notes]);

  // ─── 전체 노트 소진 → AI 턴 ───
  useEffect(() => {
    if (phase === "playing" && currentNote >= notes.length) {
      cancelAnimationFrame(rafRef.current);
      const score = calcRhythmScore(judgments);
      setPlayerScore(score);
      setPhase("aiTurn");
    }
  }, [phase, currentNote, notes.length, judgments]);

  // ─── AI 턴 ───
  useEffect(() => {
    if (phase !== "aiTurn") return;
    const t = setTimeout(() => {
      const aiResult = simulateAiRhythm(aiCard);
      setAiScore(aiResult.score);
      const pScore = calcRhythmScore(judgments);
      const w = pScore > aiResult.score ? "player" : pScore < aiResult.score ? "ai" : "draw";
      setWinner(w);
      setPhase("result");
    }, 1200);
    return () => clearTimeout(t);
  }, [phase, aiCard, judgments]);

  // ─── 결과 → onComplete ───
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  useEffect(() => {
    if (phase !== "result") return;
    const t = setTimeout(() => onCompleteRef.current(winner), 2000);
    return () => clearTimeout(t);
  }, [phase, winner]);

  // ─── 입력 핸들러 ───
  const handleInput = useCallback(() => {
    if (phase !== "playing" || currentNoteRef.current >= notes.length) return;
    clearTimeout(noteTimerRef.current);

    const elapsed = Date.now() - startTimeRef.current;
    const j = judgeInput(elapsed, notes[currentNoteRef.current].targetTime);

    judgeKeyRef.current++;
    setJudgments(prev => [...prev, j]);
    setLastJudgment({ type: j, key: judgeKeyRef.current });
    setCurrentNote(prev => prev + 1);
  }, [phase, notes]);

  // 키보드 (Space)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (phase === "intro") dismissIntro();
        else handleInput();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleInput, dismissIntro, phase]);

  // ─── 스킵 핸들러 (result/aiTurn 클릭) ───
  const handleScreenClick = useCallback(() => {
    if (phase === "result") {
      onCompleteRef.current(winner);
    }
  }, [phase, winner]);

  // ─── 렌더 ───
  return (
    <ArenaLayout themeColor="rgba(192,128,90)">
      <ArenaHud
        playerCard={playerCard}
        aiCard={aiCard}
        themeColor="192,128,90"
        centerText={phase === "playing" ? `${currentNote}/${notes.length}` : ""}
        centerStyle={{ color: "rgba(212,175,55,0.7)" }}
        bottomContent={
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex gap-1">
              {judgments.map((j, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: JUDGMENT_STYLE[j].color }}
                />
              ))}
            </div>
          </div>
        }
      />

      {/* ═══ 플레이 영역 ═══ */}
      <div className="flex-1 relative overflow-hidden" onClick={phase === "playing" ? handleInput : handleScreenClick}>

            {/* 낙하 레인 (playing) */}
            {phase === "playing" && (
              <div className="absolute inset-x-0 top-0" style={{ height: LANE_HEIGHT }}>
                {/* 레인 중앙선 */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
                  style={{ background: "linear-gradient(to bottom, transparent, rgba(192,128,90,0.2) 30%, rgba(192,128,90,0.2) 80%, transparent)" }}
                />

                {/* 판정선 */}
                <div className="absolute left-1/2 -translate-x-1/2" style={{ top: JUDGE_LINE_Y, width: NOTE_SIZE + 24 }}>
                  <div className="h-[2px] rounded" style={{
                    background: "linear-gradient(to right, transparent, rgba(212,175,55,0.7), transparent)",
                    boxShadow: "0 0 12px rgba(212,175,55,0.4), 0 0 4px rgba(255,255,255,0.5)",
                  }} />
                  <div className="mx-auto mt-1 w-3.5 h-3.5 rounded-full border border-[#d4af37]/60"
                    style={{ background: "rgba(212,175,55,0.1)", boxShadow: "0 0 8px rgba(212,175,55,0.3)" }}
                  />
                </div>

                {/* 노트 */}
                {notes.map((note, i) => {
                  if (i < currentNote) return null;
                  const y = notePositions[i];
                  if (y < -NOTE_SIZE) return null;

                  return (
                    <div
                      key={note.id}
                      className="absolute rounded-md"
                      style={{
                        left: "50%",
                        transform: `translateX(-50%)`,
                        top: y,
                        width: NOTE_SIZE,
                        height: NOTE_SIZE,
                        background: "linear-gradient(to bottom, #e0a050, #c0805a, #8a5a3a)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px rgba(192,128,90,0.3), 0 0 20px rgba(192,128,90,0.1)",
                        border: "1px solid rgba(255,200,150,0.2)",
                      }}
                    />
                  );
                })}

                {/* 판정 피드백 */}
                <AnimatePresence>
                  {lastJudgment && (
                    <motion.p
                      key={lastJudgment.key}
                      className="absolute left-1/2 -translate-x-1/2 text-lg font-cinzel font-bold tracking-wider text-center"
                      style={{ top: JUDGE_LINE_Y - 40, color: JUDGMENT_STYLE[lastJudgment.type].color }}
                      initial={{ y: 0, opacity: 1, scale: 1.3 }}
                      animate={{ y: -24, opacity: 0, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {JUDGMENT_STYLE[lastJudgment.type].label}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* AI 턴 */}
            {phase === "aiTurn" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-stone-500 text-xs font-serif mb-3 tracking-widest">상대 차례</p>
                  <motion.div
                    className="w-10 h-10 rounded-full mx-auto"
                    style={{
                      background: "radial-gradient(circle, rgba(192,128,90,0.3), transparent)",
                      boxShadow: "0 0 20px rgba(192,128,90,0.15)",
                    }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                </div>
              </div>
            )}

            <ArenaResult 
              isVisible={phase === "result"} 
              winner={winner} 
              playerScore={playerScore} 
              aiScore={aiScore} 
            />
          </div>

          {/* ═══ 하단 ═══ */}
          <div className="shrink-0 px-3 pb-4 pt-2 md:px-5 md:pb-5 safe-area-bottom"
            style={{ background: "linear-gradient(to top, rgba(14,13,10,0.95), rgba(14,13,10,0.7) 60%, transparent)" }}
          >
            {phase === "playing" && (
              <div className="text-center">
                <p className="text-xs font-serif text-white/25">
                  화면을 탭하거나 Space를 눌러 판정
                </p>
              </div>
            )}
          </div>

          {/* ═══ 인트로 오버레이 ═══ */}
          <ArenaIntro
            isVisible={phase === "intro"}
            onDismiss={dismissIntro}
            playerCard={playerCard}
            aiCard={aiCard}
            title="CLASH"
            themeColor="192,128,90"
            themeColorHex="#d4af37"
            rules={[
              { icon: "🎯", text: "낙하하는 노트가 판정선에 닿을 때 탭" },
              { icon: "⚡", text: <><span className="text-[#d4af37]/80 font-serif">PERFECT</span> &gt; <span className="text-white/60 font-serif">GOOD</span> &gt; <span className="text-[#c04040]/80 font-serif">MISS</span></> },
              { icon: "⚔", text: "상대보다 높은 점수로 승리" }
            ]}
            footerText="모바일: 화면 탭 · 데스크톱: Space"
          />

      </ArenaLayout>
  );
}
