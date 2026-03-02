/*
  파일명: /components/features/scriptures/history/EraGanttChart.tsx
  기능: 매체별 존속 기간을 간트 차트 형태로 시각화
  책임: 각 시대의 시작~종료 연도를 수평 바로 표현하고, 클릭 시 해당 섹션으로 스크롤한다.
        고대~현대 범위가 극단적인 경우 고대 구간을 자동 절단하여 가독성을 확보한다.
*/ // ------------------------------

"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo } from "react";
import type { HistoryEra } from "@/constants/scripturesHistory";
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

  // 중앙값(median) 기준으로 주 클러스터의 시작을 추정
  const medianStart = starts[Math.floor(starts.length / 2)];
  // 주 클러스터에 속하는 시대: medianStart 이전 범위가 전체의 30% 이내인 것들
  const clusterThreshold = realMin + totalSpan * 0.3;
  const outliers = starts.filter((s) => s < clusterThreshold);
  const clusterStarts = starts.filter((s) => s >= clusterThreshold);

  // 이탈점이 전체의 소수(전체의 30% 미만)이고, 갭이 전체의 70% 초과일 때만 절단
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

  // 클러스터 시작 전에 ~20% 패딩
  const clusterSpan = CURRENT_YEAR - clusterMin;
  const padding = Math.round(clusterSpan * 0.2);
  const displayMin = clusterMin - padding;

  return { displayMin };
}

export default function EraGanttChart({ eras }: { eras: HistoryEra[] }) {
  const { displayMin } = useMemo(() => calcTruncation(eras), [eras]);
  const maxYear = CURRENT_YEAR;
  const displaySpan = maxYear - displayMin;
  const t = useTranslations("scriptures.history");

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // 축 눈금 생성 (displayMin 기준)
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
              const pos = ((tick.year - displayMin) / displaySpan) * 100;
              return (
                <div
                  key={tick.year}
                  className="absolute top-0 -translate-x-1/2"
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
                      const pos = ((tick.year - displayMin) / displaySpan) * 100;
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
                      {/* 연도 툴팁 (hover) */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="text-[8px] sm:text-[9px] font-mono text-black/80 font-bold whitespace-nowrap px-1">
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
