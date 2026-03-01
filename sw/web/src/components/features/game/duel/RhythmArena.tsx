/*
  파일명: components/features/game/duel/RhythmArena.tsx
  기능: 전투(assault) 접전 — 낙하노트 리듬 미니게임
  책임: rAF 기반 노트 낙하 → 하단 동심원 타겟 → 별도 버튼 판정
*/
"use client";

import { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleCard } from "@/lib/game/types";
import {
  type RhythmJudgment,
  type Lane,
  NOTE_COUNT,
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
import ArenaFooter from "./shared/ArenaFooter";

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

const JUDGE_RATIO = 0.78;    // 플레이 영역 높이의 78% 지점에 타겟 배치
const NOTE_R = 16;           // 노트 반지름
const TARGET_R = 24;         // 타겟 동심원 반지름
const LANE_GAP = 72;         // 레인 간 중심 간격
const LANE_COUNT = 3;
const LANE_KEYS = ["Q", "W", "E"] as const;
const LANE_KEY_CODES: Record<string, Lane> = { KeyQ: 0, KeyW: 1, KeyE: 2 };

// 레인 X 오프셋 (중앙 기준): -72, 0, +72
const laneX = (lane: number) => (lane - 1) * LANE_GAP;

type Phase = "intro" | "countdown" | "playing" | "aiTurn" | "result";

// ─── 적중 링 이펙트 ───

function HitRing({ lane, type, judgeY }: { lane: Lane; type: RhythmJudgment; judgeY: number }) {
  if (type === "miss") return null;
  const color = type === "perfect" ? "#d4af37" : "#c0c0c0";
  return (
    <motion.div
      className="absolute left-1/2 pointer-events-none text-center"
      style={{
        top: judgeY - 50,
        transform: "translateX(-50%)",
      }}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 0, y: -20 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="text-base font-cinzel font-bold tracking-wider"
        style={{ color, textShadow: `0 0 12px ${color}80` }}
      >
        {type === "perfect" ? "PERFECT" : "GOOD"}
      </span>
    </motion.div>
  );
}

// ─── 메인 컴포넌트 ───

export default function RhythmArena({ playerCard, aiCard, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [notes] = useState(() => generateNotes(NOTE_COUNT));
  const [currentNote, setCurrentNote] = useState(0);
  const [judgments, setJudgments] = useState<RhythmJudgment[]>([]);
  const [lastHit, setLastHit] = useState<{ lane: Lane; type: RhythmJudgment; key: number } | null>(null);
  const [notePositions, setNotePositions] = useState<number[]>(() => notes.map(() => -(NOTE_R * 2)));
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState<"player" | "ai" | "draw">("draw");
  const [countdown, setCountdown] = useState(3);

  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentNoteRef = useRef(0);
  const judgeKeyRef = useRef(0);
  const areaRef = useRef<HTMLDivElement>(null);
  const [judgeY, setJudgeY] = useState(300);

  // 플레이 영역 높이 측정 → judgeY 계산
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const update = () => setJudgeY(Math.round(el.clientHeight * JUDGE_RATIO));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { currentNoteRef.current = currentNote; }, [currentNote]);

  // ─── rAF 루프 ───
  const judgeYRef = useRef(judgeY);
  judgeYRef.current = judgeY;

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const jy = judgeYRef.current;
    setNotePositions(notes.map((note) => {
      const progress = (elapsed - (note.targetTime - NOTE_FALL_DURATION)) / NOTE_FALL_DURATION;
      if (progress < 0) return -(NOTE_R * 2);
      return progress * jy;
    }));
    rafRef.current = requestAnimationFrame(tick);
  }, [notes]);

  // ─── Intro → countdown ───
  const dismissIntro = useCallback(() => {
    if (phase !== "intro") return;
    setPhase("countdown");
  }, [phase]);

  // ─── 카운트다운 → playing ───
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          startTimeRef.current = Date.now();
          setPhase("playing");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === "playing") {
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [phase, tick]);

  // ─── 노트 자동 miss ───
  useEffect(() => {
    if (phase !== "playing" || currentNote >= notes.length) return;
    const curNote = notes[currentNote];
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = curNote.targetTime + 150 - elapsed;

    noteTimerRef.current = setTimeout(() => {
      judgeKeyRef.current++;
      setJudgments(prev => [...prev, "miss"]);
      setLastHit({ lane: curNote.lane, type: "miss", key: judgeKeyRef.current });
      setCurrentNote(prev => prev + 1);
    }, Math.max(0, remaining));

    return () => clearTimeout(noteTimerRef.current);
  }, [phase, currentNote, notes]);

  // ─── 노트 소진 → AI ───
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
      const aiResult = simulateAiRhythm(aiCard, NOTE_COUNT);
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
  const handleInput = useCallback((inputLane: Lane) => {
    if (phase !== "playing" || currentNoteRef.current >= notes.length) return;
    clearTimeout(noteTimerRef.current);

    const note = notes[currentNoteRef.current];
    const elapsed = Date.now() - startTimeRef.current;
    const j = judgeInput(elapsed, note.targetTime, inputLane, note.lane);

    judgeKeyRef.current++;
    setJudgments(prev => [...prev, j]);
    setLastHit({ lane: note.lane, type: j, key: judgeKeyRef.current });
    setCurrentNote(prev => prev + 1);
  }, [phase, notes]);

  // 키보드
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === "intro" && (e.code === "Space" || e.code in LANE_KEY_CODES)) {
        e.preventDefault();
        dismissIntro();
        return;
      }
      const lane = LANE_KEY_CODES[e.code];
      if (lane !== undefined) {
        e.preventDefault();
        handleInput(lane);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleInput, dismissIntro, phase]);

  // ─── 스킵 ───
  const handleScreenClick = useCallback(() => {
    if (phase === "result") onCompleteRef.current(winner);
  }, [phase, winner]);

  // 현재 노트 레인 (버튼 강조용)
  const activeNoteLane = phase === "playing" && currentNote < notes.length
    ? notes[currentNote].lane : -1;
  const noteNearTarget = activeNoteLane >= 0 && notePositions[currentNote] > judgeY - 80;
  const noteVeryClose = noteNearTarget && notePositions[currentNote] > judgeY - 35;

  // ─── 렌더 ───
  return (
    <ArenaLayout themeColor="rgba(192,128,90)">
      <ArenaHud
        playerCard={playerCard}
        aiCard={aiCard}
        themeColor="192,128,90"
        centerContent={
          phase === "playing" || phase === "countdown" ? (
            <span className="font-cinzel text-xs md:text-sm tracking-[0.2em] text-[rgba(212,175,55,0.7)]"
              style={{ textShadow: "0 0 8px rgba(192,128,90,0.2)" }}>
              {currentNote}/{notes.length}
            </span>
          ) : null
        }
        playerContent={
          <div className="flex gap-1 mt-1">
            {judgments.map((j, i) => (
              <div key={i} className="w-2 h-2 rounded-full"
                style={{ backgroundColor: JUDGMENT_STYLE[j].color }}
              />
            ))}
          </div>
        }
      />

      {/* ═══ 플레이 영역 ═══ */}
      <div ref={areaRef} className="flex-1 relative overflow-hidden"
        onClick={phase !== "playing" && phase !== "countdown" ? handleScreenClick : undefined}
      >
        {(phase === "countdown" || phase === "playing") && (
          <div className="absolute inset-0">

            {/* 레인 가이드선 (수직, 노트와 동일 좌표계) */}
            {Array.from({ length: LANE_COUNT }, (_, i) => (
              <div key={i} className="absolute inset-y-0 w-px pointer-events-none"
                style={{
                  left: `calc(50% + ${laneX(i)}px)`,
                  background: "linear-gradient(to bottom, transparent 5%, rgba(192,128,90,0.1) 30%, rgba(192,128,90,0.1) 80%, transparent 95%)",
                }}
              />
            ))}

            {/* ═══ 타겟 동심원 (하단 고정, 비주얼 전용) ═══ */}
            {Array.from({ length: LANE_COUNT }, (_, i) => {
              const isActive = activeNoteLane === i && noteNearTarget;
              const isHot = isActive && noteVeryClose;

              return (
                <div key={`target-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `calc(50% + ${laneX(i)}px)`,
                    top: judgeY,
                    transform: "translate(-50%, -50%)",
                    width: TARGET_R * 2,
                    height: TARGET_R * 2,
                  }}
                >
                  {/* 외곽 링 */}
                  <div className="absolute inset-0 rounded-full transition-all duration-100"
                    style={{
                      border: isHot
                        ? "2.5px solid rgba(212,175,55,0.8)"
                        : isActive
                          ? "2px solid rgba(212,175,55,0.45)"
                          : "2px solid rgba(212,175,55,0.15)",
                      boxShadow: isHot
                        ? "0 0 24px rgba(212,175,55,0.4), inset 0 0 10px rgba(212,175,55,0.1)"
                        : "none",
                    }}
                  />
                  {/* 중간 링 */}
                  <div className="absolute rounded-full transition-all duration-100"
                    style={{
                      inset: 7,
                      border: isHot
                        ? "1.5px solid rgba(212,175,55,0.4)"
                        : "1px solid rgba(212,175,55,0.08)",
                    }}
                  />
                  {/* 중심 점 */}
                  <div className="absolute rounded-full transition-all duration-100"
                    style={{
                      inset: 16,
                      background: isHot
                        ? "rgba(212,175,55,0.3)"
                        : "rgba(212,175,55,0.06)",
                    }}
                  />
                </div>
              );
            })}

            {/* ═══ 낙하 노트 (단순 원) ═══ */}
            {phase === "playing" && notes.map((note, i) => {
              if (i < currentNote) return null;
              const y = notePositions[i];
              if (y < -(NOTE_R * 2)) return null;

              const dist = judgeY - y;
              const isNear = dist < 60 && dist > -20;
              const isHot = dist < 30 && dist > -10;

              return (
                <div
                  key={note.id}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `calc(50% + ${laneX(note.lane)}px)`,
                    top: y,
                    transform: "translate(-50%, -50%)",
                    width: NOTE_R * 2,
                    height: NOTE_R * 2,
                    background: isHot
                      ? "radial-gradient(circle, #fcd34d 30%, #d4af37 70%, #c08030)"
                      : "radial-gradient(circle, #e0a050 30%, #c08030 70%, #8a5a3a)",
                    border: isHot
                      ? "2px solid rgba(252,211,77,0.8)"
                      : isNear
                        ? "1.5px solid rgba(224,160,80,0.6)"
                        : "1.5px solid rgba(224,160,80,0.35)",
                    boxShadow: isHot
                      ? "0 0 18px rgba(212,175,55,0.6), 0 0 6px rgba(255,200,100,0.4)"
                      : isNear
                        ? "0 0 8px rgba(192,128,90,0.3)"
                        : "none",
                    transition: "border 0.08s, box-shadow 0.08s",
                  }}
                />
              );
            })}

            {/* 판정 텍스트 (동심원 위에 표시) */}
            <AnimatePresence>
              {lastHit && (
                <HitRing key={lastHit.key} lane={lastHit.lane} type={lastHit.type} judgeY={judgeY} />
              )}
            </AnimatePresence>

            {/* 카운트다운 오버레이 */}
            {phase === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ background: "rgba(0,0,0,0.25)" }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={countdown}
                    className="text-7xl font-cinzel font-bold text-[#d4af37]"
                    style={{ textShadow: "0 0 30px rgba(212,175,55,0.4), 0 0 60px rgba(212,175,55,0.15)" }}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {countdown}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}
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

      {/* ═══ 하단 클릭 영역 (1×3 널찍한 버튼) ═══ */}
      {(phase === "countdown" || phase === "playing") && (
        <div className="shrink-0"
          style={{
            background: "linear-gradient(to top, rgba(14,13,10,0.97), rgba(20,18,14,0.9) 40%, rgba(20,18,14,0.6))",
            borderTop: "1px solid rgba(212,175,55,0.12)",
          }}
        >
          <div className="flex gap-3 px-4 py-4 md:px-6 md:py-5">
            {Array.from({ length: LANE_COUNT }, (_, i) => {
              const isActive = activeNoteLane === i && noteNearTarget;
              const isHot = isActive && noteVeryClose;

              return (
                <button
                  key={i}
                  type="button"
                  className={`flex-1 flex items-center justify-center rounded-lg transition-all duration-100 active:scale-95 ${
                    phase === "countdown" ? "opacity-40" : ""
                  }`}
                  style={{
                    height: 72,
                    background: isHot
                      ? "linear-gradient(to bottom, rgba(212,175,55,0.18), rgba(192,128,90,0.12))"
                      : isActive
                        ? "linear-gradient(to bottom, rgba(212,175,55,0.08), rgba(30,28,24,0.8))"
                        : "linear-gradient(to bottom, rgba(30,28,24,0.6), rgba(20,18,14,0.8))",
                    border: isHot
                      ? "2px solid rgba(212,175,55,0.7)"
                      : isActive
                        ? "1px solid rgba(212,175,55,0.3)"
                        : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: isHot
                      ? "0 0 20px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.06)"
                      : "inset 0 1px 3px rgba(0,0,0,0.4)",
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleInput(i as Lane);
                  }}
                >
                  <span className={`text-lg font-mono font-bold select-none transition-colors duration-100 ${
                    isHot ? "text-[#d4af37]" : isActive ? "text-[#d4af37]/50" : "text-white/20"
                  }`}>
                    {LANE_KEYS[i]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 하단 ═══ */}
      <ArenaFooter
        onForfeit={() => onComplete("ai")}
        hint={phase === "playing" ? "원이 겹칠 때 터치" : undefined}
      />

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
          { icon: "⚔", text: "원이 하단 동심원에 겹칠 때 해당 버튼 터치" },
          { icon: "⚡", text: <><span className="text-[#d4af37]/80 font-serif">PERFECT</span> &gt; <span className="text-white/60 font-serif">GOOD</span> &gt; <span className="text-[#c04040]/80 font-serif">MISS</span></> },
          { icon: "🏆", text: "상대보다 높은 점수로 승리" }
        ]}
        footerText="모바일: 하단 버튼 터치 · PC: Q / W / E"
      />
    </ArenaLayout>
  );
}
