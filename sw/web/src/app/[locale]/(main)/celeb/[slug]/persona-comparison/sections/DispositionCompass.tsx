"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

import type { TendencyKey } from "@/lib/persona/constants";
import type { PersonaMatchEvidence } from "@/lib/persona/utils";
import {
  AxisReadout,
  CANDIDATE_COLOR,
  CLASH_COLOR,
  ChartFrame,
  Diamond,
  SUBJECT_COLOR,
  TENDENCY_ANGLES,
  TENDENCY_ENDPOINTS,
  isTendencyAxis,
  polarPoint,
} from "../shared";
import type { CompassChartProps } from "../types";

export default function DispositionCompass({
  data,
  subjectName,
  candidateName,
  title,
  preferredAxis,
  opposite,
}: CompassChartProps) {
  const t = useTranslations("celebPage");
  const tl = useTranslations("shared.persona.tendency_label");
  const uid = useId().replaceAll(":", "");
  const tendencyData = data.filter(
    (evidence): evidence is PersonaMatchEvidence & { axis: TendencyKey } =>
      isTendencyAxis(evidence.axis),
  );
  const [hoveredAxis, setHoveredAxis] = useState<TendencyKey | null>(null);
  const [selectedAxis, setSelectedAxis] = useState<TendencyKey | null>(
    preferredAxis && isTendencyAxis(preferredAxis)
      ? preferredAxis
      : tendencyData[0]?.axis ?? null,
  );
  const activeAxis = hoveredAxis ?? selectedAxis ?? tendencyData[0]?.axis;
  const activeEvidence =
    tendencyData.find((evidence) => evidence.axis === activeAxis) ??
    tendencyData[0];

  if (!activeEvidence) return null;

  const width = 420;
  const height = 304;
  const centerX = width / 2;
  const centerY = 145;
  const radius = 98;
  const labelRadius = 129;
  const pointFor = (axis: TendencyKey, value: number) =>
    polarPoint(
      centerX,
      centerY,
      radius * (Math.max(-50, Math.min(50, value)) / 50),
      TENDENCY_ANGLES[axis],
    );

  return (
    <ChartFrame title={title} hint={t("personaMatchGraphicHint")}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto mt-1 block h-auto w-full max-w-[420px] select-none overflow-visible"
        role="img"
        aria-label={title}
      >
        <defs>
          <radialGradient
            id={`persona-compass-field-${uid}`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor="rgba(255,255,255,0.045)" />
            <stop offset="68%" stopColor="rgba(131,201,220,0.025)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter
            id={`persona-compass-glow-${uid}`}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 1.08}
          fill={`url(#persona-compass-field-${uid})`}
          stroke="rgba(255,255,255,0.13)"
          strokeWidth="1"
        />
        {[0.5, 1].map((level) => (
          <circle
            key={level}
            cx={centerX}
            cy={centerY}
            r={radius * level}
            fill="none"
            stroke={
              level === 1
                ? "rgba(255,255,255,0.11)"
                : "rgba(255,255,255,0.07)"
            }
            strokeDasharray={level === 1 ? undefined : "2.5 4"}
            strokeWidth="0.8"
          />
        ))}

        {tendencyData.map((evidence) => {
          const angle = TENDENCY_ANGLES[evidence.axis];
          const negative = polarPoint(centerX, centerY, radius, angle + 180);
          const positive = polarPoint(centerX, centerY, radius, angle);
          const target = pointFor(evidence.axis, evidence.targetValue);
          const candidate = pointFor(evidence.axis, evidence.candidateValue);
          const active = evidence.axis === activeAxis;
          return (
            <g key={`axis-${evidence.axis}`}>
              {opposite && (
                <line
                  x1={target.x}
                  y1={target.y}
                  x2={candidate.x}
                  y2={candidate.y}
                  stroke={CLASH_COLOR}
                  strokeWidth={active ? 5 : 2.5}
                  strokeLinecap="round"
                  opacity={active ? 0.55 : 0.18}
                />
              )}
              <line
                x1={negative.x}
                y1={negative.y}
                x2={positive.x}
                y2={positive.y}
                stroke={
                  active
                    ? opposite
                      ? "rgba(213,141,150,0.72)"
                      : "rgba(255,255,255,0.4)"
                    : "rgba(255,255,255,0.13)"
                }
                strokeWidth={active ? 1.5 : 0.85}
              />
              <line
                x1={centerX}
                y1={centerY}
                x2={target.x}
                y2={target.y}
                stroke={SUBJECT_COLOR}
                strokeWidth={active ? 2 : 1}
                opacity={active ? 0.8 : 0.3}
              />
              <line
                x1={centerX}
                y1={centerY}
                x2={candidate.x}
                y2={candidate.y}
                stroke={CANDIDATE_COLOR}
                strokeWidth={active ? 2 : 1}
                strokeDasharray="3 3"
                opacity={active ? 0.8 : 0.3}
              />
              <circle
                cx={target.x}
                cy={target.y}
                r={active ? 7 : 5}
                fill="#091115"
                stroke={SUBJECT_COLOR}
                strokeWidth={active ? 2.5 : 1.8}
                filter={
                  active ? `url(#persona-compass-glow-${uid})` : undefined
                }
              />
              <Diamond
                x={candidate.x}
                y={candidate.y}
                size={active ? 10 : 7}
                color={CANDIDATE_COLOR}
              />
              <line
                x1={negative.x}
                y1={negative.y}
                x2={positive.x}
                y2={positive.y}
                stroke="transparent"
                strokeWidth="25"
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${tl(TENDENCY_ENDPOINTS[evidence.axis][0])} · ${tl(TENDENCY_ENDPOINTS[evidence.axis][1])}: ${subjectName} ${evidence.targetValue}, ${candidateName} ${evidence.candidateValue}`}
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
            </g>
          );
        })}

        <circle
          cx={centerX}
          cy={centerY}
          r="4"
          fill="#10191d"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1"
        />

        {tendencyData.flatMap((evidence) => {
          const labels = TENDENCY_ENDPOINTS[evidence.axis];
          return ([
            { key: labels[0], angle: TENDENCY_ANGLES[evidence.axis] + 180 },
            { key: labels[1], angle: TENDENCY_ANGLES[evidence.axis] },
          ] as const).map(({ key, angle }) => {
            const point = polarPoint(centerX, centerY, labelRadius, angle);
            const cosine = Math.cos((angle * Math.PI) / 180);
            const anchor =
              cosine > 0.25 ? "start" : cosine < -0.25 ? "end" : "middle";
            const active = evidence.axis === activeAxis;
            return (
              <text
                key={`${evidence.axis}-${key}`}
                x={point.x}
                y={point.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize="11.5"
                fontWeight={active ? 750 : 550}
                fill={active ? "#f4f0e8" : "rgba(218,225,228,0.67)"}
                className="pointer-events-none"
              >
                {tl(key)}
              </text>
            );
          });
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
