/*
  파일명: /components/features/stats/ActivityHeatmap.tsx
  기능: 연간 활동 히트맵 차트 렌더링
  책임: 365일 활동 데이터를 GitHub 스타일 그리드로 시각화
*/ // ------------------------------
"use client";

import { Card } from "@/components/ui";
import { useMemo } from "react";

interface ActivityHeatmapProps {
  data: Array<{
    date: string;
    count: number;
    level: number;
  }>;
}

const LEVEL_COLORS = [
  "#161b22",
  "#0e4429",
  "#006d32",
  "#26a641",
  "#39d353",
];

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { weeks, monthLabels, totalCount } = useMemo(() => {
    const weeks: Array<Array<{ date: string; count: number; level: number } | null>> = [];
    let currentWeek: Array<{ date: string; count: number; level: number } | null> = [];
    const labels: Array<{ month: string; weekIndex: number }> = [];

    let prevMonth = -1;
    let total = 0;

    data.forEach((day, index) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      const month = date.getMonth();

      if (index === 0) {
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push(null);
        }
      }

      currentWeek.push(day);
      total += day.count;

      if (month !== prevMonth) {
        labels.push({ month: MONTHS[month], weekIndex: weeks.length });
        prevMonth = month;
      }

      if (dayOfWeek === 6 || index === data.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return { weeks, monthLabels: labels, totalCount: total };
  }, [data]);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">연간 활동</h3>
        <div className="text-sm text-text-secondary">
          총 <span className="font-semibold text-text-primary">{totalCount}</span>회 활동
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex gap-1 mb-2 ml-8">
            {monthLabels.map((label, i) => (
              <div
                key={i}
                className="text-xs text-text-secondary"
                style={{
                  marginLeft: i === 0 ? 0 : `${(label.weekIndex - (monthLabels[i - 1]?.weekIndex || 0)) * 14 - 20}px`,
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            <div className="flex flex-col gap-1 mr-2">
              {DAYS.map((day, i) => (
                <div
                  key={day}
                  className="h-[12px] text-xs text-text-secondary leading-[12px]"
                  style={{ visibility: i % 2 === 1 ? "visible" : "hidden" }}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="w-[12px] h-[12px] rounded-sm"
                      style={{
                        backgroundColor: day ? LEVEL_COLORS[day.level] : "transparent",
                      }}
                      title={day ? `${day.date}: ${day.count}회 활동` : ""}
                    />
                  ))}
                  {week.length < 7 &&
                    Array(7 - week.length)
                      .fill(null)
                      .map((_, i) => (
                        <div key={`empty-${i}`} className="w-[12px] h-[12px]" />
                      ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-text-secondary">Less</span>
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                className="w-[12px] h-[12px] rounded-sm"
                style={{ backgroundColor: color }}
              />
            ))}
            <span className="text-xs text-text-secondary">More</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
