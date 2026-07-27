"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Trophy, Hourglass } from "lucide-react";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { INFLUENCE_CATEGORIES } from "@/constants/influence";

const GOLD = "#d4af37";

// #region 레이더 차트 (우측 리스트 양방향 연동 인터랙션)
export function RadarChart({
  data,
  size = 270,
  activeCategory,
  onSelectCategory,
  hoveredCategory: externalHovered,
  onHoverCategory,
}: {
  data: CelebInfluenceDetail;
  size?: number;
  activeCategory?: string | null;
  onSelectCategory?: (key: string | null) => void;
  hoveredCategory?: string | null;
  onHoverCategory?: (key: string | null) => void;
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
            <stop offset="0%" stopColor="rgba(212,175,55,0.32)" />
            <stop offset="70%" stopColor="rgba(212,175,55,0.08)" />
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
              stroke={isOuter ? "rgba(212,175,55,0.38)" : "rgba(212,175,55,0.14)"}
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
              stroke={GOLD}
              strokeWidth={isActive ? "2.5" : "1"}
              opacity={isActive ? "0.9" : "0.25"}
              className="transition-all duration-150"
            />
          );
        })}

        {/* 영역 그래프 채우기 */}
        <path
          d={dataPath}
          fill="rgba(212,175,55,0.22)"
          stroke={GOLD}
          strokeWidth="2.5"
          filter={`url(#${glowId})`}
          className="transition-all duration-300 ease-out"
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
                stroke={GOLD}
                strokeWidth={isActive ? "2" : "1"}
                opacity={isActive ? "1" : "0.6"}
                className="transition-all duration-150"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? "5.5" : "4"}
                fill={GOLD}
                stroke="#1c1917"
                strokeWidth="1.5"
                className="transition-all duration-150"
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
                className={`w-full h-full rounded-full flex items-center justify-center transition-all duration-150 select-none cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-br from-accent/35 to-stone-900 border-2 border-accent shadow-[0_0_18px_rgba(212,175,55,0.85)] scale-110 z-10"
                    : "bg-stone-900/95 border border-accent/40 shadow-lg backdrop-blur-md hover:border-accent hover:bg-stone-800 hover:scale-110 active:scale-95"
                }`}
              >
                <Icon
                  size={17}
                  className={`transition-colors ${
                    isActive ? "text-accent animate-pulse" : "text-accent/90"
                  }`}
                />
              </button>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}
// #endregion

// #region 종합 영향력 라인 헤더 (일반=레몬노랑 + 초월=레드 듀얼 차오름 칩)
export function TotalScoreCard({ data }: { data: CelebInfluenceDetail }) {
  const t = useTranslations("profilePage.influence");
  const baseScore =
    (data.political || 0) +
    (data.strategic || 0) +
    (data.tech || 0) +
    (data.social || 0) +
    (data.economic || 0) +
    (data.cultural || 0);

  const transScore = data.transhistoricity || 0;
  const totalScore = data.total_score || baseScore + transScore;

  // 100점 만점 기준 (일반 레몬노랑 max 60% + 초월 레드 max 40% = 종합 골드 100%)
  const basePercent = Math.min(60, Math.max(0, baseScore));
  const transPercent = Math.min(40, Math.max(0, transScore));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1 gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
            <Trophy size={15} className="text-amber-400" />
          </div>
          <h2 className="font-serif text-lg md:text-xl font-extrabold tracking-wide text-text-primary shrink-0 leading-tight">
            {t("totalInfluence")}
          </h2>

          {/* 라벨 우측에 a(레몬노랑) + b(레드) = c(딥골드) 덧셈 수식 배치 */}
          <div className="inline-flex items-center text-xs md:text-sm font-semibold text-text-secondary pl-2.5 border-l border-white/15 shrink-0">
            <span className="text-yellow-300 font-extrabold">{baseScore}</span>
            <span className="text-text-tertiary font-bold mx-1">+</span>
            <span className="text-rose-400 font-extrabold">{transScore}</span>
            <span className="text-text-tertiary font-bold mx-1.5">=</span>
            <span className="text-amber-400 font-black">{totalScore}</span>
          </div>
        </div>

        {/* 통일된 100점 만점 칩 (일반 레몬노랑 + 초월 레드 듀얼 차오름) */}
        <div className="relative inline-flex items-baseline gap-1 px-3.5 py-1 rounded-lg bg-black/80 border border-amber-400/40 shadow-[0_0_12px_rgba(212,175,55,0.2)] overflow-hidden shrink-0">
          {/* 1구간: 일반 점수 (레몬 노랑 0~60%) */}
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 bg-gradient-to-r from-yellow-400/65 to-yellow-300/45"
            style={{ width: `${basePercent}%` }}
          />
          {/* 2구간: 시대초월성 (레드 0~40%) */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none transition-all duration-700 bg-gradient-to-r from-rose-500/65 to-red-400/45 border-l border-rose-400/40"
            style={{ left: `${basePercent}%`, width: `${transPercent}%` }}
          />

          <span className="relative z-10 text-base md:text-lg font-black text-amber-400 tracking-tight">
            {totalScore}
          </span>
          <span className="relative z-10 text-xs font-bold text-text-tertiary">/ 100</span>
        </div>
      </div>
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
          <span className="relative z-10 text-xs font-bold text-text-tertiary">
            {t("scoreOutOf", { max: maxValue })}
          </span>
        </div>
      </div>

      {/* 인물 고유 시대초월성 해설 스토리 문구 */}
      <div className="p-3.5 md:p-4 rounded-xl bg-stone-heavy/60 border border-white/10">
        {isTranslationFallback && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/65">
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
  const baseScore =
    (data.political || 0) +
    (data.strategic || 0) +
    (data.tech || 0) +
    (data.social || 0) +
    (data.economic || 0) +
    (data.cultural || 0);

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
            className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 bg-gradient-to-r from-yellow-400/65 via-yellow-300/45 to-yellow-200/25"
            style={{ width: `${percent}%` }}
          />
          <span className="relative z-10 text-base md:text-lg font-black text-yellow-300">{baseScore}</span>
          <span className="relative z-10 text-xs font-bold text-text-tertiary">
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

// #region 카테고리 상세 (일반 점수 상위 라인과 100% 일치하는 레몬 노랑 컬러 패밀리 적용)
export function CategoryDetail({
  category,
  value,
  explanation,
  isTranslationFallback = false,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: {
  category: (typeof INFLUENCE_CATEGORIES)[number];
  value: number;
  explanation: string | null;
  isTranslationFallback?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const t = useTranslations("profilePage.influence");
  const Icon = category.icon;
  const normalizedExplanation = explanation?.trim().toLocaleLowerCase();
  const isNoRel = !normalizedExplanation
    || normalizedExplanation === "관련 없음."
    || normalizedExplanation === "관련 없음"
    || normalizedExplanation === "not applicable."
    || normalizedExplanation === "not applicable";
  const percent = Math.min(100, Math.max(0, (value / 10) * 100));
  const categoryLabel = t(`categories.${category.key}`);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`rounded-xl border transition-all duration-200 p-3.5 md:p-4 flex flex-col justify-between space-y-2.5 relative overflow-hidden min-h-[100px] ${
        isHovered
          ? "bg-gradient-to-r from-yellow-400/20 via-yellow-300/10 to-stone-heavy/80 border-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.35)] scale-[1.01]"
          : "bg-stone-heavy/60 border-white/10 hover:bg-stone-heavy hover:border-yellow-300/40"
      }`}
    >
      {/* 1행: 아이콘 + 영역명 (좌) ... 일반 점수와 100% 통일된 레몬 노랑 점수 뱃지 (우) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
              isHovered
                ? "bg-yellow-300 border-yellow-300 text-stone-950 shadow-[0_0_12px_rgba(253,224,71,0.85)]"
                : "bg-yellow-400/15 border-yellow-300/30 text-yellow-300"
            }`}
          >
            <Icon size={15} className={isHovered ? "text-stone-950" : "text-yellow-300"} />
          </div>
          <span
            className={`text-base font-extrabold tracking-tight ${
              isHovered ? "text-yellow-300" : "text-text-primary"
            }`}
          >
            {categoryLabel}
          </span>
        </div>

        {/* 일반 점수 상위 칩과 동일한 레몬 노랑 점수 칩 (0점 포함 n/10점 규격) */}
        <div className="relative inline-flex items-baseline gap-1 px-3 py-1 rounded-lg shrink-0 border border-yellow-300/40 bg-black/80 shadow-[0_0_10px_rgba(253,224,71,0.2)] text-yellow-300 overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 bg-gradient-to-r from-yellow-400/65 via-yellow-300/45 to-yellow-200/25"
            style={{ width: `${percent}%` }}
          />
          <span className="relative z-10 text-sm md:text-base font-black text-yellow-300">
            {value}
          </span>
          <span className="relative z-10 text-xs font-bold text-text-tertiary">
            {t("scoreOutOf", { max: 10 })}
          </span>
        </div>
      </div>

      {/* 2행: 세부 해설 스토리 문구 (어색한 수직 선 제거, 자연스러운 본문) */}
      <div className="pt-2 border-t border-white/10 flex-1 flex items-center">
        {isNoRel ? (
          <p className="text-xs md:text-sm font-normal text-text-tertiary/70 italic break-keep">
            {t("noDetails")}
          </p>
        ) : (
          <div>
            {isTranslationFallback && (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/65">
                {t("originalKorean")}
              </p>
            )}
            <p className="text-xs md:text-sm font-medium text-text-primary/95 leading-relaxed break-keep">
              {explanation}
            </p>
          </div>
        )}
      </div>
    </div>
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
      <div className="flex items-center gap-1.5 text-xs font-bold text-text-tertiary uppercase tracking-wider">
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
              <span className={`text-xs font-black ${isTop ? "text-text-primary" : "text-text-tertiary"}`}>
                {cat.value}
              </span>
              {isTop && <span className="text-[10px] text-accent font-bold ml-0.5">★</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// #endregion
