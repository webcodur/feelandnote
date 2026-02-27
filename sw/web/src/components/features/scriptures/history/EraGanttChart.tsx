/*
  파일명: /components/features/scriptures/history/EraGanttChart.tsx
  기능: 매체별 존속 기간을 간트 차트 형태로 시각화
  책임: 각 시대의 시작~종료 연도를 수평 바로 표현하고, 클릭 시 해당 섹션으로 스크롤한다.
*/ // ------------------------------

"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo } from "react";
import type { HistoryEra } from "@/constants/scripturesHistory";

const CURRENT_YEAR = 2026;

function formatYear(year: number): string {
  if (year <= 0) return `BC ${Math.abs(year)}`;
  return `${year}`;
}

export default function EraGanttChart({ eras }: { eras: HistoryEra[] }) {
  const { minYear, maxYear, totalSpan } = useMemo(() => {
    const min = Math.min(...eras.map((e) => e.startYear));
    const max = CURRENT_YEAR;
    return { minYear: min, maxYear: max, totalSpan: max - min };
  }, [eras]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // 축 눈금 생성
  const ticks = useMemo(() => {
    const result: { year: number; label: string }[] = [];
    // 적응적 간격: 전체 범위에 따라 조절
    let step: number;
    if (totalSpan > 4000) step = 1000;
    else if (totalSpan > 2000) step = 500;
    else if (totalSpan > 500) step = 200;
    else step = 50;

    const start = Math.ceil(minYear / step) * step;
    for (let y = start; y <= maxYear; y += step) {
      result.push({
        year: y,
        label: y <= 0 ? `BC${Math.abs(y)}` : `${y}`,
      });
    }
    return result;
  }, [minYear, maxYear, totalSpan]);

  const getBarStyle = (era: HistoryEra) => {
    const end = era.endYear ?? CURRENT_YEAR;
    const left = ((era.startYear - minYear) / totalSpan) * 100;
    const width = ((end - era.startYear) / totalSpan) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.8)}%` };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="mb-8 sm:mb-12"
    >
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-6 overflow-x-auto scrollbar-hidden">
        {/* 차트 영역 */}
        <div className="min-w-[500px]">
          {/* 축 눈금 */}
          <div className="relative h-6 ml-[100px] sm:ml-[120px]">
            {ticks.map((tick) => {
              const pos = ((tick.year - minYear) / totalSpan) * 100;
              return (
                <div
                  key={tick.year}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${pos}%` }}
                >
                  <span className="text-[9px] sm:text-[10px] text-white/30 font-mono whitespace-nowrap">
                    {tick.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 바 행 */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            {eras.map((era, index) => {
              const barStyle = getBarStyle(era);
              const isOngoing = !era.endYear;
              return (
                <button
                  key={era.id}
                  onClick={() => handleClick(era.id)}
                  className="group flex items-center gap-2 sm:gap-3 text-left hover:bg-white/[0.03] rounded-lg transition-colors duration-200 py-1 px-1"
                >
                  {/* 라벨 */}
                  <div className="w-[92px] sm:w-[112px] flex-shrink-0 text-right pr-2">
                    <span className="text-[11px] sm:text-xs text-white/60 group-hover:text-[#d4af37] transition-colors duration-200 font-medium truncate block">
                      {era.name}
                    </span>
                  </div>

                  {/* 바 트랙 */}
                  <div className="relative flex-1 h-5 sm:h-6">
                    {/* 배경 그리드 라인 */}
                    {ticks.map((tick) => {
                      const pos = ((tick.year - minYear) / totalSpan) * 100;
                      return (
                        <div
                          key={tick.year}
                          className="absolute top-0 bottom-0 w-px bg-white/[0.04]"
                          style={{ left: `${pos}%` }}
                        />
                      );
                    })}

                    {/* 바 */}
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: 0.6,
                        delay: 0.1 * index,
                        ease: "easeOut",
                      }}
                      className={`
                        absolute top-1 bottom-1 rounded-full
                        bg-gradient-to-r from-[#d4af37]/70 to-[#d4af37]/40
                        group-hover:from-[#d4af37] group-hover:to-[#d4af37]/60
                        transition-all duration-200
                        shadow-[0_0_8px_rgba(212,175,55,0.15)]
                        group-hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]
                        ${isOngoing ? "rounded-r-none border-r-2 border-r-[#d4af37]/50" : ""}
                      `}
                      style={{
                        ...barStyle,
                        transformOrigin: "left center",
                      }}
                    >
                      {/* 연도 툴팁 (hover) */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="text-[8px] sm:text-[9px] font-mono text-black/80 font-bold whitespace-nowrap px-1">
                          {formatYear(era.startYear)}
                          {" ~ "}
                          {isOngoing ? "현재" : formatYear(era.endYear!)}
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
