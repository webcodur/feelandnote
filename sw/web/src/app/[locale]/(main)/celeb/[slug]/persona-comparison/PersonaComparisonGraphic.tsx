"use client";

import { useTranslations } from "next-intl";

import {
  ABILITY_KEYS,
  TENDENCY_KEYS,
  VIRTUE_KEYS,
  type StatKey,
} from "@/lib/persona/constants";
import type {
  PersonaMatch,
  PersonaMatchCategory,
  PersonaMatchEvidence,
} from "@/lib/persona/utils";
import { cn } from "@/lib/utils";
import DispositionCompass from "./sections/DispositionCompass";
import RadarComparison from "./sections/RadarComparison";
import {
  FigureLegend,
  TENDENCY_ENDPOINTS,
  isTendencyAxis,
} from "./shared";

interface PersonaComparisonGraphicProps {
  category: PersonaMatchCategory;
  match: PersonaMatch;
  subjectName: string;
}

export default function PersonaComparisonGraphic({
  category,
  match,
  subjectName,
}: PersonaComparisonGraphicProps) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.persona.stat");
  const tl = useTranslations("shared.persona.tendency_label");
  const candidateName = match.nickname;

  const comparisonByAxis = new Map(
    match.comparison.map((evidence) => [evidence.axis, evidence]),
  );
  const orderedStats = [...ABILITY_KEYS, ...VIRTUE_KEYS]
    .map((axis) => comparisonByAxis.get(axis))
    .filter((evidence): evidence is PersonaMatchEvidence => Boolean(evidence));
  const orderedVirtues = VIRTUE_KEYS.map((axis) =>
    comparisonByAxis.get(axis),
  ).filter((evidence): evidence is PersonaMatchEvidence => Boolean(evidence));
  const orderedAbilities = ABILITY_KEYS.map((axis) =>
    comparisonByAxis.get(axis),
  ).filter((evidence): evidence is PersonaMatchEvidence => Boolean(evidence));
  const orderedTendencies = TENDENCY_KEYS.map((axis) =>
    comparisonByAxis.get(axis),
  ).filter((evidence): evidence is PersonaMatchEvidence => Boolean(evidence));

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
  const formatInsightAxis = (
    evidence: PersonaMatchEvidence,
    useCandidate = false,
  ) => {
    if (!isTendencyAxis(evidence.axis)) return ts(evidence.axis as StatKey);
    const value = useCandidate
      ? evidence.candidateValue
      : evidence.targetValue;
    if (Math.abs(value) <= 10) return t("personaMatchModalNeutral");
    const endpoints = TENDENCY_ENDPOINTS[evidence.axis];
    return tl(value < 0 ? endpoints[0] : endpoints[1]);
  };
  const subjectAxes = rankedEvidence
    .slice(0, 2)
    .map((evidence) => formatInsightAxis(evidence))
    .join("·");
  const candidateAxes = rankedEvidence
    .slice(0, 2)
    .map((evidence) => formatInsightAxis(evidence, true))
    .join("·");

  const insight = (() => {
    switch (category) {
      case "overall":
        return t("personaMatchGraphicOverallInsight", { axes: subjectAxes });
      case "disposition":
        return t("personaMatchGraphicDispositionInsight", {
          axes: subjectAxes,
        });
      case "virtue":
        return t("personaMatchGraphicVirtueInsight", { axes: subjectAxes });
      case "ability":
        return t("personaMatchGraphicAbilityInsight", {
          candidate: candidateName,
          subject: subjectName,
          axes: subjectAxes,
        });
      case "opposite":
        return t("personaMatchGraphicOppositeInsight", {
          subject: subjectName,
          candidate: candidateName,
          subjectAxes,
          candidateAxes,
        });
    }
  })();

  return (
    <div className="mt-5">
      <FigureLegend subjectName={subjectName} candidateName={candidateName} />

      <div
        className={cn(
          "mt-2.5 grid gap-2.5",
          category === "overall" && "md:grid-cols-[1.16fr_0.84fr]",
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
                ? "personaMatchGraphicOverallRadar"
                : category === "virtue"
                  ? "personaMatchGraphicVirtueRadar"
                  : "personaMatchGraphicAbilityRadar",
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
            title={t("personaMatchGraphicCompass")}
            preferredAxis={preferredAxis}
            opposite={category === "opposite"}
          />
        )}
      </div>

      <div className="relative mt-3 overflow-hidden border-l-2 border-accent/45 bg-white/[0.022] px-3.5 py-3">
        <span className="block text-[8px] font-bold tracking-[0.16em] text-accent/70">
          {t("personaMatchGraphicInsightLabel")}
        </span>
        <p className="mt-1 text-balance break-keep text-[11px] font-medium leading-[1.7] text-text-primary/88">
          {insight}
        </p>
      </div>
    </div>
  );
}
