"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import type { StatKey } from "@/lib/spectrum/constants";
import type { SpectrumStats } from "@/lib/spectrum/types";
import { cn } from "@/lib/utils";
import {
  CANDIDATE_COLOR,
  ChartFrame,
  Diamond,
  SUBJECT_COLOR,
  polarPoint,
  polygonPath,
} from "../shared";
import type { ComparisonChartProps } from "../types";

export default function RadarComparison({
  data,
  subjectName,
  candidateName,
  title,
  preferredAxis,
}: ComparisonChartProps) {
  const ts = useTranslations("shared.spectrum.stat");
  const uid = useId().replaceAll(":", "");
  const [hoveredAxis, setHoveredAxis] = useState<keyof SpectrumStats | null>(null);
  const [selectedAxis, setSelectedAxis] = useState<keyof SpectrumStats | null>(
    preferredAxis && data.some((evidence) => evidence.axis === preferredAxis)
      ? preferredAxis
      : data[0]?.axis ?? null,
  );
  const activeAxis = hoveredAxis ?? selectedAxis ?? data[0]?.axis;
  const activeEvidence =
    data.find((evidence) => evidence.axis === activeAxis) ?? data[0];

  if (!activeEvidence) return null;

  const useSideReadout = data.length < 10;
  // 축이 적으면 별 모양이 좁아 좌우가 빈다 — 그림 크기는 두고 그릴 판을 줄인다
  const width = useSideReadout ? (data.length <= 4 ? 330 : 380) : 420;
  const height = useSideReadout ? 300 : 296;
  const centerX = width / 2;
  const centerY = useSideReadout ? 150 : 139;
  const radius = useSideReadout ? 118 : 94;
  const labelRadius = useSideReadout ? 141 : 127;
  const angleStep = 360 / data.length;
  const angleFor = (index: number) => -90 + angleStep * index;
  const valuePoint = (index: number, value: number) =>
    polarPoint(
      centerX,
      centerY,
      radius * (Math.max(0, Math.min(100, value)) / 100),
      angleFor(index),
    );
  const targetPoints = data.map((evidence, index) =>
    valuePoint(index, evidence.targetValue),
  );
  const candidatePoints = data.map((evidence, index) =>
    valuePoint(index, evidence.candidateValue),
  );

  const activeIndex = data.findIndex((evidence) => evidence.axis === activeAxis);
  // 판정 영역이 그림판을 벗어나면 그 바깥은 눌러도 잡히지 않는다
  const sectorRadius = Math.min(centerX, centerY, labelRadius + 20);
  /** 축 하나가 맡는 부채꼴 — 이 조각 어디를 눌러도 그 축이 선택된다 */
  const sectorPath = (index: number) => {
    const half = angleStep / 2;
    const start = polarPoint(centerX, centerY, sectorRadius, angleFor(index) - half);
    const end = polarPoint(centerX, centerY, sectorRadius, angleFor(index) + half);
    const largeArc = angleStep > 180 ? 1 : 0;
    return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${sectorRadius} ${sectorRadius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  };
  /** 고른 축에서 몇 칸 떨어졌는가 — 멀수록 빛이 옅어진다 */
  const stepsFromActive = (index: number) => {
    if (activeIndex < 0) return data.length;
    const raw = Math.abs(index - activeIndex);
    return Math.min(raw, data.length - raw);
  };

  return (
    <ChartFrame>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={cn(
            "mx-auto mt-1 block h-auto w-full select-none overflow-visible",
            useSideReadout ? "max-w-[400px]" : "max-w-[560px]",
          )}
          role="img"
          aria-label={title}
        >
          <defs>
            <filter
              id={`spectrum-radar-glow-${uid}`}
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
            >
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* 가운데는 밝고 바깥으로 갈수록 사라지는 빛 — 부채꼴을 이걸로 채운다 */}
            <radialGradient id={`spectrum-sector-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={SUBJECT_COLOR} stopOpacity="0.34" />
              <stop offset="55%" stopColor={SUBJECT_COLOR} stopOpacity="0.16" />
              <stop offset="100%" stopColor={SUBJECT_COLOR} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 빛나는 조각 — 보여주기만 한다. 누르는 자리는 맨 위에 따로 깔려 있다 */}
          {data.map((evidence, index) => {
            const steps = stepsFromActive(index);
            const glow = steps === 0 ? 1 : steps === 1 ? 0.32 : 0;
            return (
              <path
                key={`sector-${evidence.axis}`}
                d={sectorPath(index)}
                fill={`url(#spectrum-sector-${uid})`}
                opacity={glow}
                pointerEvents="none"
                stroke={
                  evidence.axis === selectedAxis
                    ? "rgba(216,186,104,0.3)"
                    : "transparent"
                }
                strokeWidth="1"
                className="transition-opacity duration-300 ease-out"
              />
            );
          })}

          {[25, 50, 75, 100].map((level) => {
            const gridPoints = data.map((_, index) =>
              polarPoint(
                centerX,
                centerY,
                radius * (level / 100),
                angleFor(index),
              ),
            );
            return (
              <path
                key={level}
                d={polygonPath(gridPoints)}
                fill={level === 100 ? "rgba(255,255,255,0.012)" : "none"}
                stroke={
                  level === 100
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(255,255,255,0.075)"
                }
                strokeDasharray={level === 100 ? undefined : "2.5 4"}
                strokeWidth={level === 100 ? 1.15 : 0.8}
                pointerEvents="none"
              />
            );
          })}

          {data.map((evidence, index) => {
            const end = polarPoint(centerX, centerY, radius, angleFor(index));
            const active = evidence.axis === activeAxis;
            return (
              <line
                key={evidence.axis}
                x1={centerX}
                y1={centerY}
                x2={end.x}
                y2={end.y}
                stroke={
                  active
                    ? "rgba(255,255,255,0.38)"
                    : "rgba(255,255,255,0.09)"
                }
                strokeWidth={active ? 1.4 : 0.75}
                pointerEvents="none"
                className="transition-[stroke,stroke-width] duration-300"
              />
            );
          })}

          <path
            d={polygonPath(targetPoints)}
            fill="rgba(216,186,104,0.14)"
            stroke={SUBJECT_COLOR}
            strokeWidth="2"
            strokeLinejoin="round"
            pointerEvents="none"
            style={{ mixBlendMode: "screen" }}
          />
          <path
            d={polygonPath(candidatePoints)}
            fill="rgba(131,201,220,0.12)"
            stroke={CANDIDATE_COLOR}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeDasharray="4 3"
            pointerEvents="none"
            style={{ mixBlendMode: "screen" }}
          />

          {data.map((evidence, index) => {
            const target = targetPoints[index];
            const candidate = candidatePoints[index];
            const active = evidence.axis === activeAxis;
            return (
              <g key={`points-${evidence.axis}`} pointerEvents="none">
                <circle
                  cx={target.x}
                  cy={target.y}
                  r={active ? 5.5 : 3.2}
                  fill="#091115"
                  stroke={SUBJECT_COLOR}
                  strokeWidth={active ? 2.2 : 1.5}
                  filter={
                    active ? `url(#spectrum-radar-glow-${uid})` : undefined
                  }
                  className="transition-all duration-300"
                />
                <Diamond
                  x={candidate.x}
                  y={candidate.y}
                  size={active ? 8 : 5.5}
                  color={CANDIDATE_COLOR}
                />
              </g>
            );
          })}

          {data.map((evidence, index) => {
            const angle = angleFor(index);
            const label = polarPoint(centerX, centerY, labelRadius, angle);
            const cosine = Math.cos((angle * Math.PI) / 180);
            const anchor =
              cosine > 0.22 ? "start" : cosine < -0.22 ? "end" : "middle";
            const active = evidence.axis === activeAxis;
            return (
              <text
                key={`label-${evidence.axis}`}
                x={label.x}
                y={label.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={data.length >= 10 ? 13 : 15}
                fontWeight={active ? 750 : 550}
                fill={active ? SUBJECT_COLOR : "rgba(244,240,232,0.82)"}
                pointerEvents="none"
                className="transition-[fill] duration-200"
              >
                {ts(evidence.axis as StatKey)}
              </text>
            );
          })}

          {/* 누르는 자리 — 그림 위에 투명하게 덮어 도형 안쪽에서도 잡히게 한다 */}
          {data.map((evidence, index) => (
            <path
              key={`hit-${evidence.axis}`}
              d={sectorPath(index)}
              fill="transparent"
              pointerEvents="all"
              role="button"
              tabIndex={0}
              aria-label={`${ts(evidence.axis as StatKey)}: ${subjectName} ${evidence.targetValue}, ${candidateName} ${evidence.candidateValue}`}
              className="cursor-pointer outline-none"
              onPointerEnter={() => setHoveredAxis(evidence.axis)}
              onPointerLeave={() => setHoveredAxis(null)}
              onFocus={() => setHoveredAxis(evidence.axis)}
              onBlur={() => setHoveredAxis(null)}
              onClick={() => setSelectedAxis(evidence.axis)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedAxis(evidence.axis);
                }
              }}
            />
          ))}
        </svg>

        {/* 고른 축의 값은 상자 바닥 양 구석에 — 도형과 축 이름을 피해 늘 비는 자리다 */}
        <strong
          className="pointer-events-none absolute bottom-0 start-0 font-mono text-[28px] font-bold leading-none transition-colors duration-300"
          style={{ color: SUBJECT_COLOR }}
        >
          {activeEvidence.targetValue}
        </strong>
        <strong
          className="pointer-events-none absolute bottom-0 end-0 font-mono text-[28px] font-bold leading-none transition-colors duration-300"
          style={{ color: CANDIDATE_COLOR }}
        >
          {activeEvidence.candidateValue}
        </strong>
      </div>
    </ChartFrame>
  );
}
