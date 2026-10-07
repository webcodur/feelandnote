"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, Hourglass } from "lucide-react";
import { calculateInfluenceRank, RANK_STYLES } from "@feelandnote/influence-constants";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { INFLUENCE_CATEGORIES } from "@/constants/influence";
import { ScoreBar } from "@/components/ui";
import InfluenceScoreInfoModal from "./InfluenceScoreInfoModal";

export { default as TranshistoricityInfoModal } from "./TranshistoricityInfoModal";
export { default as InfluenceScoreInfoModal } from "./InfluenceScoreInfoModal";
export { RANK_BADGE_TONES } from "./rankTones";

const GOLD = "#d4af37";

// #region 공용 계산 (여섯 영역 합·강세 영역)
export function sumBaseScore(data: CelebInfluenceDetail): number {
  return INFLUENCE_CATEGORIES.reduce(
    (sum, category) =>
      sum + ((data[category.key as keyof CelebInfluenceDetail] as number) || 0),
    0,
  );
}

/** 여섯 영역을 점수 내림차순으로 (동점은 기존 순서 유지) */
export function sortCategoriesByScore(data: CelebInfluenceDetail) {
  return INFLUENCE_CATEGORIES.map((category) => ({
    ...category,
    value: (data[category.key as keyof CelebInfluenceDetail] as number) || 0,
  })).sort((a, b) => b.value - a.value);
}
// #endregion

// #region 레이더 차트 (우측 리스트 양방향 연동 인터랙션)
export function RadarChart({
  data,
  size = 270,
  activeCategory,
  onSelectCategory,
  hoveredCategory: externalHovered,
  onHoverCategory,
  accentColor = GOLD,
}: {
  data: CelebInfluenceDetail;
  size?: number;
  activeCategory?: string | null;
  onSelectCategory?: (key: string | null) => void;
  hoveredCategory?: string | null;
  onHoverCategory?: (key: string | null) => void;
  accentColor?: string;
}) {
  const t = useTranslations("profilePage.influence");
  const uid = useId();
  const [internalHovered, setInternalHovered] = useState<string | null>(null);

  const gradId = `radar-grad-${uid}`;
  const glowId = `radar-glow-${uid}`;

  // 외부 또는 내부에서 호버되거나 선택된 카테고리
  const currentKey = externalHovered || internalHovered || activeCategory;

  const handleHover = (key: string | null) => {
    setInternalHovered(key);
    onHoverCategory?.(key);
  };

  // 칩 외곽 경계선에 딱 밀착된 여백 제로 타이트 패딩
  const padX = 40;
  const padY = 22;
  const svgWidth = size + padX * 2;
  const svgHeight = size + padY * 2;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // 차트 그래픽 반경 (박스에 가득 찬 대형 반경)
  const maxR = size * 0.40;

  const pt = (angle: number, value: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const r = Math.max((value / 10) * maxR, maxR * 0.08);
    return { x: centerX + r * Math.cos(rad), y: centerY + r * Math.sin(rad) };
  };

  const labelPt = (c: (typeof INFLUENCE_CATEGORIES)[number]) => {
    const angle = c.angle;
    const rad = ((angle - 90) * Math.PI) / 180;

    // 정치(12시)와 사회(6시): 상하 박스 경계선 바로 근처까지 확장 밀착
    if (c.key === "political" || c.key === "social") {
      const ry = size * 0.50;
      return { x: centerX, y: centerY + ry * Math.sin(rad) };
    }

    // 대각선 4개 (전략 2시, 기술 4시, 경제 8시, 문화 10시)
    const rx = size * 0.45;
    const ry = size * 0.51;
    return { x: centerX + rx * Math.cos(rad), y: centerY + ry * Math.sin(rad) };
  };

  const dataPoints = INFLUENCE_CATEGORIES.map((c) => pt(c.angle, data[c.key as keyof CelebInfluenceDetail] as number));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[348px] h-auto overflow-visible select-none">
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.24} />
            <stop offset="70%" stopColor={accentColor} stopOpacity={0.05} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 배경 은은한 골드 호광 */}
        <circle cx={centerX} cy={centerY} r={maxR * 1.15} fill={`url(#${gradId})`} />

        {/* 동심 다각형 레벨 격자 (2.5, 5, 7.5, 10) */}
        {[2.5, 5, 7.5, 10].map((lv) => {
          const pts = INFLUENCE_CATEGORIES.map((c) => pt(c.angle, lv));
          const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";
          const isOuter = lv === 10;
          return (
            <path
              key={lv}
              d={d}
              fill="none"
              stroke={accentColor}
              strokeOpacity={isOuter ? 0.38 : 0.14}
              strokeWidth={isOuter ? "1.5" : "1"}
              strokeDasharray={isOuter ? undefined : "3 3"}
            />
          );
        })}

        {/* 축 방사선 (호버 시 방사축 즉각 반짝임) */}
        {INFLUENCE_CATEGORIES.map((c) => {
          const end = pt(c.angle, 10);
          const isActive = currentKey === c.key;
          return (
            <line
              key={c.key}
              x1={centerX}
              y1={centerY}
              x2={end.x}
              y2={end.y}
              stroke={accentColor}
              strokeWidth={isActive ? "2.5" : "1"}
              opacity={isActive ? "0.9" : "0.25"}
            />
          );
        })}

        {/* 영역 그래프 채우기 */}
        <path
          d={dataPath}
          fill={accentColor}
          fillOpacity={0.16}
          stroke={accentColor}
          strokeWidth="2.5"
          filter={`url(#${glowId})`}
        />

        {/* 정점 데이터 포인트 (호버 시 펄스 링 대형 발광) */}
        {INFLUENCE_CATEGORIES.map((c) => {
          const v = data[c.key as keyof CelebInfluenceDetail] as number;
          const p = pt(c.angle, v);
          const isActive = currentKey === c.key;
          return (
            <g
              key={c.key}
              className="cursor-pointer"
              onMouseEnter={() => handleHover(c.key)}
              onMouseLeave={() => handleHover(null)}
              onClick={() => onSelectCategory?.(c.key)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? "11" : "7"}
                fill="none"
                stroke={accentColor}
                strokeWidth={isActive ? "2" : "1"}
                opacity={isActive ? "1" : "0.6"}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? "5.5" : "4"}
                fill={accentColor}
                stroke="#1c1917"
                strokeWidth="1.5"
              />
            </g>
          );
        })}

        {/* 레이더 6개 정점 축 원형 아이콘 전용 뱃지 */}
        {INFLUENCE_CATEGORIES.map((c) => {
          const lp = labelPt(c);
          const Icon = c.icon;
          const badgeSize = 36;
          const isActive = currentKey === c.key;

          return (
            <foreignObject
              key={c.key}
              x={lp.x - badgeSize / 2}
              y={lp.y - badgeSize / 2}
              width={badgeSize}
              height={badgeSize}
              className="overflow-visible"
            >
              <button
                type="button"
                onMouseEnter={() => handleHover(c.key)}
                onMouseLeave={() => handleHover(null)}
                onClick={() => onSelectCategory?.(c.key)}
                title={t("categoryScore", {
                  category: t(`categories.${c.key}`),
                  score: data[c.key as keyof CelebInfluenceDetail] as number,
                })}
                aria-pressed={activeCategory === c.key}
                style={{ color: accentColor, borderColor: isActive ? accentColor : `color-mix(in srgb, ${accentColor} 35%, transparent)`, outlineColor: accentColor }}
                className={`w-full h-full rounded-full border flex items-center justify-center select-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  isActive
                    ? "bg-bg-stone-light ring-1 ring-current"
                    : "bg-bg-secondary hover:bg-bg-raised active:bg-bg-stone-light"
                }`}
              >
                <Icon size={17} />
              </button>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}
// #endregion

// #region RANK and influence summary
export function TotalScoreCard({ data, onOpenExplanation }: { data: CelebInfluenceDetail; onOpenExplanation: () => void }) {
  const t = useTranslations("profilePage.influence");
  const baseScore = sumBaseScore(data);

  const transScore = data.transhistoricity || 0;
  const totalScore = data.total_score || baseScore + transScore;

  const [isScoreInfoOpen, setIsScoreInfoOpen] = useState(false);

  // 점수 하나만으로는 높낮이를 알 수 없어, 등급·순위·강세 영역을 함께 읽힌다
  const rank = calculateInfluenceRank(totalScore);
  const rankStyle = RANK_STYLES[rank];
  const ranked = sortCategoriesByScore(data);
  const [first, second] = ranked;
  const hasArchetype = (first?.value ?? 0) >= 5;
  const archetype = hasArchetype
    ? second && second.value > 0
      ? t("archetypeTwo", {
          first: t(`categories.${first.key}`),
          second: t(`categories.${second.key}`),
        })
      : t("archetypeOne", { first: t(`categories.${first.key}`) })
    : null;

  return (
    <div className="space-y-1 px-1 pb-3">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setIsScoreInfoOpen(true)}
          title={rankStyle.label}
          aria-label={t("scoreInfo.title")}
          aria-haspopup="dialog"
          className="relative flex min-h-12 items-center justify-center gap-2.5 rounded-control px-2 pb-1 text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-accent/55 after:to-transparent hover:bg-bg-raised hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="text-[10px] font-medium tracking-[0.24em] text-text-secondary">RANK</span>
          <span className="text-[2.5rem] font-medium leading-none tracking-tight">{rank}</span>
        </button>
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          aria-label={t("totalInfluence")}
          aria-haspopup="dialog"
          onClick={onOpenExplanation}
          className="min-h-9 rounded-control px-2 py-1 text-sm font-medium text-text-secondary hover:bg-bg-raised hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t.rich("influenceScore", { score: totalScore, value: (chunks) => <strong className="text-xl font-semibold tabular-nums text-text-primary">{chunks}</strong> })}
        </button>
      </div>

      {/* 점수의 높낮이를 읽을 좌표 — 순위 · 상위 비율 · 강세 영역 */}
      <div className="flex min-w-0 items-center justify-center gap-2 whitespace-nowrap text-xs">
        <span className="shrink-0 font-semibold tabular-nums text-text-secondary">
          {t("rankingLine", { ranking: data.ranking, total: data.rankedTotal })}
        </span>

        <span aria-hidden className="shrink-0">|</span>

        <span className="shrink-0 font-semibold tabular-nums text-text-secondary">
          {t("percentileTop", {
            percent: Math.max(1, Math.round(data.percentile)),
          })}
        </span>

      </div>
      {archetype && <p className="text-center text-xs font-semibold text-accent break-keep">{archetype}</p>}

      <InfluenceScoreInfoModal
        isOpen={isScoreInfoOpen}
        onClose={() => setIsScoreInfoOpen(false)}
        currentRank={rank}
        totalScore={totalScore}
        baseScore={baseScore}
        transScore={transScore}
      />
    </div>
  );
}
// #endregion

// #region 시대초월성 라인 섹션 (레드 톤 적용)
export function TranshistoricityGauge({
  value,
  maxValue = 40,
  explanation,
  isTranslationFallback = false,
}: {
  value: number;
  maxValue?: number;
  explanation?: string | null;
  isTranslationFallback?: boolean;
}) {
  const t = useTranslations("profilePage.influence");
  const percent = Math.min(100, Math.max(0, (value / maxValue) * 100));

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <Hourglass size={15} className="text-rose-400" />
          </div>
          <h3 className="font-serif text-lg font-extrabold tracking-wide text-text-primary">
            {t("transhistoricity")}
          </h3>
        </div>

        {/* 40점 만점 대비 칩 내부에서 차오르는 그라데이션 뱃지 (레드 톤) */}
        <div className="relative inline-flex items-baseline gap-1 px-3 py-1 rounded-lg bg-black/80 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)] overflow-hidden shrink-0">
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 bg-gradient-to-r from-rose-500/60 via-red-400/40 to-rose-300/20"
            style={{ width: `${percent}%` }}
          />
          <span className="relative z-10 text-base md:text-lg font-black text-rose-400">{value}</span>
          <span className="relative z-10 text-xs font-bold">
            {t("scoreOutOf", { max: maxValue })}
          </span>
        </div>
      </div>

      {/* 인물 고유 시대초월성 해설 스토리 문구 */}
      <div className="p-3.5 md:p-4 rounded-xl bg-stone-heavy/60 border border-white/10">
        {isTranslationFallback && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
            {t("originalKorean")}
          </p>
        )}
        <p className="text-xs md:text-sm font-medium text-text-primary/95 leading-relaxed break-keep">
          {explanation || t("timelessFallback")}
        </p>
      </div>
    </section>
  );
}
// #endregion

// #region 일반 총점 게이지 (60점 만점)
export function BaseScoreGauge({
  data,
  maxValue = 60,
}: {
  data: CelebInfluenceDetail;
  maxValue?: number;
}) {
  const t = useTranslations("profilePage.influence");
  const baseScore = sumBaseScore(data);

  const percent = Math.min(100, Math.max(0, (baseScore / maxValue) * 100));

  return (
    <div className="p-4.5 md:p-5 rounded-xl bg-gradient-to-br from-yellow-400/15 via-white/[0.02] to-transparent border border-yellow-300/30 shadow-lg relative overflow-hidden flex flex-col justify-between gap-2.5 min-h-[105px]">
      {/* 1행: 라벨명 ... 통일된 점수 칩(우측) */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-base md:text-lg font-black tracking-tight text-text-primary leading-tight">
          {t("generalTotal")}
        </span>

        {/* 60점 만점 대비 칩 내부에서 차오르는 그라데이션 뱃지 (레몬 노랑 톤) */}
        <div className="relative inline-flex items-baseline gap-1 px-3 py-1 rounded-lg bg-black/80 border border-yellow-300/40 shadow-[0_0_10px_rgba(253,224,71,0.2)] overflow-hidden shrink-0">
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none bg-accent/15 transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
          <span className="relative z-10 text-base md:text-lg font-black text-yellow-300">{baseScore}</span>
          <span className="relative z-10 text-xs font-bold">
            {t("scoreOutOf", { max: maxValue })}
          </span>
        </div>
      </div>

      {/* 2행: 세부 설명 배치 */}
      <div>
        <p className="text-xs md:text-sm font-medium text-text-primary/90 leading-relaxed break-keep">
          {t("generalScoreDescription")}
        </p>
      </div>
    </div>
  );
}
// #endregion

// #region 영역 한 줄 (역량·덕목·성향 탭과 같은 눈금을 쓴다)
export function CategoryDetail({
  category,
  value,
  explanation,
  isTranslationFallback = false,
  showDescription = true,
}: {
  category: (typeof INFLUENCE_CATEGORIES)[number];
  value: number;
  explanation: string | null;
  isTranslationFallback?: boolean;
  /** 상세 분석을 펼쳤을 때만 해설을 보인다 */
  showDescription?: boolean;
}) {
  const t = useTranslations("profilePage.influence");
  const locale = useLocale();
  const normalizedExplanation = explanation?.trim().toLocaleLowerCase();
  const isNoRel = !normalizedExplanation
    || normalizedExplanation === "관련 없음."
    || normalizedExplanation === "관련 없음"
    || normalizedExplanation === "not applicable."
    || normalizedExplanation === "not applicable";

  return (
    <ScoreBar
      label={t(`categories.${category.key}`)}
      value={value}
      max={10}
      maxText={t("scoreOutOf", { max: 10 })}
      labelClassName={locale === "en" ? "w-[5.5rem]" : "w-10"}
      description={
        !showDescription ? null : isNoRel ? (
          <span className="text-text-tertiary italic">{t("noDetails")}</span>
        ) : (
          <span className="block animate-fade-in">
            {isTranslationFallback && (
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                {t("originalKorean")}
              </span>
            )}
            {explanation}
          </span>
        )
      }
    />
  );
}
// #endregion
// #region 주요 영향력 태그
export function TopInfluenceTags({ data }: { data: CelebInfluenceDetail }) {
  const t = useTranslations("profilePage.influence");
  const sorted = INFLUENCE_CATEGORIES
    .map((cat) => ({ ...cat, value: data[cat.key as keyof CelebInfluenceDetail] as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
        <Sparkles size={13} className="text-accent" />
        <span>{t("topStrengths")}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map((cat, index) => {
          const Icon = cat.icon;
          const isTop = index === 0;
          return (
            <div
              key={cat.key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                isTop
                  ? "bg-accent/15 border-accent/40 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                  : "bg-white/[0.03] border-white/10"
              }`}
            >
              <Icon size={14} className={isTop ? "text-accent" : "text-text-secondary"} />
              <span className={`text-xs font-bold ${isTop ? "text-accent" : "text-text-secondary"}`}>
                {t(`categories.${cat.key}`)}
              </span>
              <span className={`text-xs font-black ${isTop ? "text-text-primary" : ""}`}>
                {cat.value}
              </span>
              {isTop && <span className="text-[11px] text-accent font-bold ml-0.5">★</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// #endregion
