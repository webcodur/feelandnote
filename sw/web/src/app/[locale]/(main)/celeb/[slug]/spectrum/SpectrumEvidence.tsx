/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 닮음 근거 칩과 축 라벨 포맷
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: SpectrumMatchEvidence(axis·value·direction·targetValue·candidateValue)
 * - 함께 보기: SpectrumMatchGroup.tsx, SpectrumHighlights.tsx
 * ───────────────────────────────────────────── */
"use client";

import type { CSSProperties } from "react";

import {
  type StatKey,
  type TendencyKey,
} from "@/lib/spectrum/constants";
import type { SpectrumMatchEvidence } from "@/lib/spectrum/utils";
import { cn } from "@/lib/utils";

/* ── 1. 성향 양극 라벨 키 ── */

type TendencyLabelKey =
  | "pessimism"
  | "optimism"
  | "conservative"
  | "progressive"
  | "individual"
  | "social"
  | "cautious"
  | "bold";

export const TENDENCY_EVIDENCE_LABELS: Record<
  TendencyKey,
  readonly [TendencyLabelKey, TendencyLabelKey]
> = {
  pessimism_optimism: ["pessimism", "optimism"],
  conservative_progressive: ["conservative", "progressive"],
  individual_social: ["individual", "social"],
  cautious_bold: ["cautious", "bold"],
};

/* ── 2. 칩 색 ── */

const STAT_EVIDENCE_CHIP_STYLES: Record<StatKey, string> = {
  command: "border-emerald-300/20 bg-emerald-400/[0.07] text-emerald-200",
  martial: "border-red-300/20 bg-red-400/[0.07] text-red-200",
  intellect: "border-sky-300/20 bg-sky-400/[0.07] text-sky-200",
  charm: "border-fuchsia-300/20 bg-fuchsia-400/[0.07] text-fuchsia-200",
  temperance: "border-indigo-300/20 bg-indigo-400/[0.07] text-indigo-200",
  diligence: "border-amber-300/20 bg-amber-400/[0.07] text-amber-200",
  reflection: "border-violet-300/20 bg-violet-400/[0.07] text-violet-200",
  courage: "border-orange-300/20 bg-orange-400/[0.07] text-orange-200",
  loyalty: "border-yellow-300/20 bg-yellow-400/[0.07] text-yellow-200",
  benevolence: "border-teal-300/20 bg-teal-400/[0.07] text-teal-200",
  fairness: "border-cyan-300/20 bg-cyan-400/[0.07] text-cyan-200",
  humility: "border-stone-300/20 bg-stone-400/[0.07] text-stone-200",
};

const TENDENCY_EVIDENCE_CHIP_STYLES: Record<
  TendencyKey,
  { negative: string; positive: string }
> = {
  pessimism_optimism: {
    negative: "border-blue-300/20 bg-blue-400/[0.07] text-blue-200",
    positive: "border-yellow-300/20 bg-yellow-400/[0.07] text-yellow-200",
  },
  conservative_progressive: {
    negative: "border-slate-300/20 bg-slate-400/[0.07] text-slate-200",
    positive: "border-green-300/20 bg-green-400/[0.07] text-green-200",
  },
  individual_social: {
    negative: "border-purple-300/20 bg-purple-400/[0.07] text-purple-200",
    positive: "border-teal-300/20 bg-teal-400/[0.07] text-teal-200",
  },
  cautious_bold: {
    negative: "border-cyan-300/20 bg-cyan-400/[0.07] text-cyan-200",
    positive: "border-rose-300/20 bg-rose-400/[0.07] text-rose-200",
  },
};

/* ── 3. 근거 칩 ── */

export function SpectrumEvidenceChip({
  axis,
  value,
  label,
  direction,
  className,
  borderClassName,
  borderStyle,
}: {
  axis: SpectrumMatchEvidence["axis"];
  value: number;
  label: string;
  /** 능력·덕목 근거 — 함께 높아서(high) 닮았는지 함께 낮아서(low) 닮았는지 */
  direction?: SpectrumMatchEvidence["direction"];
  className?: string;
  borderClassName?: string;
  borderStyle?: CSSProperties;
}) {
  const tendencyStyle =
    TENDENCY_EVIDENCE_CHIP_STYLES[axis as TendencyKey];
  const color = tendencyStyle
    ? tendencyStyle[value < 0 ? "negative" : "positive"]
    : STAT_EVIDENCE_CHIP_STYLES[axis as StatKey];

  return (
    <span
      title={label}
      className={cn(
        "inline-flex min-h-6 max-w-full items-center justify-center gap-0.5 overflow-hidden whitespace-nowrap rounded-[4px] border px-2 py-1 font-sans text-xs font-semibold leading-none tracking-[-0.01em] shadow-[0_1px_5px_rgba(0,0,0,0.12)] md:text-[13px]",
        color,
        borderClassName,
        className,
      )}
      style={borderStyle}
    >
      <span className="truncate">{label}</span>
      {direction ? (
        <span aria-hidden className="shrink-0 opacity-80">
          {direction === "high" ? "↑" : "↓"}
        </span>
      ) : null}
    </span>
  );
}

/* ── 4. 매칭 근거 라벨 포맷 ── */

export function formatMatchEvidenceLabel(
  ts: (key: StatKey) => string,
  tl: (key: TendencyLabelKey) => string,
  evidence: SpectrumMatchEvidence,
): string {
  const tendencyLabels =
    TENDENCY_EVIDENCE_LABELS[evidence.axis as TendencyKey];

  if (tendencyLabels) {
    const [negativeKey, positiveKey] = tendencyLabels;
    return tl(evidence.targetValue < 0 ? negativeKey : positiveKey);
  }

  return ts(evidence.axis as StatKey);
}

export function formatOppositeEvidenceLabel(
  tl: (key: TendencyLabelKey) => string,
  evidence: SpectrumMatchEvidence,
  value: number,
): string {
  const [negativeKey, positiveKey] =
    TENDENCY_EVIDENCE_LABELS[evidence.axis as TendencyKey];
  return tl(value < 0 ? negativeKey : positiveKey);
}
