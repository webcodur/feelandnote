"use client";

import { useId } from "react";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { INFLUENCE_CATEGORIES } from "@/constants/influence";

const GOLD = "#d4af37";

// #region 레이더 차트
export function RadarChart({ data, size = 200 }: { data: CelebInfluenceDetail; size?: number }) {
  const uid = useId();
  const gradId = `radar-grad-${uid}`;
  const glowId = `radar-glow-${uid}`;

  // 라벨이 SVG 경계 밖으로 잘리지 않도록 패딩 확보
  const labelPad = 30;
  const svgSize = size + labelPad * 2;
  const center = svgSize / 2;
  const maxR = size * 0.32;
  const labelR = size * 0.45;

  const pt = (angle: number, value: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const r = Math.max((value / 10) * maxR, maxR * 0.1);
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  const labelPt = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: center + labelR * Math.cos(rad), y: center + labelR * Math.sin(rad) };
  };

  const dataPoints = INFLUENCE_CATEGORIES.map((c) => pt(c.angle, data[c.key as keyof CelebInfluenceDetail] as number));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";

  return (
    <svg width={svgSize} height={svgSize}>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(212,175,55,0.12)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={center} cy={center} r={maxR} fill={`url(#${gradId})`} />
      {[2.5, 5, 7.5, 10].map((lv) => {
        const pts = INFLUENCE_CATEGORIES.map((c) => pt(c.angle, lv));
        const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";
        return <path key={lv} d={d} fill="none" stroke={lv === 5 ? "rgba(212,175,55,0.25)" : "rgba(138,115,42,0.15)"} strokeWidth={lv === 5 ? "1.5" : "1"} />;
      })}
      {INFLUENCE_CATEGORIES.map((c) => {
        const end = pt(c.angle, 10);
        return <line key={c.key} x1={center} y1={center} x2={end.x} y2={end.y} stroke={GOLD} strokeWidth="1" opacity="0.2" />;
      })}
      <path d={dataPath} fill="rgba(212,175,55,0.2)" stroke={GOLD} strokeWidth="2" filter={`url(#${glowId})`} />
      {INFLUENCE_CATEGORIES.map((c) => {
        const v = data[c.key as keyof CelebInfluenceDetail] as number;
        const p = pt(c.angle, v);
        return <g key={c.key}><circle cx={p.x} cy={p.y} r="5" fill={GOLD} opacity="0.3" /><circle cx={p.x} cy={p.y} r="3" fill={GOLD} /></g>;
      })}
      {INFLUENCE_CATEGORIES.map((c) => {
        const lp = labelPt(c.angle);
        const v = data[c.key as keyof CelebInfluenceDetail] as number;
        const Icon = c.icon;
        return (
          <foreignObject key={c.key} x={lp.x - 26} y={lp.y - 24} width="52" height="48">
            <div className="flex flex-col items-center gap-0.5">
              <Icon size={14} className="text-accent" />
              <span className="text-[10px] text-text-secondary font-medium">{c.label}</span>
              <span className="text-xs font-bold text-accent">{v}</span>
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}
// #endregion

// #region 시대초월성 게이지
export function TranshistoricityGauge({ value, maxValue = 40 }: { value: number; maxValue?: number }) {
  const pct = (value / maxValue) * 100;
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
        {Array.from({ length: 8 }).map((_, i) => {
          const threshold = ((i + 1) / 8) * 100;
          const filled = pct >= threshold;
          const partial = pct > (i / 8) * 100 && pct < threshold;
          return <div key={i} className={`h-2 flex-1 rounded-sm ${filled ? "bg-accent shadow-[0_0_8px_rgba(212,175,55,0.4)]" : partial ? "bg-accent/50" : "bg-white/10"}`} />;
        })}
      </div>
    </div>
  );
}
// #endregion

// #region 카테고리 상세
export function CategoryDetail({ category, value, explanation, isExpanded, onToggle }: {
  category: (typeof INFLUENCE_CATEGORIES)[number];
  value: number;
  explanation: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = category.icon;
  const hasExp = !!explanation;

  return (
    <button type="button" onClick={hasExp ? onToggle : undefined} className={`p-3 md:p-4 rounded-xl text-left w-full bg-white/[0.02] border border-accent-dim/20 ${hasExp ? "cursor-pointer hover:bg-white/[0.04] hover:border-accent-dim/40 active:scale-[0.98]" : "cursor-default"} ${isExpanded ? "bg-white/[0.04] border-accent/30" : ""}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-accent/10">
          <Icon size={16} className="text-accent" />
        </div>
        <span className="text-sm font-bold text-text-primary shrink-0">{category.label}</span>
        <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden mx-1">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(value / 10) * 100}%` }} />
        </div>
        <span className="text-base font-black text-accent shrink-0">{value}</span>
      </div>
      {hasExp && (
        <div className="flex items-start gap-2">
          <p className={`flex-1 text-xs text-text-secondary leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>{explanation}</p>
          <div className="shrink-0 mt-0.5">{isExpanded ? <ChevronUp size={14} className="text-accent-dim" /> : <ChevronDown size={14} className="text-accent-dim" />}</div>
        </div>
      )}
    </button>
  );
}
// #endregion

// #region 주요 영향력 태그
export function TopInfluenceTags({ data }: { data: CelebInfluenceDetail }) {
  const sorted = INFLUENCE_CATEGORIES
    .map(cat => ({ ...cat, value: data[cat.key as keyof CelebInfluenceDetail] as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((cat, index) => {
        const Icon = cat.icon;
        const isTop = index === 0;
        return (
          <div key={cat.key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isTop ? "bg-accent/15 border border-accent/40" : "bg-white/5 border border-accent-dim/20"}`}>
            <Icon size={14} className={isTop ? "text-accent" : "text-text-secondary"} />
            <span className={`text-xs font-bold ${isTop ? "text-accent" : "text-text-secondary"}`}>{cat.label}</span>
            <span className={`text-xs font-black ${isTop ? "text-text-primary" : "text-text-secondary"}`}>{cat.value}</span>
            {isTop && <span className="text-[10px] text-accent font-bold ml-0.5">★</span>}
          </div>
        );
      })}
    </div>
  );
}
// #endregion
