/*
  파일명: components/features/game/dawn/EyeOfTime.tsx
  기능: "시간의 눈" 미니게임 오버레이
  책임: Phase 1 범위 선택 → Phase 2 균형 유지 게임 (난이도 = 범위 폭)
*/
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Eye, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "range" | "balance";
type Result = "perfect" | "good" | "miss" | null;

interface EyeOfTimeProps {
  boardYears: number[];
  correctYear: number;
  celebName: string;
  onPerfect: () => void;
  onGood: (correctIndex: number) => void;
  onMiss: () => void;
  onCancel: () => void;
}

// ── 난이도 스케일링 (범위 폭 기반) ──
// holdBase >= |drift| 이므로 누르는 동안은 절대 떨어지지 않음
// holdRamp: 누를수록 우측 가속 — 난이도 높을수록 급격히 튐
function getDifficultyParams(rangeWidth: number) {
  if (rangeWidth >= 1500)
    return {
      drift: -2.5, holdBase: 2.6, holdRamp: 6.0,
      duration: 5, safeStart: 0.44, safeEnd: 0.56,
      windInterval: 80, windRange: [-2.0, 1.0] as [number, number],
      label: "극한",
    };
  if (rangeWidth >= 800)
    return {
      drift: -1.8, holdBase: 1.9, holdRamp: 4.5,
      duration: 4.5, safeStart: 0.42, safeEnd: 0.58,
      windInterval: 120, windRange: [-1.5, 0.8] as [number, number],
      label: "어려움",
    };
  if (rangeWidth >= 300)
    return {
      drift: -1.4, holdBase: 1.5, holdRamp: 3.5,
      duration: 4, safeStart: 0.40, safeEnd: 0.60,
      windInterval: 160, windRange: [-1.2, 0.6] as [number, number],
      label: "보통",
    };
  return {
    drift: -1.0, holdBase: 1.1, holdRamp: 2.5,
    duration: 3.5, safeStart: 0.38, safeEnd: 0.62,
    windInterval: 200, windRange: [-0.9, 0.5] as [number, number],
    label: "쉬움",
  };
}

function getDifficultyStars(rangeWidth: number): number {
  if (rangeWidth >= 1500) return 5;
  if (rangeWidth >= 800) return 4;
  if (rangeWidth >= 300) return 3;
  if (rangeWidth >= 100) return 2;
  return 1;
}

function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `AD ${year}`;
}

// ── 균형 게임 상수 (고정) ──
const DAMPING = 2.0; // 낮을수록 반응 빠름, 돌풍이 더 크게 튐
const OVERSHOOT_PULL = 3.0; // 우측 초과 복원력
const PERFECT_SHRINK = 0.1;

export default function EyeOfTime({
  boardYears,
  correctYear,
  celebName,
  onPerfect,
  onGood,
  onMiss,
  onCancel,
}: EyeOfTimeProps) {
  const [phase, setPhase] = useState<Phase>("range");
  const [result, setResult] = useState<Result>(null);

  // ── Phase 1: 범위 선택 상태 ──
  // 트랙: 모든 연도를 반드시 포함 + 양쪽 패딩(최대 200년씩). 최소 폭 800년.
  const allYears = [...boardYears, correctYear];
  const yearMin = Math.min(...allYears);
  const yearMax = Math.max(...allYears);
  const dataSpan = yearMax - yearMin;
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
  const diffStars = getDifficultyStars(rangeWidth);

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
    // 정답이 범위 밖이면 즉시 실패
    if (correctYear < rangeMin || correctYear > rangeMax) {
      setPhase("balance");
      setResult("miss");
      return;
    }
    // 범위 폭 기반 난이도 산출 후 균형 게임 시작
    const params = getDifficultyParams(rangeWidth);
    paramsRef.current = params;
    setPhase("balance");
    setTimeLeft(params.duration);
    // 약간의 딜레이 후 자동 시작
    setTimeout(() => {
      posRef.current = 0.5;
      velRef.current = 0;
      windRef.current = 0;
      lastTimeRef.current = 0;
      windTimerRef.current = 0;
      startTimeRef.current = 0;
      centerFramesRef.current = 0;
      totalFramesRef.current = 0;
      setPosition(0.5);
      setIsPlaying(true);
    }, 600);
  };

  // ── 홀드 시작/종료 ──
  const startHold = useCallback(() => {
    if (!isPlaying || result || holdingRef.current) return;
    holdingRef.current = true;
    holdStartRef.current = performance.now();
    setIsHolding(true);
  }, [isPlaying, result]);

  const endHold = useCallback(() => {
    holdingRef.current = false;
    setIsHolding(false);
  }, []);

  // ── 키보드 (스페이스 홀드) ──
  useEffect(() => {
    if (!isPlaying || result) return;
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
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isPlaying, result, startHold, endHold]);

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
        if (velRef.current < 0) velRef.current = 0; // 후퇴 즉시 중단
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

      // 경계 이탈 → MISS
      if (posRef.current < 0 || posRef.current > 1) {
        posRef.current = Math.max(0, Math.min(1, posRef.current));
        setPosition(posRef.current);
        setResult("miss");
        setIsPlaying(false);
        holdingRef.current = false;
        setIsHolding(false);
        return;
      }

      // 시간 경과
      const elapsed = (time - startTimeRef.current) / 1000;
      const remaining = Math.max(0, p.duration - elapsed);
      setTimeLeft(remaining);
      setPosition(posRef.current);

      if (remaining <= 0) {
        const centerRatio = centerFramesRef.current / totalFramesRef.current;
        setResult(centerRatio >= 0.6 ? "perfect" : "good");
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

  // ── 파생 값 ──
  const p = paramsRef.current;
  const inSafeZone = position >= p.safeStart && position <= p.safeEnd;
  const progressPercent =
    phase === "balance" ? ((p.duration - timeLeft) / p.duration) * 100 : 0;
  const minHandlePercent = ((rangeMin - fullMin) / fullRange) * 100;
  const maxHandlePercent = ((rangeMax - fullMin) / fullRange) * 100;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg mx-4 flex flex-col items-center gap-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <Eye
            size={28}
            className="text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]"
          />
          <h2 className="text-xl md:text-2xl font-serif font-black text-purple-300">
            시간의 눈
          </h2>
          {phase === "range" && (
            <button
              onClick={onCancel}
              className="absolute right-0 top-0 p-2 text-white/40 hover:text-white/70 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <p className="text-sm text-white/60 font-serif text-center">
          {celebName}의 출생 연도를 꿰뚫어 보세요.
        </p>

        {/* ════ Phase 1: 범위 선택 ════ */}
        {phase === "range" && (
          <div
            className="w-full flex flex-col items-center gap-5 animate-in fade-in duration-300 touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* 선택된 범위 */}
            <div className="flex items-center gap-3 text-lg font-cinzel font-bold text-white">
              <span>{formatYear(rangeMin)}</span>
              <span className="text-white/30">~</span>
              <span>{formatYear(rangeMax)}</span>
            </div>

            {/* 난이도 별 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/40 mr-1">난이도</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "text-sm transition-colors",
                    i < diffStars ? "text-purple-400" : "text-white/15"
                  )}
                >
                  ★
                </span>
              ))}
              <span className="text-xs text-white/30 ml-1">
                ({rangeWidth}년)
              </span>
            </div>

            {/* 듀얼 핸들 슬라이더 */}
            <div
              ref={sliderRef}
              className="relative w-full h-12"
            >
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full bg-white/10" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-purple-500/50"
                style={{
                  left: `${minHandlePercent}%`,
                  width: `${maxHandlePercent - minHandlePercent}%`,
                }}
              />
              {/* Min 핸들 (시각 표시용) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-purple-600 border-2 border-purple-300 shadow-lg flex items-center justify-center pointer-events-none"
                style={{ left: `${minHandlePercent}%` }}
              >
                <div className="w-1.5 h-3 rounded-full bg-purple-200" />
              </div>
              {/* Max 핸들 (시각 표시용) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-purple-600 border-2 border-purple-300 shadow-lg flex items-center justify-center pointer-events-none"
                style={{ left: `${maxHandlePercent}%` }}
              >
                <div className="w-1.5 h-3 rounded-full bg-purple-200" />
              </div>
            </div>

            {/* 전체 범위 라벨 */}
            <div className="w-full flex justify-between text-[10px] text-white/30 font-cinzel px-1">
              <span>{formatYear(fullMin)}</span>
              <span>{formatYear(fullMax)}</span>
            </div>

            {/* 안내 + 확정 버튼 */}
            <p className="text-[11px] text-white/35 text-center leading-relaxed">
              범위를 좁히면 균형 게임이 쉬워진다
            </p>
            <button
              onClick={confirmRange}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600/80 hover:bg-purple-500/80 border border-purple-400/30 text-white font-serif font-bold text-base transition-all active:scale-95"
            >
              범위 확정
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ════ Phase 2: 균형 유지 게임 ════ */}
        {phase === "balance" && (
          <div
            className="w-full flex flex-col items-center select-none touch-none animate-in fade-in duration-300"
            onClick={result ? handleResultTap : undefined}
            onPointerDown={result ? undefined : startHold}
            onPointerUp={result ? undefined : endHold}
            onPointerLeave={result ? undefined : endHold}
          >
            {/* 상단 텍스트 슬롯 — 고정 높이 */}
            <div className="h-12 flex flex-col items-center justify-center">
              {result === "perfect" && (
                <span className="text-2xl font-serif font-black text-yellow-300 drop-shadow-[0_0_16px_rgba(250,204,21,0.6)] animate-in zoom-in-95 fade-in duration-400">
                  PERFECT!
                </span>
              )}
              {result === "good" && (
                <span className="text-2xl font-serif font-black text-green-300 drop-shadow-[0_0_12px_rgba(74,222,128,0.4)] animate-in zoom-in-95 fade-in duration-400">
                  GOOD
                </span>
              )}
              {result === "miss" && (
                <span className="text-2xl font-serif font-black text-red-300 drop-shadow-[0_0_12px_rgba(248,113,113,0.4)] animate-in zoom-in-95 fade-in duration-400">
                  MISS
                </span>
              )}
              {!result && !isPlaying && (
                <span className="text-sm text-white/60 font-serif">
                  균형 유지 — {getDifficultyParams(rangeWidth).label}
                </span>
              )}
              {!result && isPlaying && (
                <span className="text-xs text-white/50">
                  {isHolding ? "누르는 중..." : "꾹 누르면 우측 가속"}
                </span>
              )}
            </div>

            {/* 부가 텍스트 슬롯 — 고정 높이 */}
            <div className="h-5 flex items-center justify-center">
              {result === "perfect" && (
                <span className="text-xs text-yellow-200/60">완벽한 균형! 횃불 +1</span>
              )}
              {result === "good" && (
                <span className="text-xs text-green-200/60">버텼다 — 자동 배치</span>
              )}
              {result === "miss" && (
                <span className="text-xs text-red-200/60">
                  {correctYear < rangeMin || correctYear > rangeMax
                    ? "정답이 범위 밖이다..."
                    : "균형을 잃었다..."}
                </span>
              )}
              {!result && !isPlaying && (
                <span className="text-[11px] text-white/35">
                  꾹 누르면 우측 가속 · {getDifficultyParams(rangeWidth).duration}초 버티기
                </span>
              )}
              {!result && isPlaying && !inSafeZone && (
                <span className="text-[10px] text-orange-400/70 animate-pulse">위험 구간!</span>
              )}
            </div>

            {/* 진행 바 — 항상 표시 */}
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-4">
              <div
                className={cn(
                  "h-full rounded-full transition-none",
                  result === "miss"
                    ? "bg-red-500"
                    : result
                      ? "bg-green-500"
                      : "bg-purple-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* 타이머 슬롯 — 고정 높이 */}
            <div className="h-5 flex items-center justify-center mt-1">
              {isPlaying && (
                <span className="text-xs font-cinzel text-white/40">
                  {timeLeft.toFixed(1)}s
                </span>
              )}
              {result && (
                <span className="text-xs text-white/30 animate-pulse">탭하여 계속</span>
              )}
            </div>

            {/* 게이지 바 — 항상 표시 */}
            <div className="relative w-full h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden mt-2">
              {/* 안전 존 배경 */}
              <div
                className="absolute top-0 bottom-0 bg-green-500/10 border-x border-green-400/20"
                style={{
                  left: `${p.safeStart * 100}%`,
                  width: `${(p.safeEnd - p.safeStart) * 100}%`,
                }}
              />

              {/* 중앙선 */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />

              {/* 바늘 */}
              <div
                className={cn(
                  "absolute top-1 bottom-1 w-2 rounded-full transition-none -translate-x-1/2",
                  result === "miss"
                    ? "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.6)]"
                    : result === "perfect"
                      ? "bg-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.8)]"
                      : result === "good"
                        ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]"
                        : inSafeZone
                          ? "bg-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                          : "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]"
                )}
                style={{ left: `${position * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
