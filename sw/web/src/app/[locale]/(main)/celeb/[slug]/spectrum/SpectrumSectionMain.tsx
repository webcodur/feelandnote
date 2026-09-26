/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 스펙트럼 구획 조립(압축 탭 배치와 겹창 상태)
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: spectrum(수치)·spectrumJsonb(근거)·matchesByCategory·highlights·population
 * - 함께 보기: SpectrumMetricPanels.tsx, SpectrumHighlights.tsx, SpectrumMatchGroupsModal.tsx, ../SpectrumMatchModal.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";
import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import { Carousel } from "@/components/ui";
import type { SpectrumJsonb } from "@/lib/spectrum/types";
import type {
  SpectrumMatch,
  SpectrumMatchCategory,
  SpectrumMatchGroups,
} from "@/lib/spectrum/utils";
import SpectrumMatchModal from "../SpectrumMatchModal";
import { useCelebPreview } from "../useCelebPreview";
import { SpectrumHighlights } from "./SpectrumHighlights";
import { SpectrumMatchGroupsModal } from "./SpectrumMatchGroupsModal";
import { useSpectrumMetricPanels } from "./SpectrumMetricPanels";

/* ── 1. 구획 props ── */

interface SpectrumSectionProps {
  spectrum: NonNullable<SimilarByCelebResult["targetSpectrum"]>;
  spectrumJsonb: SpectrumJsonb | null;
  matchesByCategory: SpectrumMatchGroups;
  highlights: SimilarByCelebResult["highlights"];
  population: number;
}

export default function SpectrumSection({
  spectrum,
  spectrumJsonb,
  matchesByCategory,
  highlights,
  population,
}: SpectrumSectionProps) {
  const t = useTranslations("celebPage");
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

  const { metricPanels } = useSpectrumMetricPanels({
    spectrum,
    spectrumJsonb,
    matchesByCategory,
    onOpenMatchGroups: setMatchGroupCategories,
  });

  return (
    <div className="space-y-6">
      <SpectrumHighlights
        spectrumJsonb={spectrumJsonb}
        highlights={highlights}
        population={population}
      />

      {/* ── 3. 능력·성향·덕목 — 너비와 관계없이 탭으로 넘겨보는 압축 배치 ── */}
      {/* 근거는 각 항목을, 비교 인물(분류별·전체 유사)은 패널 아래 단추를 눌러 겹창으로 연다 */}
      <div className="mx-auto w-full max-w-xl">
        <Carousel
          isolateInactiveSlides
          fitActiveHeight
          arrowsAlign="tabs"
          labels={{
            previous: t("carouselMetricPrev"),
            next: t("carouselMetricNext"),
            dot: (index, count) => t("carouselDot", { index, count }),
          }}
          tabLabels={metricPanels.map((panel) => panel.label)}
        >
          {metricPanels.map((panel) => (
            <div key={panel.key}>{panel.node}</div>
          ))}
        </Carousel>
      </div>

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
