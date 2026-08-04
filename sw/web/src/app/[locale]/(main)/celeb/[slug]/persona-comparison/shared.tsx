"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import {
  TENDENCY_KEYS,
  type StatKey,
  type TendencyKey,
} from "@/lib/persona/constants";
import type { PersonaStats } from "@/lib/persona/types";
import type { PersonaMatchEvidence } from "@/lib/persona/utils";
import { cn } from "@/lib/utils";

export const SUBJECT_COLOR = "#d8ba68";
export const CANDIDATE_COLOR = "#83c9dc";
export const CLASH_COLOR = "#d58d96";

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

export const TENDENCY_ANGLES: Record<TendencyKey, number> = {
  pessimism_optimism: -90,
  individual_social: -45,
  conservative_progressive: 0,
  cautious_bold: 45,
};

export function isTendencyAxis(
  axis: keyof PersonaStats,
): axis is TendencyKey {
  return (TENDENCY_KEYS as readonly (keyof PersonaStats)[]).includes(axis);
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

export function FigureLegend({
  subjectName,
  candidateName,
}: {
  subjectName: string;
  candidateName: string;
}) {
  return (
    <div className="flex items-start justify-center gap-5 px-3 text-[10px] font-semibold text-text-secondary">
      <span className="flex min-w-0 max-w-[46%] items-start gap-1.5">
        <i
          className="mt-[3px] h-2 w-2 shrink-0 rounded-full border border-black/30"
          style={{ backgroundColor: SUBJECT_COLOR }}
        />
        <span
          className="rounded-[3px] border px-1.5 py-0.5 text-center leading-4"
          style={{ borderColor: `${SUBJECT_COLOR}66` }}
        >
          {subjectName}
        </span>
      </span>
      <span className="flex min-w-0 max-w-[46%] items-start gap-1.5">
        <i
          className="mt-[3px] h-2 w-2 shrink-0 rotate-45 border border-black/30"
          style={{ backgroundColor: CANDIDATE_COLOR }}
        />
        <span
          className="rounded-[3px] border px-1.5 py-0.5 text-center leading-4"
          style={{ borderColor: `${CANDIDATE_COLOR}66` }}
        >
          {candidateName}
        </span>
      </span>
    </div>
  );
}

export function AxisReadout({
  evidence,
  subjectName,
  candidateName,
}: {
  evidence: PersonaMatchEvidence;
  subjectName: string;
  candidateName: string;
}) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.persona.stat");
  const tl = useTranslations("shared.persona.tendency_label");

  const tendencyLabels = isTendencyAxis(evidence.axis)
    ? TENDENCY_ENDPOINTS[evidence.axis]
    : null;
  const axisLabel = tendencyLabels
    ? `${tl(tendencyLabels[0])} · ${tl(tendencyLabels[1])}`
    : ts(evidence.axis as StatKey);

  const formatValue = (value: number) => {
    if (!tendencyLabels) return String(value);
    if (Math.abs(value) <= 10) {
      return `${t("personaMatchModalNeutral")} ${value > 0 ? `+${value}` : value}`;
    }
    const direction = tl(value < 0 ? tendencyLabels[0] : tendencyLabels[1]);
    return `${direction} ${value > 0 ? `+${value}` : value}`;
  };

  return (
    <div className="mx-auto grid w-full max-w-[390px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-t border-white/[0.07] px-2 pb-1 pt-2.5">
      <div className="min-w-0 text-left">
        <span
          className="inline-block max-w-full truncate rounded-[3px] border px-1.5 py-0.5 text-[8px] font-medium text-text-secondary/70"
          style={{ borderColor: `${SUBJECT_COLOR}66` }}
          title={subjectName}
        >
          {subjectName}
        </span>
        <strong
          className="mt-0.5 block font-mono text-[11px]"
          style={{ color: SUBJECT_COLOR }}
        >
          {formatValue(evidence.targetValue)}
        </strong>
      </div>
      <span className="max-w-[126px] text-balance break-keep text-center text-[9px] font-bold text-text-primary/85">
        {axisLabel}
      </span>
      <div className="min-w-0 text-right">
        <span
          className="inline-block max-w-full truncate rounded-[3px] border px-1.5 py-0.5 text-[8px] font-medium text-text-secondary/70"
          style={{ borderColor: `${CANDIDATE_COLOR}66` }}
          title={candidateName}
        >
          {candidateName}
        </span>
        <strong
          className="mt-0.5 block font-mono text-[11px]"
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
        "relative overflow-hidden border border-white/[0.075] bg-[radial-gradient(circle_at_50%_38%,rgba(216,186,104,0.07),transparent_54%)] px-2 pb-2 pt-3",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />
      <div className="relative text-center">
        <h3 className="font-serif text-[11px] font-bold tracking-[0.08em] text-text-primary/90">
          {title}
        </h3>
        <p className="mt-0.5 text-[8px] text-text-secondary/45">{hint}</p>
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}
