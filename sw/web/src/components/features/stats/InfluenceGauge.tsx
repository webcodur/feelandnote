/*
  파일명: /components/features/stats/InfluenceGauge.tsx
  기능: 영향력 및 등급 게이지 표시
  책임: 사용자 영향력 점수와 등급 진행도 시각화
*/ // ------------------------------
"use client";

import { Card } from "@/components/ui";

interface InfluenceGaugeProps {
  influence: {
    friends: number;
    followers: number;
    achievementScore: number;
    totalInfluence: number;
    rank: string;
    rankEmoji: string;
    nextRank: string;
    nextRankThreshold: number;
    progress: number;
  };
  ranks: Array<{
    name: string;
    min: number;
    max: number;
    emoji: string;
    color: string;
  }>;
}

export default function InfluenceGauge({ influence, ranks }: InfluenceGaugeProps) {
  const currentRankData = ranks.find((r) => r.name === influence.rank);
  const nextRankData = ranks.find((r) => r.name === influence.nextRank);

  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg mb-4">영향력 & 등급</h3>

      <div className="text-center mb-6">
        <div className="text-5xl mb-2">{influence.rankEmoji}</div>
        <div className="text-2xl font-bold" style={{ color: currentRankData?.color }}>
          {influence.rank}
        </div>
        <div className="text-3xl font-black mt-2">
          {influence.totalInfluence.toLocaleString()}
        </div>
        <div className="text-xs text-text-secondary mt-1">총 영향력</div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-text-secondary mb-2">
          <span>{influence.rank}</span>
          <span>{influence.nextRank}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${influence.progress}%`,
              backgroundColor: currentRankData?.color,
            }}
          />
        </div>
        <div className="text-xs text-text-secondary mt-2 text-center">
          다음 등급까지 {(influence.nextRankThreshold - influence.totalInfluence).toLocaleString()} 남음
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between py-2 border-b border-white/5">
          <span className="text-text-secondary">친구</span>
          <span>
            {influence.friends}명 <span className="text-text-secondary">(×10 = {influence.friends * 10})</span>
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-white/5">
          <span className="text-text-secondary">팔로워</span>
          <span>
            {influence.followers}명 <span className="text-text-secondary">(×5 = {influence.followers * 5})</span>
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-text-secondary">업적 점수</span>
          <span>{influence.achievementScore.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-text-secondary mb-2">등급 목록</div>
        <div className="flex gap-1">
          {ranks.map((rank) => (
            <div
              key={rank.name}
              className={`flex-1 text-center py-1.5 rounded text-xs ${
                rank.name === influence.rank
                  ? "ring-2 ring-offset-1 ring-offset-bg-card"
                  : "opacity-50"
              }`}
              style={{
                backgroundColor: `${rank.color}20`,
                color: rank.color,
                "--tw-ring-color": rank.name === influence.rank ? rank.color : "transparent",
              } as React.CSSProperties}
              title={`${rank.min.toLocaleString()} - ${rank.max === Infinity ? "∞" : rank.max.toLocaleString()}`}
            >
              {rank.emoji}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
