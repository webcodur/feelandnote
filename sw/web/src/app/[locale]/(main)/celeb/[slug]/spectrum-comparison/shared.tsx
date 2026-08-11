"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import {
  TENDENCY_KEYS,
  type StatKey,
  type TendencyKey,
} from "@/lib/spectrum/constants";
import type { SpectrumStats } from "@/lib/spectrum/types";
import type { SpectrumMatchEvidence } from "@/lib/spectrum/utils";
import { cn } from "@/lib/utils";

export const SUBJECT_COLOR = "#d8ba68";
export const CANDIDATE_COLOR = "#83c9dc";

type TendencyLabelKey =
  | "pessimism"
  | "optimism"
  | "conservative"
  | "progressive"
  | "individual"
  | "social"
  | "cautious"
  | "bold";

export const TENDENCY_ENDPOINTS: Record<
  TendencyKey,
  readonly [TendencyLabelKey, TendencyLabelKey]
> = {
  pessimism_optimism: ["pessimism", "optimism"],
  conservative_progressive: ["conservative", "progressive"],
  individual_social: ["individual", "social"],
  cautious_bold: ["cautious", "bold"],
};

export function isTendencyAxis(
  axis: keyof SpectrumStats,
): axis is TendencyKey {
  return (TENDENCY_KEYS as readonly (keyof SpectrumStats)[]).includes(axis);
}

export function polarPoint(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
) {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: centerX + Math.cos(radians) * radius,
    y: centerY + Math.sin(radians) * radius,
  };
}

export function polygonPath(points: { x: number; y: number }[]): string {
  return `${points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ")} Z`;
}

export function Diamond({
  x,
  y,
  size,
  color,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  return (
    <rect
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      rx="1"
      fill={color}
      stroke="#091115"
      strokeWidth="1.5"
      transform={`rotate(45 ${x} ${y})`}
    />
  );
}

export function AxisReadout({
  evidence,
  subjectName,
  candidateName,
  side = false,
}: {
  evidence: SpectrumMatchEvidence;
  subjectName: string;
  candidateName: string;
  side?: boolean;
}) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.spectrum.stat");
  const tl = useTranslations("shared.spectrum.tendency_label");

  const tendencyLabels = isTendencyAxis(evidence.axis)
    ? TENDENCY_ENDPOINTS[evidence.axis]
    : null;
  const axisLabel = tendencyLabels
    ? `${tl(tendencyLabels[0])} · ${tl(tendencyLabels[1])}`
    : ts(evidence.axis as StatKey);

  const formatValue = (value: number) => {
    if (!tendencyLabels) return String(value);
    if (Math.abs(value) <= 10) {
      return `${t("spectrumMatchModalNeutral")} ${value > 0 ? `+${value}` : value}`;
    }
    const direction = tl(value < 0 ? tendencyLabels[0] : tendencyLabels[1]);
    return `${direction} ${value > 0 ? `+${value}` : value}`;
  };

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-[440px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-t border-white/[0.1] px-2 pb-1 pt-3",
        side &&
          "@min-[520px]:mx-0 @min-[520px]:max-w-none @min-[520px]:grid-cols-1 @min-[520px]:content-center @min-[520px]:gap-5 @min-[520px]:border-l @min-[520px]:border-t-0 @min-[520px]:px-4 @min-[520px]:py-5",
      )}
    >
      <div className="min-w-0 text-left">
        <span
          className="inline-block max-w-full truncate rounded-[3px] border px-2.5 py-1 text-[13px] font-semibold text-text-primary/90"
          style={{ borderColor: `${SUBJECT_COLOR}66` }}
          title={subjectName}
        >
          {subjectName}
        </span>
        <strong
          className="mt-1.5 block font-mono text-lg font-bold"
          style={{ color: SUBJECT_COLOR }}
        >
          {formatValue(evidence.targetValue)}
        </strong>
      </div>
      <span
        className={cn(
          "max-w-[160px] text-balance break-keep text-center text-[15px] font-bold leading-5 text-text-primary",
          side && "@min-[520px]:-order-1 @min-[520px]:max-w-none",
        )}
      >
        {axisLabel}
      </span>
      <div
        className={cn(
          "min-w-0 text-right",
          side && "@min-[520px]:text-left",
        )}
      >
        <span
          className="inline-block max-w-full truncate rounded-[3px] border px-2.5 py-1 text-[13px] font-semibold text-text-primary/90"
          style={{ borderColor: `${CANDIDATE_COLOR}66` }}
          title={candidateName}
        >
          {candidateName}
        </span>
        <strong
          className="mt-1.5 block font-mono text-lg font-bold"
          style={{ color: CANDIDATE_COLOR }}
        >
          {formatValue(evidence.candidateValue)}
        </strong>
      </div>
    </div>
  );
}

export function ChartFrame({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "@container relative overflow-hidden border border-white/[0.1] bg-[radial-gradient(circle_at_50%_38%,rgba(216,186,104,0.07),transparent_54%)] px-3 pb-3 pt-3",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />
      <div className="relative flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
        <h3 className="font-serif text-base font-bold tracking-[0.04em] text-text-primary">
          {title}
        </h3>
        <p className="text-[13px] font-medium text-text-primary/65">{hint}</p>
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}
