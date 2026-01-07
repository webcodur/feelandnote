/*
  파일명: /components/features/stats/CategoryDonutChart.tsx
  기능: 카테고리 분포 도넛 차트 렌더링
  책임: 콘텐츠 카테고리별 비율을 Recharts 파이 차트로 시각화
*/ // ------------------------------
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui";

interface CategoryDonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export default function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg mb-4">카테고리 분포</h3>
      <div className="flex items-center gap-6">
        <div className="w-[180px] h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f242c",
                  border: "1px solid #30363d",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(value: number) => [`${value}개`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{item.value}</span>
                <span className="text-xs text-text-secondary">
                  ({Math.round((item.value / total) * 100)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
