"use client";
// Neo-Pantheon Plaque of Wisdom Design Updated

import { useEffect, useState } from "react";
import { X, Crown, Lightbulb, Cpu, Users, Coins, Palette, Clock } from "lucide-react";
import { getCelebInfluence, type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { Avatar } from "@/components/ui";

// #region 상수 정의
// 고대 메달 스타일 - 카드와 동일한 금속 질감
const RANK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: "bg-gradient-to-b from-[#d4af37] via-[#f1d279] to-[#b8960c]", text: "text-[#1a1200]", border: "border-[#f1d279]" },
  A: { bg: "bg-gradient-to-b from-[#c0c0c0] via-[#e8e8e8] to-[#a0a0a0]", text: "text-[#1a1a1a]", border: "border-[#d0d0d0]" },
  B: { bg: "bg-gradient-to-b from-[#cd7f32] via-[#e6a55a] to-[#8b5a2b]", text: "text-[#1a1000]", border: "border-[#d4935a]" },
  C: { bg: "bg-gradient-to-b from-[#2a2a2f] via-[#3a3a42] to-[#1a1a1f]", text: "text-text-secondary", border: "border-accent-dim/30" },
  D: { bg: "bg-gradient-to-b from-[#1f1f24] via-[#28282f] to-[#151518]", text: "text-text-tertiary", border: "border-white/10" },
};

const INFLUENCE_CATEGORIES = [
  { key: "political", label: "정치", icon: Crown, color: "#d4af37", angle: 0 },
  { key: "strategic", label: "전략", icon: Lightbulb, color: "#00b8a9", angle: 60 },
  { key: "tech", label: "기술", icon: Cpu, color: "#4a9eff", angle: 120 },
  { key: "social", label: "사회", icon: Users, color: "#4ade80", angle: 180 },
  { key: "economic", label: "경제", icon: Coins, color: "#f59e0b", angle: 240 },
  { key: "cultural", label: "문화", icon: Palette, color: "#a855f7", angle: 300 },
] as const;
// #endregion

// #region 레이더 차트 컴포넌트
function RadarChart({ data }: { data: CelebInfluenceDetail }) {
  const size = 160;
  const center = size / 2;
  const maxRadius = 50;

  const getPoint = (angle: number, value: number) => {
    const radian = ((angle - 90) * Math.PI) / 180;
    const radius = Math.max((value / 10) * maxRadius, 5);
    return {
      x: center + radius * Math.cos(radian),
      y: center + radius * Math.sin(radian),
    };
  };

  const gridLevels = [5, 10];
  const dataPoints = INFLUENCE_CATEGORIES.map((cat) => {
    const value = data[cat.key as keyof CelebInfluenceDetail] as number;
    return getPoint(cat.angle, value);
  });

  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";

  return (
    <div className="relative flex justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* 배경 그리드 */}
        {gridLevels.map((level) => {
          const points = INFLUENCE_CATEGORIES.map((cat) => getPoint(cat.angle, level));
          const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";
          return <path key={level} d={path} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
        })}

        {/* 축 라인 - 각 카테고리 색상 */}
        {INFLUENCE_CATEGORIES.map((cat) => {
          const endPoint = getPoint(cat.angle, 10);
          return <line key={cat.key} x1={center} y1={center} x2={endPoint.x} y2={endPoint.y} stroke={cat.color} strokeWidth="1" opacity="0.3" />;
        })}

        {/* 데이터 영역 */}
        <path d={dataPath} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

        {/* 데이터 포인트 - 각 카테고리 색상 */}
        {INFLUENCE_CATEGORIES.map((cat) => {
          const value = data[cat.key as keyof CelebInfluenceDetail] as number;
          const point = getPoint(cat.angle, value);
          return <circle key={cat.key} cx={point.x} cy={point.y} r="4" fill={cat.color} />;
        })}

        {/* 카테고리 레이블 */}
        {INFLUENCE_CATEGORIES.map((cat) => {
          const labelPoint = getPoint(cat.angle, 14);
          const value = data[cat.key as keyof CelebInfluenceDetail] as number;
          return (
            <g key={cat.key}>
              <text x={labelPoint.x} y={labelPoint.y - 5} textAnchor="middle" className="text-[9px] fill-text-secondary font-medium">
                {cat.label}
              </text>
              <text x={labelPoint.x} y={labelPoint.y + 8} textAnchor="middle" style={{ fill: cat.color }} className="text-xs font-bold">
                {value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
// #endregion

// #region 시대초월성 게이지
function TranshistoricityGauge({ value, maxValue = 40 }: { value: number; maxValue?: number }) {
  const percentage = (value / maxValue) * 100;

  return (
    <div className="flex items-center gap-3">
      <Clock size={16} className="text-accent shrink-0" />
      <div className="flex-1">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-sm font-semibold text-text-primary">시대초월성</span>
          <span className="text-sm font-bold text-accent">{value}<span className="text-text-tertiary text-xs">/{maxValue}</span></span>
        </div>
        <div className="h-1.5 bg-white/5 overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${percentage}%` }} />
        </div>
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
  isExpanded,
  onToggle,
}: {
  category: (typeof INFLUENCE_CATEGORIES)[number];
  value: number;
  explanation: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = category.icon;
  const percentage = (value / 10) * 100;

  return (
    <button
      type="button"
      onClick={explanation ? onToggle : undefined}
      className={`p-2 bg-white/[0.02] border border-white/5 text-left w-full ${explanation ? "cursor-pointer hover:border-white/20" : "cursor-default"}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: category.color }} />
        <span className="text-sm font-medium text-text-primary">{category.label}</span>
        <span className="ml-auto font-bold" style={{ color: category.color }}>{value}</span>
      </div>
      <div className="h-1 bg-white/10 overflow-hidden">
        <div className="h-full" style={{ width: `${percentage}%`, backgroundColor: category.color }} />
      </div>
      {explanation && (
        <p className={`text-xs text-text-secondary leading-relaxed mt-1.5 ${isExpanded ? "" : "line-clamp-1"}`}>
          {explanation}
        </p>
      )}
    </button>
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !celebId) return;

    setLoading(true);
    setExpandedCategory(null);
    getCelebInfluence(celebId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [isOpen, celebId]);

  if (!isOpen) return null;

  const rankStyle = data ? RANK_STYLES[data.rank] : RANK_STYLES.D;
  const professionLabel = data?.profession ? getCelebProfessionLabel(data.profession) : null;

  const toggleCategory = (key: string) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-4" onClick={onClose}>
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* 모달 - 대리석 석판 스타일 */}
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 대리석 배경 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1f] via-[#12121a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.06)_0%,transparent_50%)]" />
        <div className="absolute inset-0 border border-accent/20" />
        {/* 상단/하단 장식 라인 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

        {/* 헤더 */}
        <div className="relative p-4 border-b border-accent/10">
          <button onClick={onClose} className="absolute top-3 right-3 p-1 text-text-tertiary hover:text-accent z-20">
            <X size={18} />
          </button>

          {loading ? (
            <div className="flex items-center justify-center h-16">
              <div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="flex items-center gap-4 pr-6">
              {/* 아바타 */}
              <div className="relative shrink-0">
                <div className="absolute -inset-1 border border-accent/20" />
                <Avatar url={data.avatar_url} name={data.nickname} size="lg" className="ring-0 rounded-none" />
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-text-primary truncate">{data.nickname}</h2>
                {professionLabel && <p className="text-xs text-accent">{professionLabel}</p>}

                <div className="flex items-center gap-3 mt-2">
                  {/* 등급 뱃지 */}
                  <div className={`w-8 h-8 flex items-center justify-center rounded-sm border ${rankStyle.bg} ${rankStyle.border} shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]`}>
                    <span className={`text-base font-bold ${rankStyle.text}`}>{data.rank}</span>
                  </div>
                  {/* 점수 */}
                  <div>
                    <span className="text-xl font-bold text-text-primary">{data.total_score}</span>
                    <span className="text-xs text-text-tertiary">/100</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-text-tertiary py-4">정보를 불러올 수 없습니다</p>
          )}
        </div>

        {/* 본문 */}
        {data && !loading && (
          <div className="relative p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            {/* 상단: 레이더 차트 + 우측 요약 */}
            <div className="flex gap-4">
              <div className="shrink-0">
                <RadarChart data={data} />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-3">
                {/* 시대초월성 */}
                <TranshistoricityGauge value={data.transhistoricity} />
                {data.transhistoricity_exp && (
                  <p className="text-[11px] text-text-secondary leading-relaxed">{data.transhistoricity_exp}</p>
                )}
                {/* 상위 영역 표시 */}
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-text-tertiary mb-1.5">주요 영향력</p>
                  <div className="flex flex-wrap gap-1.5">
                    {INFLUENCE_CATEGORIES
                      .map(cat => ({ ...cat, value: data[cat.key as keyof CelebInfluenceDetail] as number }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 3)
                      .map(cat => (
                        <span key={cat.key} className="text-xs font-medium px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                          {cat.label} {cat.value}
                        </span>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* 영역별 상세 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-secondary">영역별 상세</h3>
                <span className="text-[10px] text-text-tertiary">탭하여 상세 보기</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {INFLUENCE_CATEGORIES.map((cat) => (
                  <CategoryDetail
                    key={cat.key}
                    category={cat}
                    value={data[cat.key as keyof CelebInfluenceDetail] as number}
                    explanation={data[`${cat.key}_exp` as keyof CelebInfluenceDetail] as string | null}
                    isExpanded={expandedCategory === cat.key}
                    onToggle={() => toggleCategory(cat.key)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// #endregion
