/*
  Phase 2: 균형 유지 게임 + 결과 모달
*/
import { cn } from "@/lib/utils";
import { formatYear, getDifficultyParams } from "../types";
import type { DifficultyParams, Result } from "../types";

interface BalancePhaseProps {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  result: Result;
  position: number;
  timeLeft: number;
  isPlaying: boolean;
  rangeWidth: number;
  params: DifficultyParams;
  celebName: string;
  correctYear: number;
  handleResultTap: () => void;
}

export default function BalancePhase({
  t,
  result,
  position,
  timeLeft,
  isPlaying,
  rangeWidth,
  params: p,
  celebName,
  correctYear,
  handleResultTap,
}: BalancePhaseProps) {
  const inSafeZone = position >= p.safeStart && position <= p.safeEnd;
  const progressPercent = ((p.duration - timeLeft) / p.duration) * 100;

  return (
    <>
      {/* ════ Phase 2: 균형 유지 게임 ════ */}
      {!result && (
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
      {result && (
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
    </>
  );
}
