/*
  Phase 1: 범위 선택 UI
*/
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatYear, getDifficultyStars } from "../types";

interface RangePhaseProps {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  rangeMin: number;
  rangeMax: number;
  rangeWidth: number;
  fullMin: number;
  fullMax: number;
  fullRange: number;
  sliderRef: React.RefObject<HTMLDivElement | null>;
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: () => void;
  confirmRange: () => void;
}

export default function RangePhase({
  t,
  rangeMin,
  rangeMax,
  rangeWidth,
  fullMin,
  fullMax,
  fullRange,
  sliderRef,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  confirmRange,
}: RangePhaseProps) {
  const diffStars = getDifficultyStars(rangeWidth);
  const minHandlePercent = ((rangeMin - fullMin) / fullRange) * 100;
  const maxHandlePercent = ((rangeMax - fullMin) / fullRange) * 100;

  return (
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
  );
}
