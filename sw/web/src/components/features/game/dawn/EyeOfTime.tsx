/*
  파일명: components/features/game/dawn/EyeOfTime.tsx
  기능: "시간의 눈" 미니게임 오버레이
  책임: Phase 1 범위 선택 → Phase 2 균형 유지 게임 (난이도 = 범위 폭)
*/
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Eye, X, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
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
// holdBase < |drift| 이므로 누르기만으로는 밀림을 완전히 상쇄 못함
// holdRamp: 누를수록 우측 가속 — 타이밍 있는 탭핑이 핵심
function getDifficultyParams(rangeWidth: number) {
  if (rangeWidth >= 1500)
    return {
      drift: -3.8, holdBase: 3.2, holdRamp: 8.0,
      duration: 6, safeStart: 0.46, safeEnd: 0.54,
      windInterval: 60, windRange: [-3.0, 1.5] as [number, number],
      labelKey: "extreme",
    };
  if (rangeWidth >= 800)
    return {
      drift: -2.8, holdBase: 2.4, holdRamp: 6.0,
      duration: 5, safeStart: 0.44, safeEnd: 0.56,
      windInterval: 90, windRange: [-2.2, 1.2] as [number, number],
      labelKey: "hard",
    };
  if (rangeWidth >= 300)
    return {
      drift: -2.0, holdBase: 1.7, holdRamp: 4.5,
      duration: 4.5, safeStart: 0.42, safeEnd: 0.58,
      windInterval: 130, windRange: [-1.6, 0.8] as [number, number],
      labelKey: "normal",
    };
  return {
    drift: -1.5, holdBase: 1.3, holdRamp: 3.2,
    duration: 4, safeStart: 0.40, safeEnd: 0.60,
    windInterval: 170, windRange: [-1.2, 0.6] as [number, number],
    labelKey: "easy",
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
  const t = useTranslations("rest.arena.dawn.game.eyeOfTime");
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

  // ── 파생 값 ──
  const p = paramsRef.current;
  const inSafeZone = position >= p.safeStart && position <= p.safeEnd;
  const progressPercent =
    phase === "balance" ? ((p.duration - timeLeft) / p.duration) * 100 : 0;
  const minHandlePercent = ((rangeMin - fullMin) / fullRange) * 100;
  const maxHandlePercent = ((rangeMax - fullMin) / fullRange) * 100;

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
          <div
            className="w-full flex flex-col items-center gap-5 animate-in fade-in duration-300 select-none"
          >
            {/* 선택된 범위 */}
            <div className="flex items-center gap-3 text-lg font-cinzel font-bold text-white">
              <span>{formatYear(rangeMin)}</span>
              <span className="text-white/30">~</span>
              <span>{formatYear(rangeMax)}</span>
            </div>

            {/* 난이도 별 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/40 mr-1">{t("difficulty")}</span>
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
                {t("rangeWidth", { count: rangeWidth })}
              </span>
            </div>

            {/* 듀얼 핸들 슬라이더 — 포인터 이벤트를 트랙에만 한정 */}
            <div
              ref={sliderRef}
              className="relative w-full h-12 touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
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
              {t("rangeTip")}
            </p>
            <button
              onClick={confirmRange}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600/80 hover:bg-purple-500/80 border border-purple-400/30 text-white font-serif font-bold text-base transition-all active:scale-95"
            >
              {t("confirmRange")}
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ════ Phase 2: 균형 유지 게임 ════ */}
        {phase === "balance" && !result && (
          <div
            className="w-full flex flex-col items-center select-none touch-none animate-in fade-in duration-300"
          >
            {/* 난이도 라벨 */}
            <div className="h-10 flex items-center justify-center">
              <span className="text-sm text-white/60 font-serif">
                {t("balanceMode", {
                  difficulty: t(`difficultyLevels.${getDifficultyParams(rangeWidth).labelKey}`),
                })}
              </span>
            </div>

            {/* 진행 바 */}
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-none bg-purple-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* 타이머 */}
            <div className="h-5 flex items-center justify-center mt-1">
              {isPlaying && (
                <span className="text-xs font-cinzel text-white/40">
                  {timeLeft.toFixed(1)}s
                </span>
              )}
            </div>

            {/* 게이지 바 */}
            <div className="relative w-full h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden mt-2">
              <div
                className="absolute top-0 bottom-0 bg-green-500/10 border-x border-green-400/20"
                style={{
                  left: `${p.safeStart * 100}%`,
                  width: `${(p.safeEnd - p.safeStart) * 100}%`,
                }}
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
              <div
                className={cn(
                  "absolute top-1 bottom-1 w-2 rounded-full transition-none -translate-x-1/2",
                  inSafeZone
                    ? "bg-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                    : "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]"
                )}
                style={{ left: `${position * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ════ 결과 모달 ════ */}
        {phase === "balance" && result && (
          <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 fade-in duration-300">
            {/* 결과 라벨 */}
            {result === "perfect" && (
              <span className="text-4xl font-serif font-black text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">
                {t("perfect")}
              </span>
            )}
            {result === "good" && (
              <span className="text-4xl font-serif font-black text-green-300 drop-shadow-[0_0_16px_rgba(74,222,128,0.4)]">
                {t("good")}
              </span>
            )}
            {result === "miss" && (
              <span className="text-4xl font-serif font-black text-red-300 drop-shadow-[0_0_16px_rgba(248,113,113,0.4)]">
                {t("miss")}
              </span>
            )}

            {/* 정답 안내 */}
            <p className="text-sm text-white/70 text-center leading-relaxed mt-1">
              {t("answer", {
                name: celebName,
                year: formatYear(correctYear),
              })}
            </p>

            {result === "perfect" && (
              <span className="text-xs text-yellow-200/50">{t("torchReward")}</span>
            )}

            <button
              onClick={handleResultTap}
              className={cn(
                "mt-3 px-8 py-3 rounded-xl font-serif font-bold text-base transition-all active:scale-95 border",
                result === "perfect"
                  ? "bg-yellow-600/30 hover:bg-yellow-500/40 border-yellow-400/30 text-yellow-200"
                  : result === "good"
                    ? "bg-green-600/30 hover:bg-green-500/40 border-green-400/30 text-green-200"
                    : "bg-red-600/30 hover:bg-red-500/40 border-red-400/30 text-red-200"
              )}
            >
              {t("continue")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
