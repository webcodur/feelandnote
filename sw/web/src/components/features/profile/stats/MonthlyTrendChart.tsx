/*
  파일명: /components/features/stats/MonthlyTrendChart.tsx
  기능: 월별 트렌드 라인 차트 렌더링
  책임: 콘텐츠/리뷰/노트의 월별 추이를 Recharts 라인 차트로 시각화
*/ // ------------------------------
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui";

interface MonthlyTrendChartProps {
  data: Array<{
    month: string;
    contents: number;
    reviews: number;
    notes: number;
  }>;
}

export default function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const total = {
    contents: data.reduce((sum, d) => sum + d.contents, 0),
    reviews: data.reduce((sum, d) => sum + d.reviews, 0),
    notes: data.reduce((sum, d) => sum + d.notes, 0),
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">월별 트렌드</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#7c4dff]" />
            <span className="text-text-secondary">콘텐츠 ({total.contents})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span className="text-text-secondary">리뷰 ({total.reviews})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span className="text-text-secondary">노트 ({total.notes})</span>
          </div>
        </div>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis
              dataKey="month"
              tick={{ fill: "#8b949e", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#30363d" }}
            />
            <YAxis
              tick={{ fill: "#8b949e", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#30363d" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f242c",
                border: "1px solid #30363d",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="contents"
              name="콘텐츠"
              stroke="#7c4dff"
              strokeWidth={2}
              dot={{ fill: "#7c4dff", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="reviews"
              name="리뷰"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: "#f59e0b", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="notes"
              name="노트"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
