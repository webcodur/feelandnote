"use client";

import type { ReactNode } from "react";

import { TENDENCY_KEYS, type TendencyKey } from "@/lib/spectrum/constants";
import type { SpectrumStats } from "@/lib/spectrum/types";
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

export function ChartFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "@container relative flex h-full flex-col overflow-hidden border border-white/[0.1] bg-[radial-gradient(circle_at_50%_38%,rgba(216,186,104,0.07),transparent_54%)] px-3 pb-3 pt-3",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />
      {/* 제목도 안내도 두지 않는다 — 겹창 머리글이 이미 말하고, 조작은 만져 보면 안다 */}
      <div className="relative flex flex-1 flex-col justify-center">{children}</div>
    </section>
  );
}
