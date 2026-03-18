/*
  플레이 영역 — 레인 가이드선, 타겟 동심원, 낙하 노트, 판정 텍스트, 카운트다운
*/
"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { RhythmJudgment, Lane } from "@/lib/game/rhythmEngine";
import type { RhythmNote } from "@/lib/game/rhythmEngine";
import HitRing from "./HitRing";
import { LANE_COUNT, NOTE_R, TARGET_R, laneX } from "../types";
import type { Phase } from "../types";

interface Props {
  notes: RhythmNote[];
  judgeY: number;
  phase: Phase;
  countdown: number;
  lastHit: { lane: Lane; type: RhythmJudgment; key: number } | null;
  noteElsRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  targetOuterRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  targetMidRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  targetCenterRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export default function PlayField({
  notes, judgeY, phase, countdown, lastHit,
  noteElsRef, targetOuterRefs, targetMidRefs, targetCenterRefs,
}: Props) {
  return (
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

      {/* ═══ 타겟 동심원 (하단 고정, rAF에서 직접 스타일 조작) ═══ */}
      {Array.from({ length: LANE_COUNT }, (_, i) => (
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
          <div ref={el => { targetOuterRefs.current[i] = el; }}
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(212,175,55,0.15)", boxShadow: "none" }}
          />
          <div ref={el => { targetMidRefs.current[i] = el; }}
            className="absolute rounded-full"
            style={{ inset: 7, border: "1px solid rgba(212,175,55,0.08)" }}
          />
          <div ref={el => { targetCenterRefs.current[i] = el; }}
            className="absolute rounded-full"
            style={{ inset: 16, background: "rgba(212,175,55,0.06)" }}
          />
        </div>
      ))}

      {/* ═══ 낙하 노트 (rAF에서 직접 위치·스타일 조작) ═══ */}
      {notes.map((note, i) => (
        <div
          key={note.id}
          ref={el => { noteElsRef.current[i] = el; }}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `calc(50% + ${laneX(note.lane)}px)`,
            top: 0,
            transform: `translate(-50%, ${-(NOTE_R * 2)}px)`,
            width: NOTE_R * 2,
            height: NOTE_R * 2,
            display: "none",
            background: "radial-gradient(circle, #e0a050 30%, #c08030 70%, #8a5a3a)",
            border: "1.5px solid rgba(224,160,80,0.35)",
            boxShadow: "none",
            willChange: "transform",
          }}
        />
      ))}

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
  );
}
