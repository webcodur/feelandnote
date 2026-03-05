/*
  파일명: /components/features/scriptures/museum/EraGanttChart.tsx
  기능: 매체별 존속 기간을 간트 차트 형태로 시각화
  책임: 각 시대의 시작~종료 연도를 수평 바로 표현하고, 클릭 시 해당 섹션으로 스크롤한다.
        고대~현대 범위가 극단적인 경우 고대 구간을 자동 절단하여 가독성을 확보한다.
*/ // ------------------------------

"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo } from "react";
import type { HistoryEra } from "@/constants/scripturesMuseum";
import { useTranslations } from "next-intl";

const CURRENT_YEAR = 2026;

function formatYear(year: number): string {
  if (year <= 0) return `BC ${Math.abs(year)}`;
  return `${year}`;
}

/**
 * 고대 구간 절단 판별.
 * 시대의 과반수가 몰려있는 주 클러스터를 찾고,
 * 그 클러스터 밖의 이탈점(outlier)이 전체 범위의 70% 이상을 차지하면 절단한다.
 */
function calcTruncation(eras: HistoryEra[]) {
  const starts = eras.map((e) => e.startYear).sort((a, b) => a - b);
  const realMin = starts[0];
  const totalSpan = CURRENT_YEAR - realMin;
  if (totalSpan <= 0 || starts.length < 3) {
    return { displayMin: realMin };
  }

  const clusterThreshold = realMin + totalSpan * 0.3;
  const outliers = starts.filter((s) => s < clusterThreshold);
  const clusterStarts = starts.filter((s) => s >= clusterThreshold);

  if (
    outliers.length === 0 ||
    clusterStarts.length === 0 ||
    outliers.length >= starts.length * 0.5
  ) {
    return { displayMin: realMin };
  }

  const clusterMin = clusterStarts[0];
  const gap = clusterMin - realMin;
  if (gap / totalSpan < 0.7) {
    return { displayMin: realMin };
  }

  const clusterSpan = CURRENT_YEAR - clusterMin;
  const padding = Math.round(clusterSpan * 0.2);
  const displayMin = clusterMin - padding;

  return { displayMin };
}

export default function EraGanttChart({ eras }: { eras: HistoryEra[] }) {
  const { displayMin } = useMemo(() => calcTruncation(eras), [eras]);
  const maxYear = CURRENT_YEAR;
  const displaySpan = maxYear - displayMin;
  const t = useTranslations("scriptures.museum");

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const ticks = useMemo(() => {
    const result: { year: number; label: string }[] = [];
    let step: number;
    if (displaySpan > 4000) step = 1000;
    else if (displaySpan > 2000) step = 500;
    else if (displaySpan > 500) step = 200;
    else if (displaySpan > 200) step = 100;
    else step = 50;

    const start = Math.ceil(displayMin / step) * step;
    for (let y = start; y <= maxYear; y += step) {
      result.push({
        year: y,
        label: y <= 0 ? `BC${Math.abs(y)}` : `${y}`,
      });
    }
    return result;
  }, [displayMin, maxYear, displaySpan]);

  const getBarStyle = (era: HistoryEra) => {
    const end = era.endYear ?? CURRENT_YEAR;
    const clampedStart = Math.max(era.startYear, displayMin);
    const left = ((clampedStart - displayMin) / displaySpan) * 100;
    const width = ((end - clampedStart) / displaySpan) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.8)}%` };
  };

  const getMobileBarWidth = (era: HistoryEra) => {
    const end = era.endYear ?? CURRENT_YEAR;
    const duration = end - era.startYear;
    const maxDuration = Math.max(...eras.map((e) => (e.endYear ?? CURRENT_YEAR) - e.startYear));
    return Math.max((duration / maxDuration) * 100, 8);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="mb-8 sm:mb-12"
    >
      {/* ── 모바일: 압축 리스트 ── */}
      <div className="sm:hidden bg-white/[0.03] border border-white/[0.08] rounded-2xl p-2.5">
        <div className="flex flex-col gap-0.5">
          {eras.map((era, index) => {
            const isOngoing = !era.endYear;
            const barWidth = getMobileBarWidth(era);
            return (
              <button
                key={era.id}
                onClick={() => handleClick(era.id)}
                className="group text-left px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors duration-200"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] text-white/80 group-hover:text-[#d4af37] font-medium transition-colors truncate leading-none">
                    {era.name}
                  </span>
                  <span className="text-[9px] font-mono text-white/45 whitespace-nowrap flex-shrink-0 leading-none">
                    {formatYear(era.startYear)}–{isOngoing ? t("present") : formatYear(era.endYear!)}
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.04 * index, ease: "easeOut" }}
                    className={`h-full bg-gradient-to-r from-[#d4af37]/70 to-[#d4af37]/40 group-hover:from-[#d4af37] group-hover:to-[#d4af37]/60 rounded-full transition-colors ${isOngoing ? "rounded-r-none" : ""}`}
                    style={{ width: `${barWidth}%`, transformOrigin: "left center" }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 데스크톱: 기존 간트 차트 ── */}
      <div className="hidden sm:block bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-6">
        <div>
          <div className="relative h-6 ml-[120px]">
            {ticks.map((tick) => {
              const pos = ((tick.year - displayMin) / displaySpan) * 100;
              return (
                <div
                  key={tick.year}
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${pos}%` }}
                >
                  <span className="text-[10px] text-white/30 font-mono whitespace-nowrap">
                    {tick.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            {eras.map((era, index) => {
              const barStyle = getBarStyle(era);
              const isOngoing = !era.endYear;
              return (
                <button
                  key={era.id}
                  onClick={() => handleClick(era.id)}
                  className="group flex items-center gap-3 text-left hover:bg-white/[0.03] rounded-lg transition-colors duration-200 py-1 px-1"
                >
                  <div className="w-[112px] flex-shrink-0 text-right pr-2">
                    <span className="text-xs text-white/60 group-hover:text-[#d4af37] transition-colors duration-200 font-medium truncate block">
                      {era.name}
                    </span>
                  </div>

                  <div className="relative flex-1 h-6">
                    {ticks.map((tick) => {
                      const pos = ((tick.year - displayMin) / displaySpan) * 100;
                      return (
                        <div
                          key={tick.year}
                          className="absolute top-0 bottom-0 w-px bg-white/[0.04]"
                          style={{ left: `${pos}%` }}
                        />
                      );
                    })}

                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: 0.6,
                        delay: 0.1 * index,
                        ease: "easeOut",
                      }}
                      className={`
                        absolute top-1 bottom-1
                        bg-gradient-to-r from-[#d4af37]/70 to-[#d4af37]/40
                        group-hover:from-[#d4af37] group-hover:to-[#d4af37]/60
                        transition-all duration-200
                        shadow-[0_0_8px_rgba(212,175,55,0.15)]
                        group-hover:shadow-[0_0_12px_rgba(212,175,55,0.3)]
                        rounded-full
                        ${isOngoing ? "rounded-r-none border-r-2 border-r-[#d4af37]/50" : ""}
                      `}
                      style={{
                        ...barStyle,
                        transformOrigin: "left center",
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="text-[9px] font-mono text-black/80 font-bold whitespace-nowrap px-1">
                          {formatYear(era.startYear)}
                          {" ~ "}
                          {isOngoing ? t("present") : formatYear(era.endYear!)}
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
