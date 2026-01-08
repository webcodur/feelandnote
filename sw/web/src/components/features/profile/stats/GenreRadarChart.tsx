/*
  파일명: /components/features/stats/GenreRadarChart.tsx
  기능: 장르 선호도 레이더 차트 렌더링
  책임: 장르별 선호도를 Recharts 레이더 차트로 시각화
*/ // ------------------------------
"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui";

interface GenreRadarChartProps {
  data: Array<{
    genre: string;
    score: number;
  }>;
}

export default function GenreRadarChart({ data }: GenreRadarChartProps) {
  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg mb-4">장르 선호도</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#30363d" />
            <PolarAngleAxis
              dataKey="genre"
              tick={{ fill: "#8b949e", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: "#8b949e", fontSize: 10 }}
              tickCount={5}
            />
            <Radar
              name="선호도"
              dataKey="score"
              stroke="#7c4dff"
              fill="#7c4dff"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {data
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((item, index) => (
            <div
              key={item.genre}
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor:
                  index === 0
                    ? "rgba(124, 77, 255, 0.2)"
                    : index === 1
                    ? "rgba(245, 158, 11, 0.2)"
                    : "rgba(16, 185, 129, 0.2)",
                color:
                  index === 0 ? "#7c4dff" : index === 1 ? "#f59e0b" : "#10b981",
              }}
            >
              #{index + 1} {item.genre} ({item.score}%)
            </div>
          ))}
      </div>
    </Card>
  );
}
