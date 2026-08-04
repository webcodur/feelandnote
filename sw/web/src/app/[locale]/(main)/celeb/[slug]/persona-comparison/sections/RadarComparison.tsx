"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import type { StatKey } from "@/lib/persona/constants";
import type { PersonaStats } from "@/lib/persona/types";
import {
  AxisReadout,
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
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.persona.stat");
  const uid = useId().replaceAll(":", "");
  const [hoveredAxis, setHoveredAxis] = useState<keyof PersonaStats | null>(null);
  const [selectedAxis, setSelectedAxis] = useState<keyof PersonaStats | null>(
    preferredAxis && data.some((evidence) => evidence.axis === preferredAxis)
      ? preferredAxis
      : data[0]?.axis ?? null,
  );
  const activeAxis = hoveredAxis ?? selectedAxis ?? data[0]?.axis;
  const activeEvidence =
    data.find((evidence) => evidence.axis === activeAxis) ?? data[0];

  if (!activeEvidence) return null;

  const width = 420;
  const height = 296;
  const centerX = width / 2;
  const centerY = 139;
  const radius = data.length >= 10 ? 94 : 101;
  const labelRadius = data.length >= 10 ? 127 : 132;
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

  return (
    <ChartFrame title={title} hint={t("personaMatchGraphicHint")}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto mt-1 block h-auto w-full max-w-[440px] select-none overflow-visible"
        role="img"
        aria-label={title}
      >
        <defs>
          <filter
            id={`persona-radar-glow-${uid}`}
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
        </defs>

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
            />
          );
        })}

        <path
          d={polygonPath(targetPoints)}
          fill="rgba(216,186,104,0.14)"
          stroke={SUBJECT_COLOR}
          strokeWidth="2"
          strokeLinejoin="round"
          style={{ mixBlendMode: "screen" }}
        />
        <path
          d={polygonPath(candidatePoints)}
          fill="rgba(131,201,220,0.12)"
          stroke={CANDIDATE_COLOR}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeDasharray="4 3"
          style={{ mixBlendMode: "screen" }}
        />

        {data.map((evidence, index) => {
          const target = targetPoints[index];
          const candidate = candidatePoints[index];
          const active = evidence.axis === activeAxis;
          return (
            <g key={`points-${evidence.axis}`}>
              <circle
                cx={target.x}
                cy={target.y}
                r={active ? 5.5 : 3.2}
                fill="#091115"
                stroke={SUBJECT_COLOR}
                strokeWidth={active ? 2.2 : 1.5}
                filter={active ? `url(#persona-radar-glow-${uid})` : undefined}
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
          const hitX = anchor === "start" ? -7 : anchor === "end" ? -83 : -45;
          return (
            <g
              key={`label-${evidence.axis}`}
              transform={`translate(${label.x} ${label.y})`}
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
            >
              <rect x={hitX} y="-12" width="90" height="24" fill="transparent" />
              <text
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={data.length >= 10 ? 10.5 : 11.5}
                fontWeight={active ? 750 : 550}
                fill={active ? "#f4f0e8" : "rgba(218,225,228,0.68)"}
              >
                {ts(evidence.axis as StatKey)}
              </text>
            </g>
          );
        })}
      </svg>

      <AxisReadout
        evidence={activeEvidence}
        subjectName={subjectName}
        candidateName={candidateName}
      />
    </ChartFrame>
  );
}
