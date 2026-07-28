/*
  파일명: /components/ui/ScoreBar.tsx
  기능: 라벨 + 가로 막대 + 점수로 한 항목을 보여주는 공통 눈금
  책임: 인물 지표(역량·덕목·성향, 영향력)가 같은 문법으로 점수를 표시하게 한다.
        점수가 만점에 가까울수록 막대·숫자·라벨이 단계적으로 강해진다.
*/ // ------------------------------

"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** 만점 대비 비율이 오를수록 높아지는 강조 단계 */
export type ScoreTier = 0 | 1 | 2 | 3 | 4;

export function getScoreTier(value: number, max: number): ScoreTier {
  if (max <= 0 || value <= 0) return 0;
  const ratio = value / max;
  if (ratio < 0.35) return 1;
  if (ratio < 0.6) return 2;
  if (ratio < 0.8) return 3;
  return 4;
}

/** 막대 채움 — 위로 갈수록 밝아지고 빛이 번진다 */
const FILL_BY_TIER: Record<ScoreTier, string> = {
  0: "",
  1: "bg-accent/30",
  2: "bg-accent/55",
  3: "bg-accent/85 shadow-[0_0_10px_rgba(212,175,55,0.35)]",
  4: "bg-gradient-to-r from-accent via-[#f7e3a1] to-accent shadow-[0_0_16px_rgba(212,175,55,0.6)]",
};

/** 막대 바탕 — 최상위 단계에서만 테두리까지 금빛을 띤다 */
const TRACK_BY_TIER: Record<ScoreTier, string> = {
  0: "bg-white/[0.03] ring-1 ring-white/5",
  1: "bg-white/[0.03] ring-1 ring-white/5",
  2: "bg-white/[0.04] ring-1 ring-white/8",
  3: "bg-white/[0.04] ring-1 ring-accent/15",
  4: "bg-white/[0.05] ring-1 ring-accent/30",
};

/* 글자는 흰 계열을 지키고 밝기·굵기로만 층을 낸다 (색으로 물들이지 않는다) */
const VALUE_BY_TIER: Record<ScoreTier, string> = {
  0: "text-text-primary/35 font-semibold",
  1: "text-text-primary/55 font-bold",
  2: "text-text-primary/75 font-bold",
  3: "text-text-primary/90 font-extrabold",
  4: "text-text-primary font-black",
};

const LABEL_BY_TIER: Record<ScoreTier, string> = {
  0: "text-text-primary/35",
  1: "text-text-primary/55",
  2: "text-text-primary/75 font-medium",
  3: "text-text-primary/90 font-semibold",
  4: "text-text-primary font-bold",
};

interface Props {
  label: ReactNode;
  value: number;
  /** 만점 (기본 100) */
  max?: number;
  /** 라벨 칸 고정 폭 등 (예: "w-10", "w-[5.5rem]") */
  labelClassName?: string;
  /** 점수 오른쪽에 붙는 만점 표기 (예: "/ 10점") */
  maxText?: string;
  /** 막대 아래에 붙는 해설 */
  description?: ReactNode;
  /** 굵은 막대 — 요약 줄처럼 무게를 실어야 할 때 */
  thick?: boolean;
  className?: string;
}

export default function ScoreBar({
  label,
  value,
  max = 100,
  labelClassName,
  maxText,
  description,
  thick = false,
  className,
}: Props) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const percent = max > 0 ? Math.min(100, Math.max(0, (safeValue / max) * 100)) : 0;
  const tier = getScoreTier(safeValue, max);

  return (
    <div className={cn("py-1.5", className)}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "shrink-0 text-left text-sm tracking-tight",
            LABEL_BY_TIER[tier],
            labelClassName,
          )}
        >
          {label}
        </span>

        <div
          className={cn(
            "relative flex-1 overflow-hidden rounded-full",
            thick ? "h-2" : "h-1.5",
            TRACK_BY_TIER[tier],
          )}
        >
          <div
            className={cn(
              "relative h-full rounded-full transition-[width] duration-700 ease-out",
              FILL_BY_TIER[tier],
            )}
            style={{ width: `${percent}%` }}
          >
            {tier >= 3 && (
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-40" />
            )}
          </div>
        </div>

        <span className="shrink-0 text-right font-serif text-xs tabular-nums">
          <span className={cn(thick ? "text-sm" : "text-xs", VALUE_BY_TIER[tier])}>
            {safeValue}
          </span>
          {maxText && (
            <span className="ms-1 font-bold text-text-secondary/70">{maxText}</span>
          )}
        </span>
      </div>

      {description && (
        <div className="mt-1 text-sm leading-relaxed text-text-secondary break-keep">
          {description}
        </div>
      )}
    </div>
  );
}
