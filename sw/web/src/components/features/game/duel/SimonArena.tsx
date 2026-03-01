/*
  파일명: components/features/game/duel/SimonArena.tsx
  기능: 내정(govern) 접전 — 사이먼 게임 미니게임
  책임: 2×3 그리드 패턴 기억, 라운드 진행, AI 시뮬, 승패 결정
*/
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleCard } from "@/lib/game/types";
import {
  GRID_SIZE,
  MAX_ROUNDS,
  SHOW_INTERVAL,
  SHOW_DURATION,
  CELL_COLORS,
  getPatternLength,
  generatePattern,
  isInputCorrectSoFar,
  isPatternComplete,
  simulateAiSimon,
} from "@/lib/game/simonEngine";
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

// ─── Phase ───

type Phase = "intro" | "countdown" | "showing" | "input" | "wrongFlash" | "aiDecide" | "roundResult" | "result";

const KEY_MAP: Record<string, number> = {
  KeyQ: 0, KeyW: 1, KeyE: 2,
  KeyA: 3, KeyS: 4, KeyD: 5,
};

// ─── 컴포넌트 ───

export default function SimonArena({ playerCard, aiCard, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [wrongIdx, setWrongIdx] = useState(-1);       // 오답 플래시
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [playerOk, setPlayerOk] = useState(true);
  const [roundMsg, setRoundMsg] = useState("");
  const [winner, setWinner] = useState<"player" | "ai" | "draw">("draw");
  const [countdown, setCountdown] = useState(3);

  const showTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ─── 타이머 정리 헬퍼 ───
  const clearShowTimers = useCallback(() => {
    showTimersRef.current.forEach(clearTimeout);
    showTimersRef.current = [];
  }, []);

  // 언마운트 시 정리
  useEffect(() => () => clearShowTimers(), [clearShowTimers]);

  // ─── Intro (탭-투-스타트) ───
  const dismissIntro = useCallback(() => {
    if (phase !== "intro") return;
    setPhase("countdown");
  }, [phase]);

  // ─── 라운드 시작: 패턴 생성 → showing ───
  const startRound = useCallback((r: number) => {
    clearShowTimers();
    const len = getPatternLength(r);
    const p = generatePattern(len);
    setPattern(p);
    setPlayerInput([]);
    setPlayerOk(true);
    setRound(r);
    setHighlightIdx(-1);
    setWrongIdx(-1);
    setPhase("showing");

    // 순차 점등
    const timers: ReturnType<typeof setTimeout>[] = [];
    p.forEach((cell, i) => {
      timers.push(setTimeout(() => setHighlightIdx(cell), i * SHOW_INTERVAL));
      timers.push(setTimeout(() => setHighlightIdx(-1), i * SHOW_INTERVAL + SHOW_DURATION));
    });

    // 점등 완료 → input
    timers.push(setTimeout(() => {
      setHighlightIdx(-1);
      setPhase("input");
    }, p.length * SHOW_INTERVAL + 200));

    showTimersRef.current = timers;
  }, [clearShowTimers]);

  // ─── 카운트다운 → 1라운드 시작 ───
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          startRound(1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, startRound]);

  // ─── 셀 클릭 ───
  const handleCellClick = useCallback((cellIdx: number) => {
    if (phase !== "input") return;

    const next = [...playerInput, cellIdx];
    setPlayerInput(next);

    // 일시 하이라이트
    setHighlightIdx(cellIdx);
    setTimeout(() => setHighlightIdx(-1), 200);

    if (!isInputCorrectSoFar(next, pattern)) {
      // 오답: 빨간 플래시 후 AI 판정으로
      setWrongIdx(cellIdx);
      setPlayerOk(false);
      setPhase("wrongFlash");
      return;
    }

    if (isPatternComplete(next, pattern)) {
      setPhase("aiDecide");
    }
  }, [phase, playerInput, pattern]);

  // ─── 오답 플래시 → AI 판정 ───
  useEffect(() => {
    if (phase !== "wrongFlash") return;
    const t = setTimeout(() => {
      setWrongIdx(-1);
      setPhase("aiDecide");
    }, 600);
    return () => clearTimeout(t);
  }, [phase]);

  // ─── AI 판정 ───
  useEffect(() => {
    if (phase !== "aiDecide") return;
    const t = setTimeout(() => {
      const aiSuccess = simulateAiSimon(aiCard, round);
      const pOk = playerOk;
      const aOk = aiSuccess;

      if (pOk && aOk) {
        if (round >= MAX_ROUNDS) {
          setRoundMsg("양측 모두 성공 — 무승부");
          setWinner("draw");
          setPhase("result");
        } else {
          setRoundMsg(`${round}라운드 양측 성공`);
          setPhase("roundResult");
        }
      } else if (pOk && !aOk) {
        setRoundMsg("상대 실패!");
        setWinner("player");
        setPhase("result");
      } else if (!pOk && aOk) {
        setRoundMsg("기억 실패...");
        setWinner("ai");
        setPhase("result");
      } else {
        setRoundMsg("양측 모두 실패 — 무승부");
        setWinner("draw");
        setPhase("result");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [phase, aiCard, round, playerOk]);

  // ─── 라운드 결과 → 다음 라운드 ───
  useEffect(() => {
    if (phase !== "roundResult") return;
    const t = setTimeout(() => startRound(round + 1), 1200);
    return () => clearTimeout(t);
  }, [phase, round, startRound]);

  // ─── 최종 결과 → onComplete ───
  useEffect(() => {
    if (phase !== "result") return;
    const t = setTimeout(() => onCompleteRef.current(winner), 2000);
    return () => clearTimeout(t);
  }, [phase, winner]);

  // ─── 스킵 ───
  const handleScreenClick = useCallback(() => {
    if (phase === "result") onCompleteRef.current(winner);
  }, [phase, winner]);

  // 키보드: Space/Q/W/E/A/S/D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === "intro") {
        if (e.code === "Space" || e.code in KEY_MAP) {
          e.preventDefault();
          dismissIntro();
        }
        return;
      }
      if (phase === "input" && e.code in KEY_MAP) {
        e.preventDefault();
        handleCellClick(KEY_MAP[e.code]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dismissIntro, handleCellClick, phase]);

  // ─── 렌더 ───
  return (
    <ArenaLayout themeColor="rgba(122,154,176)" onClick={handleScreenClick}>
      <ArenaHud
        playerCard={playerCard}
        aiCard={aiCard}
        themeColor="122,154,176"
        centerContent={
          phase !== "intro" && phase !== "result" && phase !== "countdown" ? (
            <span className="text-base md:text-lg font-bold text-[#d4af37]">
              {round}<span className="text-xs text-white/40 ml-1">/ {MAX_ROUNDS}</span>
            </span>
          ) : null
        }
      />

      {/* ═══ 안내 ═══ */}
      {phase !== "intro" && phase !== "result" && (
        <p className="text-center text-xs font-serif text-white/25 pt-3 pb-1 shrink-0">
          순서대로 칸을 눌러 재현하라 · PC: Q W E / A S D
        </p>
      )}

      {/* ═══ 메인 영역 ═══ */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">

            {/* 그리드 — 카운트다운/showing/input/wrongFlash/aiDecide 모두에서 표시 */}
            {(phase === "countdown" || phase === "showing" || phase === "input" || phase === "wrongFlash" || phase === "aiDecide") && (
              <div className="flex flex-col items-center gap-5 relative">
                {/* 상태 텍스트 */}
                <p className="text-stone-500 text-xs font-serif">
                  {phase === "countdown" && "준비"}
                  {phase === "showing" && "관찰"}
                  {phase === "input" && `입력 ${playerInput.length}/${pattern.length}`}
                  {phase === "wrongFlash" && "오답!"}
                  {phase === "aiDecide" && "상대 차례..."}
                </p>

                {/* 2×3 그리드 */}
                <div className={`grid grid-cols-3 gap-3 ${phase === "countdown" ? "opacity-40" : ""}`}
                  style={{ transition: "opacity 0.3s" }}
                >
                  {Array.from({ length: GRID_SIZE }, (_, i) => {
                    const isHighlight = highlightIdx === i;
                    const isWrong = wrongIdx === i;

                    return (
                      <motion.button
                        key={i}
                        className="relative w-[68px] h-[68px] md:w-20 md:h-20 rounded-lg"
                        style={{
                          background: isWrong
                            ? "linear-gradient(to bottom, rgba(160,48,48,0.9), rgba(120,30,30,0.95))"
                            : isHighlight
                              ? `linear-gradient(to bottom, ${CELL_COLORS[i]}, ${CELL_COLORS[i]}cc)`
                              : `linear-gradient(to bottom, rgba(30,30,30,0.5), rgba(15,15,15,0.7))`,
                          border: `2px solid ${
                            isWrong ? "#ea580c"
                              : isHighlight ? "#fcd34d"
                              : "rgba(255,255,255,0.04)"
                          }`,
                          boxShadow: isHighlight
                            ? `0 0 20px ${CELL_COLORS[i]}80, inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.4)`
                            : isWrong
                              ? "0 0 24px rgba(220,38,38,0.6), inset 0 2px 4px rgba(255,255,255,0.3)"
                              : "inset 0 2px 6px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.2)",
                          transition: "background 0.1s, border-color 0.1s, box-shadow 0.1s, transform 0.1s",
                        }}
                        whileTap={phase === "input" ? { scale: 0.92 } : undefined}
                        onClick={(e) => { e.stopPropagation(); handleCellClick(i); }}
                        disabled={phase !== "input"}
                      >
                        {(phase === "input" || phase === "countdown") && (
                          <span className="absolute bottom-1 right-1.5 text-[9px] text-white/20 font-mono hidden md:inline">
                            {["Q","W","E","A","S","D"][i]}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* 카운트다운 오버레이 — 그리드 위에 표시 */}
                {phase === "countdown" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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

            {/* 라운드 결과 */}
            <AnimatePresence>
              {phase === "roundResult" && (
                <motion.p
                  className="text-stone-300 text-lg font-serif"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {roundMsg}
                </motion.p>
              )}
            </AnimatePresence>

            <ArenaResult 
              isVisible={phase === "result"} 
              winner={winner} 
              message={roundMsg}
            />
          </div>

          {/* ═══ 하단 ═══ */}
          <ArenaFooter onForfeit={() => onComplete("ai")} />

          {/* ═══ 인트로 오버레이 ═══ */}
          <ArenaIntro
            isVisible={phase === "intro"}
            onDismiss={dismissIntro}
            playerCard={playerCard}
            aiCard={aiCard}
            title="TACTICS"
            themeColor="122,154,176"
            themeColorHex="#7a9ab0"
            rules={[
              { icon: "👁", text: "점등되는 순서를 기억하라" },
              { icon: "👆", text: "같은 순서로 칸을 눌러 재현" },
              { icon: "📈", text: `라운드마다 패턴이 길어진다 (최대 ${MAX_ROUNDS}라운드)` }
            ]}
            footerText="모바일: 칸 터치 · PC: Q W E / A S D"
          />
      </ArenaLayout>
  );
}
