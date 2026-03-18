/*
  파일명: EyeOfTime/EyeOfTime.tsx
  기능: "시간의 눈" 미니게임 오버레이
  책임: Phase 1 범위 선택 → Phase 2 균형 유지 게임 (난이도 = 범위 폭)
*/
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Eye, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type Phase,
  type Result,
  type EyeOfTimeProps,
  getDifficultyParams,
  DAMPING,
  OVERSHOOT_PULL,
  PERFECT_SHRINK,
} from "./types";
import RangePhase from "./sections/RangePhase";
import BalancePhase from "./sections/BalancePhase";

export default function EyeOfTime({
  boardYears,
  correctYear,
  celebName,
  onPerfect,
  onGood,
  onMiss,
  onCancel,
}: EyeOfTimeProps) {
  const t = useTranslations("rest.arena.dawn.game.eyeOfTime");
  const [phase, setPhase] = useState<Phase>("range");
  const [result, setResult] = useState<Result>(null);

  // ── Phase 1: 범위 선택 상태 ──
  // 트랙: 모든 연도를 반드시 포함 + 양쪽 패딩(최대 200년씩). 최소 폭 800년.
  const allYears = [...boardYears, correctYear];
  const yearMin = Math.min(...allYears);
  const yearMax = Math.max(...allYears);
  const PAD = 200; // 양쪽 여유
  const MIN_WIDTH = 800;
  const rawMin = yearMin - PAD;
  const rawMax = yearMax + PAD;
  const rawWidth = rawMax - rawMin;
  // 최소 폭 보장 (데이터 중심 기준 확장)
  const extraPad = rawWidth < MIN_WIDTH ? Math.ceil((MIN_WIDTH - rawWidth) / 2) : 0;
  const fullMin = rawMin - extraPad;
  const fullMax = rawMax + extraPad;
  const fullRange = fullMax - fullMin;

  const [rangeMin, setRangeMin] = useState(fullMin);
  const [rangeMax, setRangeMax] = useState(fullMax);
  const sliderRef = useRef<HTMLDivElement>(null);
  const draggingHandle = useRef<"min" | "max" | null>(null);
  const minGap = 50;

  // ── Phase 2: 균형 게임 상태 ──
  const [position, setPosition] = useState(0.5);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const posRef = useRef(0.5);
  const velRef = useRef(0);
  const windRef = useRef(0);
  const lastTimeRef = useRef(0);
  const windTimerRef = useRef(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const centerFramesRef = useRef(0);
  const totalFramesRef = useRef(0);
  const paramsRef = useRef(getDifficultyParams(fullRange));
  const holdingRef = useRef(false); // 누르고 있는지
  const holdStartRef = useRef(0); // 누르기 시작한 시각(ms)

  const rangeWidth = rangeMax - rangeMin;

  // ── 슬라이더 핸들러 ──
  const getYearFromPointer = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return fullMin;
      const rect = sliderRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(fullMin + ratio * fullRange);
    },
    [fullMin, fullRange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const year = getYearFromPointer(e.clientX);
      // 가까운 핸들을 자동 선택
      const distMin = Math.abs(year - rangeMin);
      const distMax = Math.abs(year - rangeMax);
      draggingHandle.current = distMin <= distMax ? "min" : "max";
    },
    [getYearFromPointer, rangeMin, rangeMax]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingHandle.current) return;
      const year = getYearFromPointer(e.clientX);
      if (draggingHandle.current === "min") {
        setRangeMin(Math.min(year, rangeMax - minGap));
      } else {
        setRangeMax(Math.max(year, rangeMin + minGap));
      }
    },
    [getYearFromPointer, rangeMax, rangeMin]
  );

  const handlePointerUp = useCallback(() => {
    draggingHandle.current = null;
  }, []);

  // ── Phase 2 진입 ──
  const confirmRange = () => {
    // 정답이 범위 밖이면 즉시 실패 (fullMin/fullMax 기준 안전장치 포함)
    const safeMin = Math.min(rangeMin, fullMin);
    const safeMax = Math.max(rangeMax, fullMax);
    const isOutside = correctYear < safeMin || correctYear > safeMax;
    if (isOutside) {
      setPhase("balance");
      setResult("miss");
      return;
    }
    // 범위 폭 기반 난이도 산출 후 균형 게임 즉시 시작
    const params = getDifficultyParams(rangeWidth);
    paramsRef.current = params;
    posRef.current = 0.5;
    velRef.current = 0;
    windRef.current = 0;
    lastTimeRef.current = 0;
    windTimerRef.current = 0;
    startTimeRef.current = 0;
    centerFramesRef.current = 0;
    totalFramesRef.current = 0;
    setPosition(0.5);
    setPhase("balance");
    setTimeLeft(params.duration);
    setIsPlaying(true);
  };

  // ── 홀드 시작/종료 ──
  // phase === "balance"이면 게임 시작 여부와 무관하게 즉시 반응
  const startHold = useCallback(() => {
    if (result || holdingRef.current) return;
    holdingRef.current = true;
    holdStartRef.current = performance.now();
    setIsHolding(true);
  }, [result]);

  const endHold = useCallback(() => {
    holdingRef.current = false;
    setIsHolding(false);
  }, []);

  // ── 글로벌 입력 (키보드 + 포인터) ──
  // window 레벨에서 모든 up/cancel을 감지해 홀드 누락 방지
  useEffect(() => {
    if (phase !== "balance" || result) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.key === " ") && !e.repeat) {
        e.preventDefault();
        startHold();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        endHold();
      }
    };
    const onPointerUp = () => endHold();
    const onPointerCancel = () => endHold();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [phase, result, startHold, endHold]);

  // ── 메인 게임 루프 ──
  useEffect(() => {
    if (!isPlaying || result) return;
    const p = paramsRef.current;

    const animate = (time: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
        startTimeRef.current = time;
        windTimerRef.current = time;
      }

      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      // 바람: 주기적으로 방향·강도 변경 (유저가 보고 반응할 수 있는 힘)
      if (time - windTimerRef.current > p.windInterval) {
        windRef.current =
          p.windRange[0] + Math.random() * (p.windRange[1] - p.windRange[0]);
        windTimerRef.current = time;
      }

      // 물리: 좌측 중력 + 바람 + 홀드 + 우측 초과 복원
      let accel = p.drift + windRef.current;

      // 홀드: 누르는 순간 좌측 속도 즉시 제거 + 기본 힘 + 시간 비례 가속
      if (holdingRef.current) {
        if (velRef.current < 0) velRef.current *= 0.5; // 후퇴 감속 (완전 제거 X)
        const holdSec = (time - holdStartRef.current) / 1000;
        accel += p.holdBase + holdSec * p.holdRamp;
      }

      if (posRef.current > p.safeEnd) {
        const excess = posRef.current - p.safeEnd;
        accel -= excess * OVERSHOOT_PULL;
      }

      velRef.current += accel * dt;
      velRef.current *= Math.exp(-DAMPING * dt);
      posRef.current += velRef.current * dt;

      // 중앙 정확도 추적 (safeZone 안쪽 perfectZone)
      const perfectStart = p.safeStart + PERFECT_SHRINK;
      const perfectEnd = p.safeEnd - PERFECT_SHRINK;
      totalFramesRef.current++;
      if (posRef.current >= perfectStart && posRef.current <= perfectEnd) {
        centerFramesRef.current++;
      }

      // 경계 클램프 + 반발 (이탈해도 게임 종료 아님)
      if (posRef.current < 0) {
        posRef.current = 0;
        velRef.current = Math.abs(velRef.current) * 0.3; // 바닥 반발
      } else if (posRef.current > 1) {
        posRef.current = 1;
        velRef.current = -Math.abs(velRef.current) * 0.3; // 천장 반발
      }

      // 시간 경과
      const elapsed = (time - startTimeRef.current) / 1000;
      const remaining = Math.max(0, p.duration - elapsed);
      setTimeLeft(remaining);
      setPosition(posRef.current);

      if (remaining <= 0) {
        const inSafe = posRef.current >= p.safeStart && posRef.current <= p.safeEnd;
        if (!inSafe) {
          // 시간 종료 시 safe zone 밖이면 실패
          setResult("miss");
        } else {
          const centerRatio = centerFramesRef.current / totalFramesRef.current;
          setResult(centerRatio >= 0.6 ? "perfect" : "good");
        }
        setIsPlaying(false);
        holdingRef.current = false;
        setIsHolding(false);
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, result]);

  // ── 결과 콜백 ──
  const handleResultTap = useCallback(() => {
    if (!result) return;
    if (result === "perfect") onPerfect();
    else if (result === "good") {
      const correctIndex = boardYears.filter((y) => y < correctYear).length;
      onGood(correctIndex);
    } else {
      onMiss();
    }
  }, [result, onPerfect, onGood, onMiss, boardYears, correctYear]);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center"
      onPointerDown={phase === "balance" && !result ? startHold : undefined}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg mx-4 flex flex-col items-center gap-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <Eye
            size={28}
            className="text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]"
          />
          <h2 className="text-xl md:text-2xl font-serif font-black text-purple-300">
            {t("title")}
          </h2>
          {phase === "range" && (
            <button
              onClick={onCancel}
              aria-label={t("close")}
              className="absolute right-0 top-0 p-2 text-white/40 hover:text-white/70 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <p className="text-sm text-white/60 font-serif text-center">
          {t("subtitle", { name: celebName })}
        </p>

        {/* ════ Phase 1: 범위 선택 ════ */}
        {phase === "range" && (
          <RangePhase
            t={t}
            rangeMin={rangeMin}
            rangeMax={rangeMax}
            rangeWidth={rangeWidth}
            fullMin={fullMin}
            fullMax={fullMax}
            fullRange={fullRange}
            sliderRef={sliderRef}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            confirmRange={confirmRange}
          />
        )}

        {/* ════ Phase 2: 균형 유지 + 결과 ════ */}
        {phase === "balance" && (
          <BalancePhase
            t={t}
            result={result}
            position={position}
            timeLeft={timeLeft}
            isPlaying={isPlaying}
            rangeWidth={rangeWidth}
            params={paramsRef.current}
            celebName={celebName}
            correctYear={correctYear}
            handleResultTap={handleResultTap}
          />
        )}
      </div>
    </div>
  );
}
