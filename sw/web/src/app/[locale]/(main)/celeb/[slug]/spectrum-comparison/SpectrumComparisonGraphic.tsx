"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import {
  ABILITY_KEYS,
  TENDENCY_KEYS,
  VIRTUE_KEYS,
  type StatKey,
} from "@/lib/spectrum/constants";
import type {
  SpectrumMatch,
  SpectrumMatchCategory,
  SpectrumMatchEvidence,
} from "@/lib/spectrum/utils";
import { cn } from "@/lib/utils";
import DispositionCompass from "./sections/DispositionCompass";
import RadarComparison from "./sections/RadarComparison";
import {
  CANDIDATE_COLOR,
  SUBJECT_COLOR,
  TENDENCY_ENDPOINTS,
  isTendencyAxis,
} from "./shared";

interface SpectrumComparisonGraphicProps {
  category: SpectrumMatchCategory;
  match: SpectrumMatch;
  subjectName: string;
  /** 한 줄 해석을 그림 아래에 붙일지. 옆 칸에 따로 놓을 때는 끈다 */
  showInsight?: boolean;
}

/**
 * 두 사람의 비교를 한 문장으로 읽어 준다.
 * 그림 아래에 붙이기도 하고 옆 칸으로 빼기도 하므로 계산만 따로 뽑았다.
 */
export function useMatchInsight({
  category,
  match,
  subjectName,
}: {
  category: SpectrumMatchCategory;
  match: SpectrumMatch;
  subjectName: string;
}): string {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.spectrum.stat");
  const tl = useTranslations("shared.spectrum.tendency_label");
  const candidateName = match.nickname;

  const rankedEvidence = match.evidence.length
    ? match.evidence
    : [...match.comparison]
        .sort((a, b) => {
          const aGap = Math.abs(
            category === "opposite"
              ? -a.targetValue - a.candidateValue
              : a.targetValue - a.candidateValue,
          );
          const bGap = Math.abs(
            category === "opposite"
              ? -b.targetValue - b.candidateValue
              : b.targetValue - b.candidateValue,
          );
          return aGap - bGap;
        })
        .slice(0, 2);

  const formatInsightAxis = (
    evidence: SpectrumMatchEvidence,
    useCandidate = false,
  ) => {
    if (!isTendencyAxis(evidence.axis)) return ts(evidence.axis as StatKey);
    const value = useCandidate
      ? evidence.candidateValue
      : evidence.targetValue;
    if (Math.abs(value) <= 10) return t("spectrumMatchModalNeutral");
    const endpoints = TENDENCY_ENDPOINTS[evidence.axis];
    return tl(value < 0 ? endpoints[0] : endpoints[1]);
  };
  const subjectAxes = rankedEvidence
    .slice(0, 2)
    .map((evidence) => formatInsightAxis(evidence))
    .join(" · ");
  const candidateAxes = rankedEvidence
    .slice(0, 2)
    .map((evidence) => formatInsightAxis(evidence, true))
    .join(" · ");

  switch (category) {
    case "overall":
      return t("spectrumMatchGraphicOverallInsight", { axes: subjectAxes });
    case "disposition":
      return t("spectrumMatchGraphicDispositionInsight", { axes: subjectAxes });
    case "virtue":
      return t("spectrumMatchGraphicVirtueInsight", { axes: subjectAxes });
    case "ability":
      return t("spectrumMatchGraphicAbilityInsight", {
        candidate: candidateName,
        subject: subjectName,
        axes: subjectAxes,
      });
    case "opposite":
      return t("spectrumMatchGraphicOppositeInsight", {
        subject: subjectName,
        candidate: candidateName,
        subjectAxes,
        candidateAxes,
      });
  }
}

/** 문장 안의 두 이름에 각자의 색을 입힌다 — 이 색이 그림의 범례를 대신한다 */
function colorizeNames(
  sentence: string,
  subjectName: string,
  candidateName: string,
): ReactNode[] {
  const names = [subjectName, candidateName].filter(
    (name) => name.trim().length > 0,
  );
  if (names.length === 0) return [sentence];

  const escaped = [...names]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  return sentence
    .split(new RegExp(`(${escaped.join("|")})`, "g"))
    .map((part, index) => {
      if (part === subjectName || part === candidateName) {
        return (
          <span
            key={index}
            className="font-bold"
            style={{
              color: part === subjectName ? SUBJECT_COLOR : CANDIDATE_COLOR,
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
}

/** 한 줄 해석 칸 — 그림 아래에도, 옆 칸에도 같은 모양으로 놓인다 */
export function MatchInsightNote({
  insight,
  subjectName,
  candidateName,
}: {
  insight: string;
  subjectName: string;
  candidateName: string;
}) {
  return (
    <div className="relative overflow-hidden border-l-2 border-accent/55 bg-white/[0.03] px-3.5 py-2.5">
      <p className="break-keep text-start text-sm font-medium leading-relaxed text-text-primary">
        {colorizeNames(insight, subjectName, candidateName)}
      </p>
    </div>
  );
}

export default function SpectrumComparisonGraphic({
  category,
  match,
  subjectName,
  showInsight = true,
}: SpectrumComparisonGraphicProps) {
  const t = useTranslations("celebPage");
  const candidateName = match.nickname;
  const insight = useMatchInsight({ category, match, subjectName });

  const comparisonByAxis = new Map(
    match.comparison.map((evidence) => [evidence.axis, evidence]),
  );
  const orderedStats = [...ABILITY_KEYS, ...VIRTUE_KEYS]
    .map((axis) => comparisonByAxis.get(axis))
    .filter((evidence): evidence is SpectrumMatchEvidence => Boolean(evidence));
  const orderedVirtues = VIRTUE_KEYS.map((axis) =>
    comparisonByAxis.get(axis),
  ).filter((evidence): evidence is SpectrumMatchEvidence => Boolean(evidence));
  const orderedAbilities = ABILITY_KEYS.map((axis) =>
    comparisonByAxis.get(axis),
  ).filter((evidence): evidence is SpectrumMatchEvidence => Boolean(evidence));
  const orderedTendencies = TENDENCY_KEYS.map((axis) =>
    comparisonByAxis.get(axis),
  ).filter((evidence): evidence is SpectrumMatchEvidence => Boolean(evidence));

  const rankedEvidence = match.evidence.length
    ? match.evidence
    : [...match.comparison]
        .sort((a, b) => {
          const aGap = Math.abs(
            category === "opposite"
              ? -a.targetValue - a.candidateValue
              : a.targetValue - a.candidateValue,
          );
          const bGap = Math.abs(
            category === "opposite"
              ? -b.targetValue - b.candidateValue
              : b.targetValue - b.candidateValue,
          );
          return aGap - bGap;
        })
        .slice(0, 2);

  const preferredAxis = rankedEvidence[0]?.axis;

  return (
    <div className="mt-3">
      <div
        className={cn(
          "grid gap-3",
          category === "overall" &&
            "md:grid-cols-[1.16fr_0.84fr] md:items-stretch",
        )}
      >
        {(category === "overall" ||
          category === "virtue" ||
          category === "ability") && (
          <RadarComparison
            data={
              category === "overall"
                ? orderedStats
                : category === "virtue"
                  ? orderedVirtues
                  : orderedAbilities
            }
            subjectName={subjectName}
            candidateName={candidateName}
            title={t(
              category === "overall"
                ? "spectrumMatchGraphicOverallRadar"
                : category === "virtue"
                  ? "spectrumMatchGraphicVirtueRadar"
                  : "spectrumMatchGraphicAbilityRadar",
            )}
            preferredAxis={preferredAxis}
          />
        )}

        {(category === "overall" ||
          category === "disposition" ||
          category === "opposite") && (
          <DispositionCompass
            data={orderedTendencies}
            subjectName={subjectName}
            candidateName={candidateName}
            title={t("spectrumMatchGraphicCompass")}
            preferredAxis={preferredAxis}
            opposite={category === "opposite"}
            twoColumn={category !== "overall"}
          />
        )}
      </div>

      {showInsight ? (
        <div className="mt-3">
          <MatchInsightNote
            insight={insight}
            subjectName={subjectName}
            candidateName={candidateName}
          />
        </div>
      ) : null}
    </div>
  );
}
