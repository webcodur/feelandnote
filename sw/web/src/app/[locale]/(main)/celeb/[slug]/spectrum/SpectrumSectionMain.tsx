/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 능력·성향·덕목 수치와 설명·비교 겹창
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: spectrum(수치)·spectrumJsonb(근거)·matchesByCategory·highlights·population
 * - 함께 보기: SpectrumMetricPanels.tsx, SpectrumExplanationModal.tsx, SpectrumMatchGroupsModal.tsx, ../SpectrumMatchModal.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";
import type { InfluenceExplorerData } from "@/actions/home/getInfluenceExplorer";
import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import type { SpectrumJsonb } from "@/lib/spectrum/types";
import type {
  SpectrumMatch,
  SpectrumMatchCategory,
  SpectrumMatchGroups,
} from "@/lib/spectrum/utils";
import SpectrumMatchModal from "../SpectrumMatchModal";
import InfluenceComparisonButtons from "../InfluenceComparisonButtons";
import { useCelebPreview } from "../useCelebPreview";
import SpectrumExplanationModal, { type SpectrumExplanationMode } from "./SpectrumExplanationModal";
import { SpectrumMatchGroupsModal } from "./SpectrumMatchGroupsModal";
import { useSpectrumMetricPanels } from "./SpectrumMetricPanels";
import { ComparisonGroup, MatchGroupsButton, MetricHeading } from "./SpectrumPanels";

/* ── 1. 구획 props ── */

interface SpectrumSectionProps {
  spectrum: NonNullable<SimilarByCelebResult["targetSpectrum"]>;
  spectrumJsonb: SpectrumJsonb | null;
  matchesByCategory: SpectrumMatchGroups;
  highlights: SimilarByCelebResult["highlights"];
  population: number;
  influenceExplorerData?: InfluenceExplorerData | null;
}

export default function SpectrumSection({
  spectrum,
  spectrumJsonb,
  matchesByCategory,
  highlights,
  population,
  influenceExplorerData,
}: SpectrumSectionProps) {
  const t = useTranslations("celebPage");
  const [explanationMode, setExplanationMode] = useState<SpectrumExplanationMode | null>(null);
  const {
    celeb: previewCeleb,
    loadingId,
    openCelebPreview,
    closeCelebPreview,
  } = useCelebPreview("spectrum");
  const [matchGroupCategories, setMatchGroupCategories] = useState<
    SpectrumMatchCategory[] | null
  >(null);
  const [selectedMatch, setSelectedMatch] = useState<{
    category: SpectrumMatchCategory;
    match: SpectrumMatch;
  } | null>(null);

  const openSelectedMatchPerson = async () => {
    if (!selectedMatch) return;
    const nextCeleb = await openCelebPreview(selectedMatch.match.celeb_id);
    if (nextCeleb) setSelectedMatch(null);
  };

  /* ── 2. 수치 패널 조립 ── */

  const { metricPanels, explanationGroups } = useSpectrumMetricPanels({
    spectrum,
    spectrumJsonb,
  });
  const matchButtons: { key: SpectrumMatchCategory; label: string; categories: SpectrumMatchCategory[] }[] = [
    { key: "ability", label: t("spectrumMatchButton_ability"), categories: ["ability"] },
    { key: "virtue", label: t("spectrumMatchButton_virtue"), categories: ["virtue"] },
    { key: "disposition", label: t("spectrumMatchButton_disposition"), categories: ["disposition", "opposite"] },
    { key: "overall", label: t("spectrumMatchButton_overall"), categories: ["overall"] },
  ];
  const hasMatches = matchButtons.some((button) => button.categories.some((category) => matchesByCategory[category].length > 0));

  return (
    <div className="space-y-3">
      <div>
        <div className="grid gap-x-5 gap-y-4 lg:grid-cols-3">
          {metricPanels.map((panel) => (
            <div key={panel.key} className="min-w-0">
              <MetricHeading title={panel.label} ariaLabel={`${panel.label} · ${t("analysisExplanation")}`} onClick={() => setExplanationMode(panel.key)} />
              {panel.node}
            </div>
          ))}
        </div>
      </div>

      {(hasMatches || influenceExplorerData) && (
        <ComparisonGroup title={influenceExplorerData ? `${t("influenceComparison")} · ${t("spectrumComparison")}` : t("spectrumComparison")} columns={hasMatches ? (influenceExplorerData ? 6 : 4) : 2}>
          {influenceExplorerData && <InfluenceComparisonButtons data={influenceExplorerData} />}
          {hasMatches && matchButtons.map((button) => {
            const categories = button.categories.filter((category) => matchesByCategory[category].length > 0);
            return (
              <MatchGroupsButton
                key={button.key}
                label={button.label}
                disabled={categories.length === 0}
                onClick={() => setMatchGroupCategories(categories)}
                className="mt-0"
              />
            );
          })}
        </ComparisonGroup>
      )}

      <SpectrumExplanationModal mode={explanationMode} onModeChange={setExplanationMode} onClose={() => setExplanationMode(null)} groups={explanationGroups} spectrumJsonb={spectrumJsonb} highlights={highlights} population={population} />

      {/* ── 4. 비교 묶음·인물 상세 겹창 ── */}
      {matchGroupCategories ? (
        <SpectrumMatchGroupsModal
          categories={matchGroupCategories}
          subjectName={spectrum.nickname}
          matchesByCategory={matchesByCategory}
          suspended={selectedMatch !== null || previewCeleb !== null}
          onClose={() => setMatchGroupCategories(null)}
          onOpenMatch={(category, match) =>
            setSelectedMatch({ category, match })
          }
        />
      ) : null}

      {selectedMatch && (
        <SpectrumMatchModal
          key={selectedMatch.match.celeb_id}
          category={selectedMatch.category}
          match={selectedMatch.match}
          subjectName={spectrum.nickname}
          subjectAvatarUrl={spectrum.avatar_url}
          subjectSpectrumJsonb={spectrumJsonb}
          loading={loadingId === selectedMatch.match.celeb_id}
          onClose={() => setSelectedMatch(null)}
          onViewPerson={() => void openSelectedMatchPerson()}
        />
      )}

      {previewCeleb && (
        <CelebDetailModal
          celeb={previewCeleb}
          isOpen
          onClose={closeCelebPreview}
        />
      )}
    </div>
  );
}
