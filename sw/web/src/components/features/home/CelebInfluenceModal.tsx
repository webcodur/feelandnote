"use client";

import { useEffect, useState } from "react";
import { X, Crown, Lightbulb, Cpu, Users, Coins, Palette, Clock } from "lucide-react";
import { getCelebInfluence, type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { Avatar } from "@/components/ui";

// #region 상수 정의
const RANK_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  S: { bg: "bg-yellow-500", text: "text-yellow-900", glow: "shadow-yellow-500/50" },
  A: { bg: "bg-purple-500", text: "text-white", glow: "shadow-purple-500/50" },
  B: { bg: "bg-blue-500", text: "text-white", glow: "shadow-blue-500/50" },
  C: { bg: "bg-green-500", text: "text-white", glow: "shadow-green-500/50" },
  D: { bg: "bg-gray-500", text: "text-white", glow: "shadow-gray-500/50" },
};

const INFLUENCE_CATEGORIES = [
  { key: "political", label: "정치", icon: Crown, color: "#ef4444", angle: 0 },
  { key: "strategic", label: "전략", icon: Lightbulb, color: "#f97316", angle: 60 },
  { key: "tech", label: "기술", icon: Cpu, color: "#22c55e", angle: 120 },
  { key: "social", label: "사회", icon: Users, color: "#3b82f6", angle: 180 },
  { key: "economic", label: "경제", icon: Coins, color: "#eab308", angle: 240 },
  { key: "cultural", label: "문화", icon: Palette, color: "#a855f7", angle: 300 },
] as const;
// #endregion

// #region 레이더 차트 컴포넌트
function RadarChart({ data }: { data: CelebInfluenceDetail }) {
  const size = 200;
  const center = size / 2;
  const maxRadius = 80;

  // 육각형 꼭지점 계산 (상단이 0도)
  const getPoint = (angle: number, value: number) => {
    const radian = ((angle - 90) * Math.PI) / 180;
    const radius = (value / 10) * maxRadius;
    return {
      x: center + radius * Math.cos(radian),
      y: center + radius * Math.sin(radian),
    };
  };

  // 그리드 레벨 (2, 4, 6, 8, 10)
  const gridLevels = [2, 4, 6, 8, 10];

  // 데이터 포인트 계산
  const dataPoints = INFLUENCE_CATEGORIES.map((cat) => {
    const value = data[cat.key as keyof CelebInfluenceDetail] as number;
    return getPoint(cat.angle, value);
  });

  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* 배경 그리드 */}
      {gridLevels.map((level) => {
        const points = INFLUENCE_CATEGORIES.map((cat) => getPoint(cat.angle, level));
        const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";
        return <path key={level} d={path} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}

      {/* 축 라인 */}
      {INFLUENCE_CATEGORIES.map((cat) => {
        const endPoint = getPoint(cat.angle, 10);
        return (
          <line
            key={cat.key}
            x1={center}
            y1={center}
            x2={endPoint.x}
            y2={endPoint.y}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />
        );
      })}

      {/* 데이터 영역 */}
      <path d={dataPath} fill="rgba(124, 77, 255, 0.3)" stroke="#7c4dff" strokeWidth="2" />

      {/* 데이터 포인트 */}
      {dataPoints.map((point, i) => (
        <circle key={i} cx={point.x} cy={point.y} r="4" fill={INFLUENCE_CATEGORIES[i].color} />
      ))}

      {/* 카테고리 레이블 */}
      {INFLUENCE_CATEGORIES.map((cat) => {
        const labelPoint = getPoint(cat.angle, 12.5);
        const value = data[cat.key as keyof CelebInfluenceDetail] as number;
        return (
          <g key={cat.key}>
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-text-secondary font-medium"
            >
              {cat.label}
            </text>
            <text
              x={labelPoint.x}
              y={labelPoint.y + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[11px] fill-text-primary font-bold"
            >
              {value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
// #endregion

// #region 시대초월성 게이지
function TranshistoricityGauge({ value, maxValue = 40 }: { value: number; maxValue?: number }) {
  const percentage = (value / maxValue) * 100;

  return (
    <div className="bg-bg-secondary rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={16} className="text-amber-400" />
        <span className="text-sm font-medium">시대초월성</span>
        <span className="ml-auto text-lg font-bold text-amber-400">{value}</span>
        <span className="text-xs text-text-tertiary">/ {maxValue}</span>
      </div>
      <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
// #endregion

// #region 카테고리 상세 항목
function CategoryDetail({
  category,
  value,
  explanation,
}: {
  category: (typeof INFLUENCE_CATEGORIES)[number];
  value: number;
  explanation: string | null;
}) {
  const Icon = category.icon;
  const percentage = (value / 10) * 100;

  return (
    <div className="bg-bg-secondary rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: category.color + "20" }}>
          <Icon size={14} style={{ color: category.color }} />
        </div>
        <span className="text-sm font-medium">{category.label}</span>
        <span className="ml-auto font-bold" style={{ color: category.color }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: category.color }} />
      </div>
      {explanation && <p className="text-xs text-text-secondary leading-relaxed">{explanation}</p>}
    </div>
  );
}
// #endregion

// #region 메인 모달 컴포넌트
interface CelebInfluenceModalProps {
  celebId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CelebInfluenceModal({ celebId, isOpen, onClose }: CelebInfluenceModalProps) {
  const [data, setData] = useState<CelebInfluenceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !celebId) return;

    setLoading(true);
    getCelebInfluence(celebId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [isOpen, celebId]);

  if (!isOpen) return null;

  const rankColor = data ? RANK_COLORS[data.rank] : RANK_COLORS.D;
  const professionLabel = data?.profession ? getCelebProfessionLabel(data.profession) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* 모달 */}
      <div
        className="relative w-full max-w-md max-h-[90vh] bg-bg-card rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="relative bg-gradient-to-br from-accent/20 to-transparent p-6 pb-4">
          <button onClick={onClose} className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary">
            <X size={20} />
          </button>

          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="flex items-center gap-4">
              <Avatar url={data.avatar_url} name={data.nickname} size="xl" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate font-serif">{data.nickname}</h2>
                {professionLabel && <p className="text-sm text-text-secondary">{professionLabel}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={`px-3 py-1 rounded-lg font-bold text-lg shadow-lg ${rankColor.bg} ${rankColor.text} ${rankColor.glow}`}
                  >
                    {data.rank}
                  </span>
                  <span className="text-2xl font-bold">{data.total_score}</span>
                  <span className="text-sm text-text-tertiary">/ 100</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-text-secondary py-6">데이터를 불러올 수 없습니다</p>
          )}
        </div>

        {/* 본문 */}
        {data && !loading && (
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* 레이더 차트 */}
            <div className="bg-bg-secondary rounded-xl p-4">
              <h3 className="text-sm font-medium text-text-secondary mb-2 text-center">영향력 분포</h3>
              <RadarChart data={data} />
            </div>

            {/* 시대초월성 */}
            <TranshistoricityGauge value={data.transhistoricity} />
            {data.transhistoricity_exp && (
              <p className="text-xs text-text-secondary px-1 -mt-2">{data.transhistoricity_exp}</p>
            )}

            {/* 카테고리별 상세 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-secondary">영역별 상세</h3>
              <div className="grid grid-cols-2 gap-2">
                {INFLUENCE_CATEGORIES.map((cat) => (
                  <CategoryDetail
                    key={cat.key}
                    category={cat}
                    value={data[cat.key as keyof CelebInfluenceDetail] as number}
                    explanation={data[`${cat.key}_exp` as keyof CelebInfluenceDetail] as string | null}
                  />
                ))}
              </div>
            </div>

            {/* 산출 기준 안내 */}
            <div className="bg-bg-tertiary/50 rounded-lg p-3 text-xs text-text-tertiary">
              <p className="font-medium mb-1">영향력 산출 기준</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>6대 영역 각 10점 만점 (총 60점)</li>
                <li>시대초월성 40점 만점</li>
                <li>총합 100점 기준 S/A/B/C/D 등급 부여</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// #endregion
