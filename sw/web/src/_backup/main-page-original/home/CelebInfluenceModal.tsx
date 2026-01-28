"use client";
// Neo-Pantheon Influence Modal - Redesigned for better visibility

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { getCelebInfluence, type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { Avatar } from "@/components/ui";
import { INFLUENCE_CATEGORIES } from "@/constants/influence";
import { getAuraByScore, getMaterialConfigByScore, type Aura } from "@/constants/materials";
import { Clock } from "lucide-react";

// Aura 기반 모달 스타일 (9단계)
const AURA_MODAL_STYLES: Record<Aura, { bg: string; text: string; border: string; glow: string }> = {
  1: { bg: 'bg-gradient-to-br from-[#8d6e63] via-[#5d4037] to-[#3e2723]', text: 'text-[#efebe9]', border: 'border-[#8d6e63]', glow: '' }, // Wood
  2: { bg: 'bg-gradient-to-br from-[#607d8b] via-[#455a64] to-[#263238]', text: 'text-[#eceff1]', border: 'border-[#607d8b]', glow: '' }, // Stone
  3: { bg: 'bg-gradient-to-br from-[#D4C1A5] via-[#8C7853] to-[#5D4037]', text: 'text-[#F5EFDF]', border: 'border-[#8C7853]', glow: 'shadow-[0_0_15px_rgba(140,120,83,0.4)]' }, // Bronze
  4: { bg: 'bg-gradient-to-br from-[#FFFFFF] via-[#C0C0C0] to-[#808080]', text: 'text-[#1a1a1a]', border: 'border-[#C0C0C0]', glow: 'shadow-[0_0_15px_rgba(192,192,192,0.4)]' }, // Silver
  5: { bg: 'bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#8A6E2F]', text: 'text-[#1a1200]', border: 'border-[#D4AF37]', glow: 'shadow-[0_0_20px_rgba(212,175,55,0.5)]' }, // Gold
  6: { bg: 'bg-gradient-to-br from-[#98FB98] via-[#50C878] to-[#2E8B57]', text: 'text-[#004d00]', border: 'border-[#50C878]', glow: 'shadow-[0_0_20px_rgba(80,200,120,0.5)]' }, // Emerald
  7: { bg: 'bg-gradient-to-br from-[#FF6B6B] via-[#DC143C] to-[#8B0000]', text: 'text-[#ffd0d0]', border: 'border-[#DC143C]', glow: 'shadow-[0_0_20px_rgba(220,20,60,0.5)]' }, // Crimson
  8: { bg: 'bg-gradient-to-br from-[#E0FFFF] via-[#B0E0E6] to-[#87CEEB]', text: 'text-[#001a3a]', border: 'border-[#87CEEB]', glow: 'shadow-[0_0_20px_rgba(135,206,235,0.5)]' }, // Diamond
  9: { bg: 'bg-gradient-to-br from-[#FF00FF] via-[#00FFFF] to-[#FFFF00]', text: 'text-[#1a001a]', border: 'border-[#FFFFFF]', glow: 'shadow-[0_0_25px_rgba(255,255,255,0.7)]' }, // Holographic
};

const GOLD_ACCENT = "#d4af37";

// #region 레이더 차트 컴포넌트
function RadarChart({ data, size = 200 }: { data: CelebInfluenceDetail; size?: number }) {
  const center = size / 2;
  const maxRadius = size * 0.32;
  const labelRadius = size * 0.45;

  const getPoint = (angle: number, value: number) => {
    const radian = ((angle - 90) * Math.PI) / 180;
    const radius = Math.max((value / 10) * maxRadius, maxRadius * 0.1);
    return {
      x: center + radius * Math.cos(radian),
      y: center + radius * Math.sin(radian),
    };
  };

  const getLabelPoint = (angle: number) => {
    const radian = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + labelRadius * Math.cos(radian),
      y: center + labelRadius * Math.sin(radian),
    };
  };

  const gridLevels = [2.5, 5, 7.5, 10];
  const dataPoints = INFLUENCE_CATEGORIES.map((cat) => {
    const value = data[cat.key as keyof CelebInfluenceDetail] as number;
    return getPoint(cat.angle, value);
  });

  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";

  return (
    <div className="relative flex justify-center items-center">
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(212,175,55,0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 배경 원 */}
        <circle cx={center} cy={center} r={maxRadius} fill="url(#radarGradient)" />

        {/* 배경 그리드 */}
        {gridLevels.map((level) => {
          const points = INFLUENCE_CATEGORIES.map((cat) => getPoint(cat.angle, level));
          const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";
          return (
            <path
              key={level}
              d={path}
              fill="none"
              stroke={level === 5 ? "rgba(212,175,55,0.25)" : "rgba(138,115,42,0.15)"}
              strokeWidth={level === 5 ? "1.5" : "1"}
            />
          );
        })}

        {/* 축 라인 - 골드 단색 */}
        {INFLUENCE_CATEGORIES.map((cat) => {
          const endPoint = getPoint(cat.angle, 10);
          return (
            <line
              key={cat.key}
              x1={center}
              y1={center}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke={GOLD_ACCENT}
              strokeWidth="1"
              opacity="0.2"
            />
          );
        })}

        {/* 데이터 영역 - 골드 그라데이션 */}
        <path
          d={dataPath}
          fill="rgba(212,175,55,0.2)"
          stroke={GOLD_ACCENT}
          strokeWidth="2"
          filter="url(#glow)"
        />

        {/* 데이터 포인트 - 골드 단색 */}
        {INFLUENCE_CATEGORIES.map((cat) => {
          const value = data[cat.key as keyof CelebInfluenceDetail] as number;
          const point = getPoint(cat.angle, value);
          return (
            <g key={cat.key}>
              <circle cx={point.x} cy={point.y} r="5" fill={GOLD_ACCENT} opacity="0.3" />
              <circle cx={point.x} cy={point.y} r="3" fill={GOLD_ACCENT} />
            </g>
          );
        })}

        {/* 카테고리 레이블 */}
        {INFLUENCE_CATEGORIES.map((cat) => {
          const labelPoint = getLabelPoint(cat.angle);
          const value = data[cat.key as keyof CelebInfluenceDetail] as number;
          const Icon = cat.icon;
          return (
            <g key={cat.key}>
              <foreignObject
                x={labelPoint.x - 24}
                y={labelPoint.y - 20}
                width="48"
                height="40"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <Icon size={14} className="text-accent" />
                  <span className="text-[10px] text-text-secondary font-medium">{cat.label}</span>
                  <span className="text-xs font-bold text-accent">{value}</span>
                </div>
              </foreignObject>
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
  const segments = 8;

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-accent/5 to-transparent border border-accent/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <Clock size={16} className="text-accent" />
          </div>
          <span className="text-sm font-bold text-text-primary">시대초월성</span>
        </div>
        <div className="text-end">
          <span className="text-xl font-black text-accent">{value}</span>
          <span className="text-text-tertiary text-sm ml-0.5">/ {maxValue}</span>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => {
          const segmentThreshold = ((i + 1) / segments) * 100;
          const isFilled = percentage >= segmentThreshold;
          const isPartial = percentage > (i / segments) * 100 && percentage < segmentThreshold;
          return (
            <div
              key={i}
              className={`h-2 flex-1 rounded-sm ${
                isFilled
                  ? "bg-accent shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                  : isPartial
                  ? "bg-accent/50"
                  : "bg-white/10"
              }`}
            />
          );
        })}
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
  const hasExplanation = !!explanation;

  return (
    <button
      type="button"
      onClick={hasExplanation ? onToggle : undefined}
      className={`
        p-3 md:p-4 rounded-xl text-left w-full
        bg-white/[0.02] border border-accent-dim/20
        ${hasExplanation ? "cursor-pointer hover:bg-white/[0.04] hover:border-accent-dim/40 active:scale-[0.98]" : "cursor-default"}
        ${isExpanded ? "bg-white/[0.04] border-accent/30" : ""}
      `}
    >
      {/* 헤더: 아이콘 + 라벨 + 게이지 + 점수 (인라인) */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-accent/10">
          <Icon size={16} className="text-accent" />
        </div>
        <span className="text-sm font-bold text-text-primary shrink-0">{category.label}</span>
        {/* 게이지 (라벨과 점수 사이) */}
        <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden mx-1">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-base font-black text-accent shrink-0">{value}</span>
      </div>

      {/* 설명 */}
      {hasExplanation && (
        <div className="flex items-start gap-2">
          <p className={`flex-1 text-xs text-text-secondary leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
            {explanation}
          </p>
          <div className="shrink-0 mt-0.5">
            {isExpanded ? (
              <ChevronUp size={14} className="text-accent-dim" />
            ) : (
              <ChevronDown size={14} className="text-accent-dim" />
            )}
          </div>
        </div>
      )}
    </button>
  );
}
// #endregion

// #region 주요 영향력 태그 (모바일용)
function TopInfluenceTags({ data }: { data: CelebInfluenceDetail }) {
  const sortedCategories = INFLUENCE_CATEGORIES
    .map(cat => ({ ...cat, value: data[cat.key as keyof CelebInfluenceDetail] as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <div className="flex flex-wrap gap-2">
      {sortedCategories.map((cat, index) => {
        const Icon = cat.icon;
        const isTop = index === 0;
        return (
          <div
            key={cat.key}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              ${isTop ? "bg-accent/15 border border-accent/40" : "bg-white/5 border border-accent-dim/20"}
            `}
          >
            <Icon size={14} className={isTop ? "text-accent" : "text-text-secondary"} />
            <span className={`text-xs font-bold ${isTop ? "text-accent" : "text-text-secondary"}`}>
              {cat.label}
            </span>
            <span className={`text-xs font-black ${isTop ? "text-text-primary" : "text-text-secondary"}`}>
              {cat.value}
            </span>
            {isTop && <span className="text-[10px] text-accent font-bold ml-0.5">★</span>}
          </div>
        );
      })}
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !celebId) return;

    setLoading(true);
    setExpandedCategory(null);
    getCelebInfluence(celebId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [isOpen, celebId]);

  if (!isOpen || typeof document === "undefined") return null;

  const aura = data ? getAuraByScore(data.total_score) : 1;
  const levelStyle = AURA_MODAL_STYLES[aura];
  const mat = getMaterialConfigByScore(data?.total_score ?? 0);
  const professionLabel = data?.profession ? getCelebProfessionLabel(data.profession) : null;

  const toggleCategory = (key: string) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  // #region 공유 컴포넌트
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
      <span className="text-sm text-text-secondary">영향력 분석 중...</span>
    </div>
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <span className="text-text-tertiary">정보를 불러올 수 없습니다</span>
      <button onClick={onClose} className="text-sm text-accent hover:underline">닫기</button>
    </div>
  );

  // 주요 영향력 TOP 3 (헤더용)
  const topCategories = data ? INFLUENCE_CATEGORIES
    .map(cat => ({ ...cat, value: data[cat.key as keyof CelebInfluenceDetail] as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3) : [];

  const Header = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`relative ${isMobile ? "p-4" : "p-4 pr-12"}`}>
      {/* PC: 수평 나열 */}
      {!isMobile && (
        <div className="flex items-center gap-4">
          {/* 아바타 + 등급 */}
          <div className="relative shrink-0">
            <div className={`absolute -inset-1 ${levelStyle.bg} ${levelStyle.glow} rounded-lg opacity-50`} />
            <Avatar url={data!.avatar_url} name={data!.nickname} size="lg" className="relative ring-0 rounded-lg" />
            {/* 등급 뱃지 (아바타 우하단) */}
            <div className={`
              absolute -bottom-1 -right-1 w-6 h-6
              flex items-center justify-center rounded border
              ${levelStyle.bg} ${levelStyle.border}
              shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]
            `}>
              <span className={`text-xs font-black ${levelStyle.text}`}>{mat.romanNumeral}</span>
            </div>
          </div>

          {/* 이름 + 직군 */}
          <div className="shrink-0">
            <h2 className="text-lg font-bold text-text-primary">{data!.nickname}</h2>
            {professionLabel && <p className="text-[11px] text-accent font-medium">{professionLabel}</p>}
          </div>

          {/* 구분선 */}
          <div className="w-px h-8 bg-accent-dim/30" />

          {/* 총점 */}
          <div className="shrink-0 text-center">
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black text-accent">{data!.total_score}</span>
              <span className="text-xs text-text-tertiary">/100</span>
            </div>
            <p className="text-[9px] text-text-tertiary uppercase tracking-wider">Score</p>
          </div>

          {/* 구분선 */}
          <div className="w-px h-8 bg-accent-dim/30" />

          {/* TOP 3 영향력 (수평) */}
          <div className="flex-1 flex items-center gap-2">
            {topCategories.map((cat, index) => {
              const Icon = cat.icon;
              const isTop = index === 0;
              return (
                <div
                  key={cat.key}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-md
                    ${isTop ? "bg-accent/10" : "bg-white/[0.03]"}
                  `}
                >
                  <Icon size={12} className={isTop ? "text-accent" : "text-text-tertiary"} />
                  <span className="text-[11px] text-text-secondary">{cat.label}</span>
                  <span className={`text-sm font-black ${isTop ? "text-accent" : "text-text-primary"}`}>
                    {cat.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 모바일: 기존 세로 레이아웃 유지 */}
      {isMobile && (
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className={`absolute -inset-1 ${levelStyle.bg} ${levelStyle.glow} rounded-lg opacity-50`} />
            <Avatar url={data!.avatar_url} name={data!.nickname} size="lg" className="relative ring-0 rounded-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-text-primary truncate">{data!.nickname}</h2>
            {professionLabel && <p className="text-[11px] text-accent font-medium">{professionLabel}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`
                w-7 h-7 flex items-center justify-center rounded border
                ${levelStyle.bg} ${levelStyle.border}
              `}>
                <span className={`text-sm font-black ${levelStyle.text}`}>{mat.romanNumeral}</span>
              </div>
              <span className="text-xl font-black text-accent">{data!.total_score}</span>
              <span className="text-xs text-text-tertiary">/100</span>
            </div>
          </div>
        </div>
      )}

      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-2 rounded-full bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10"
      >
        <X size={18} />
      </button>
    </div>
  );
  // #endregion

  const modalContent = (
    <div className="fixed inset-0 z-[700] flex items-end md:items-center justify-center" onClick={onClose}>
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" />

      {/* PC 레이아웃 */}
      <div
        className="hidden md:flex relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex-col rounded-2xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 배경 */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg-card via-bg-main to-bg-secondary" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 border border-accent/20 rounded-2xl" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        {loading ? <LoadingSpinner /> : !data ? <ErrorState /> : (
          <>
            <Header />

            {/* 본문 */}
            <div className="relative flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-5 pt-0 space-y-5">
                {/* 상단 섹션: 레이더 차트 + 시대초월성 */}
                <div className="flex gap-6">
                  {/* 레이더 차트 */}
                  <div className="shrink-0 p-4 rounded-xl bg-black/20 border border-white/5">
                    <RadarChart data={data} size={240} />
                  </div>

                  {/* 우측: 시대초월성 + 주요 영향력 */}
                  <div className="flex-1 flex flex-col gap-4">
                    <TranshistoricityGauge value={data.transhistoricity} />
                    {data.transhistoricity_exp && (
                      <p className="text-xs text-text-secondary leading-relaxed px-1">
                        {data.transhistoricity_exp}
                      </p>
                    )}
                    <div className="pt-3 border-t border-white/5">
                      <p className="text-xs text-text-tertiary mb-2 font-medium">주요 영향력</p>
                      <TopInfluenceTags data={data} />
                    </div>
                  </div>
                </div>

                {/* 영역별 상세 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-text-primary px-1">영역별 상세</h3>
                  <div className="grid grid-cols-2 gap-3">
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
            </div>
          </>
        )}
      </div>

      {/* 모바일 레이아웃 (Bottom Sheet) */}
      <div
        className="md:hidden relative w-full max-h-[92vh] overflow-hidden flex flex-col bg-bg-main rounded-t-3xl animate-bottomsheet-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" onClick={onClose} />
        </div>

        {/* 배경 장식 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.06)_0%,transparent_50%)] pointer-events-none" />

        {loading ? <LoadingSpinner /> : !data ? <ErrorState /> : (
          <>
            <Header isMobile />

            {/* 본문 */}
            <div className="relative flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 pt-0 pb-8 space-y-5">
                {/* 레이더 차트 (중앙 배치) */}
                <div className="flex justify-center py-2">
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <RadarChart data={data} size={220} />
                  </div>
                </div>

                {/* 주요 영향력 태그 */}
                <div className="flex justify-center">
                  <TopInfluenceTags data={data} />
                </div>

                {/* 시대초월성 */}
                <TranshistoricityGauge value={data.transhistoricity} />
                {data.transhistoricity_exp && (
                  <p className="text-xs text-text-secondary leading-relaxed text-center px-2">
                    {data.transhistoricity_exp}
                  </p>
                )}

                {/* 영역별 상세 */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-text-primary px-1">영역별 상세</h3>
                  <div className="grid grid-cols-1 gap-2.5">
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
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
// #endregion
