/*
  파일명: RhythmArena.tsx
  기능: 전투(assault) 접전 — 낙하노트 리듬 미니게임
  책임: rAF 기반 노트 낙하 → 하단 동심원 타겟 → 별도 버튼 판정
*/
"use client";

import { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import type { RhythmJudgment, Lane } from "@/lib/game/rhythmEngine";
import {
  NOTE_COUNT,
  generateNotes,
  judgeInput,
  calcRhythmScore,
  simulateAiRhythm,
} from "@/lib/game/rhythmEngine";
import ArenaLayout from "../shared/ArenaLayout";
import ArenaHud from "../shared/ArenaHud";
import ArenaIntro from "../shared/ArenaIntro";
import ArenaResult from "../shared/ArenaResult";
import ArenaFooter from "../shared/ArenaFooter";

import type { RhythmArenaProps } from "./types";
import type { Phase } from "./types";
import {
  JUDGMENT_STYLE, JUDGE_RATIO, LANE_COUNT, LANE_KEYS, LANE_KEY_CODES,
} from "./types";
import { useRhythmLoop } from "./useRhythmLoop";
import PlayField from "./sections/PlayField";

export default function RhythmArena({ playerCard, aiCard, onComplete }: RhythmArenaProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [notes] = useState(() => generateNotes(NOTE_COUNT));
  const [currentNote, setCurrentNote] = useState(0);
  const [judgments, setJudgments] = useState<RhythmJudgment[]>([]);
  const [lastHit, setLastHit] = useState<{ lane: Lane; type: RhythmJudgment; key: number } | null>(null);
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

  // 노트 DOM refs (rAF에서 직접 조작)
  const noteElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const notePositionsRef = useRef<number[]>([]);
  // 타겟·버튼 DOM refs (조건부 스타일 직접 조작)
  const targetOuterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const targetMidRefs = useRef<(HTMLDivElement | null)[]>([]);
  const targetCenterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const btnLabelRefs = useRef<(HTMLSpanElement | null)[]>([]);

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

  const tick = useRhythmLoop(notes, {
    startTimeRef, currentNoteRef, judgeYRef, rafRef,
    noteElsRef, notePositionsRef,
    targetOuterRefs, targetMidRefs, targetCenterRefs,
    btnRefs, btnLabelRefs,
  });

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
          <PlayField
            notes={notes}
            judgeY={judgeY}
            phase={phase}
            countdown={countdown}
            lastHit={lastHit}
            noteElsRef={noteElsRef}
            targetOuterRefs={targetOuterRefs}
            targetMidRefs={targetMidRefs}
            targetCenterRefs={targetCenterRefs}
          />
        )}

        {/* AI 턴 */}
        {phase === "aiTurn" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-text-secondary text-xs font-serif mb-3 tracking-widest">상대 차례</p>
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
            {Array.from({ length: LANE_COUNT }, (_, i) => (
              <button
                key={i}
                ref={el => { btnRefs.current[i] = el; }}
                type="button"
                className={`flex-1 flex items-center justify-center rounded-lg active:scale-95 ${
                  phase === "countdown" ? "opacity-40" : ""
                }`}
                style={{
                  height: 72,
                  background: "linear-gradient(to bottom, rgba(30,28,24,0.6), rgba(20,18,14,0.8))",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleInput(i as Lane);
                }}
              >
                <span
                  ref={el => { btnLabelRefs.current[i] = el; }}
                  className="text-lg font-mono font-bold select-none"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  {LANE_KEYS[i]}
                </span>
              </button>
            ))}
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
