/*
  rAF 기반 노트 낙하 루프 + 타겟/버튼 DOM 직접 조작
*/
import { useCallback, useRef } from "react";
import { NOTE_FALL_DURATION } from "@/lib/game/rhythmEngine";
import type { RhythmNote } from "@/lib/game/rhythmEngine";
import { NOTE_R } from "./types";

export interface RhythmLoopRefs {
  startTimeRef: React.MutableRefObject<number>;
  currentNoteRef: React.MutableRefObject<number>;
  judgeYRef: React.MutableRefObject<number>;
  rafRef: React.MutableRefObject<number>;
  noteElsRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  notePositionsRef: React.MutableRefObject<number[]>;
  targetOuterRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  targetMidRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  targetCenterRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  btnRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  btnLabelRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
}

// 타겟 동심원 스타일 직접 적용
function applyTargetStyle(
  refs: Pick<RhythmLoopRefs, "targetOuterRefs" | "targetMidRefs" | "targetCenterRefs">,
  lane: number, near: boolean, hot: boolean,
) {
  const outer = refs.targetOuterRefs.current[lane];
  const mid = refs.targetMidRefs.current[lane];
  const center = refs.targetCenterRefs.current[lane];
  if (outer) {
    outer.style.border = hot ? "2.5px solid rgba(212,175,55,0.8)"
      : near ? "2px solid rgba(212,175,55,0.45)" : "2px solid rgba(212,175,55,0.15)";
    outer.style.boxShadow = hot
      ? "0 0 24px rgba(212,175,55,0.4), inset 0 0 10px rgba(212,175,55,0.1)" : "none";
  }
  if (mid) {
    mid.style.border = hot ? "1.5px solid rgba(212,175,55,0.4)" : "1px solid rgba(212,175,55,0.08)";
  }
  if (center) {
    center.style.background = hot ? "rgba(212,175,55,0.3)" : "rgba(212,175,55,0.06)";
  }
}

// 버튼 스타일 직접 적용
function applyBtnStyle(
  refs: Pick<RhythmLoopRefs, "btnRefs" | "btnLabelRefs">,
  lane: number, near: boolean, hot: boolean,
) {
  const btn = refs.btnRefs.current[lane];
  const label = refs.btnLabelRefs.current[lane];
  if (btn) {
    btn.style.background = hot
      ? "linear-gradient(to bottom, rgba(212,175,55,0.18), rgba(192,128,90,0.12))"
      : near ? "linear-gradient(to bottom, rgba(212,175,55,0.08), rgba(30,28,24,0.8))"
        : "linear-gradient(to bottom, rgba(30,28,24,0.6), rgba(20,18,14,0.8))";
    btn.style.border = hot ? "2px solid rgba(212,175,55,0.7)"
      : near ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(255,255,255,0.06)";
    btn.style.boxShadow = hot
      ? "0 0 20px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "inset 0 1px 3px rgba(0,0,0,0.4)";
  }
  if (label) {
    label.style.color = hot ? "#d4af37" : near ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.2)";
  }
}

export function useRhythmLoop(notes: RhythmNote[], refs: RhythmLoopRefs) {
  // 이전 프레임의 활성 상태 캐싱 (불필요한 DOM 조작 방지)
  const prevActiveRef = useRef<{ lane: number; near: boolean; hot: boolean }>({ lane: -1, near: false, hot: false });

  const tick = useCallback(() => {
    const elapsed = Date.now() - refs.startTimeRef.current;
    const jy = refs.judgeYRef.current;
    const cur = refs.currentNoteRef.current;

    // 노트 위치 계산 + DOM 직접 업데이트
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const progress = (elapsed - (note.targetTime - NOTE_FALL_DURATION)) / NOTE_FALL_DURATION;
      const y = progress < 0 ? -(NOTE_R * 2) : progress * jy;
      refs.notePositionsRef.current[i] = y;

      const el = refs.noteElsRef.current[i];
      if (!el) continue;
      if (i < cur || y < -(NOTE_R * 2)) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "";
      el.style.transform = `translate(-50%, ${y}px)`;

      // 조건부 스타일 직접 반영
      const dist = jy - y;
      const isHot = dist < 30 && dist > -10;
      const isNear = dist < 60 && dist > -20;
      if (isHot) {
        el.style.background = "radial-gradient(circle, #fcd34d 30%, #d4af37 70%, #c08030)";
        el.style.border = "2px solid rgba(252,211,77,0.8)";
        el.style.boxShadow = "0 0 18px rgba(212,175,55,0.6), 0 0 6px rgba(255,200,100,0.4)";
      } else if (isNear) {
        el.style.background = "radial-gradient(circle, #e0a050 30%, #c08030 70%, #8a5a3a)";
        el.style.border = "1.5px solid rgba(224,160,80,0.6)";
        el.style.boxShadow = "0 0 8px rgba(192,128,90,0.3)";
      } else {
        el.style.background = "radial-gradient(circle, #e0a050 30%, #c08030 70%, #8a5a3a)";
        el.style.border = "1.5px solid rgba(224,160,80,0.35)";
        el.style.boxShadow = "none";
      }
    }

    // 타겟·버튼 활성 상태 (현재 노트 기준)
    const activeLane = cur < notes.length ? notes[cur].lane : -1;
    const curY = cur < notes.length ? (refs.notePositionsRef.current[cur] ?? 0) : 0;
    const near = activeLane >= 0 && curY > jy - 80;
    const hot = near && curY > jy - 35;
    const prev = prevActiveRef.current;

    if (prev.lane !== activeLane || prev.near !== near || prev.hot !== hot) {
      // 이전 레인 초기화
      if (prev.lane >= 0 && prev.lane !== activeLane) {
        applyTargetStyle(refs, prev.lane, false, false);
        applyBtnStyle(refs, prev.lane, false, false);
      }
      // 현재 레인 적용
      if (activeLane >= 0) {
        applyTargetStyle(refs, activeLane, near, hot);
        applyBtnStyle(refs, activeLane, near, hot);
      }
      // 이전 레인이 같지만 상태만 변경
      if (prev.lane === activeLane && activeLane >= 0) {
        applyTargetStyle(refs, activeLane, near, hot);
        applyBtnStyle(refs, activeLane, near, hot);
      }
      prevActiveRef.current = { lane: activeLane, near, hot };
    }

    refs.rafRef.current = requestAnimationFrame(tick);
  }, [notes, refs]);

  return tick;
}

