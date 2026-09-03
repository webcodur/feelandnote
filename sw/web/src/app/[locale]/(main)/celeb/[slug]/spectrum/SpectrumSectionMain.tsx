/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 스펙트럼 구획 조립(좁은/넓은 배치와 겹창 상태)
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: spectrum(수치)·spectrumJsonb(근거)·matchesByCategory·highlights·population
 * - 함께 보기: SpectrumMetricPanels.tsx, SpectrumHighlights.tsx, SpectrumMatchGroup.tsx, SpectrumMatchGroupsModal.tsx, ../SpectrumMatchModal.tsx
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
import { SpectrumMatchGroup } from "./SpectrumMatchGroup";
import { SpectrumMatchGroupsModal } from "./SpectrumMatchGroupsModal";
import { MobileMatchButton } from "./SpectrumPanels";
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
  const [mobileMatchCategories, setMobileMatchCategories] = useState<
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

  const {
    abilityPanel,
    dispositionPanel,
    virtuePanel,
    metricPanels,
    dispositionCompareCategories,
  } = useSpectrumMetricPanels({
    spectrum,
    spectrumJsonb,
    matchesByCategory,
    onOpenMobile: setMobileMatchCategories,
  });

  return (
    <div className="space-y-6">
      <SpectrumHighlights
        spectrumJsonb={spectrumJsonb}
        highlights={highlights}
        population={population}
      />

      {/* ── 3. 좁은 화면 — 능력·성향·덕목을 옆으로 넘겨본다 ── */}
      {/* 능력·성향·덕목 근거는 각 항목을 눌러 연다 */}
      <div className="md:hidden">
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

        {/* 어느 지표를 보고 있든 함께 뜬다 */}
        {matchesByCategory.overall.length > 0 ? (
          <div className="px-3">
            <MobileMatchButton
              label={t("spectrumMatchButton_overall")}
              onClick={() => setMobileMatchCategories(["overall"])}
            />
          </div>
        ) : null}
      </div>

      {/* ── 4. 넓은 화면 — 지표와 비교 인물을 나란히 ── */}
      <div className="hidden space-y-6 md:block">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
          {abilityPanel}
          {matchesByCategory.ability.length > 0 ? (
            <div className="hidden min-w-0 md:block">
              <SpectrumMatchGroup
                category="ability"
                subjectName={spectrum.nickname}
                matches={matchesByCategory.ability}
                onOpen={(match) =>
                  setSelectedMatch({ category: "ability", match })
                }
                className="h-full"
              />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch md:border-t md:border-white/5 md:pt-6">
          {dispositionPanel}
          {dispositionCompareCategories.length > 0 ? (
            <div className="hidden min-w-0 md:block">
              <Carousel
                labels={{
                  previous: t("carouselDispositionPrev"),
                  next: t("carouselDispositionNext"),
                  dot: (index, count) => t("carouselDot", { index, count }),
                }}
                arrowsAlign="top"
                showDots={false}
              >
                {dispositionCompareCategories.map((category) => (
                  <SpectrumMatchGroup
                    key={category}
                    category={category}
                    subjectName={spectrum.nickname}
                    matches={matchesByCategory[category]}
                    onOpen={(match) => setSelectedMatch({ category, match })}
                    className="h-full"
                  />
                ))}
              </Carousel>
            </div>
          ) : null}
        </div>

        {/* 내면·외적 덕목 */}
        <div className="grid grid-cols-1 gap-6 border-t border-white/5 pt-6 md:grid-cols-2 md:items-stretch">
          {virtuePanel}
          {matchesByCategory.virtue.length > 0 ? (
            <div className="hidden min-w-0 md:block">
              <SpectrumMatchGroup
                category="virtue"
                subjectName={spectrum.nickname}
                matches={matchesByCategory.virtue}
                onOpen={(match) =>
                  setSelectedMatch({ category: "virtue", match })
                }
                className="h-full"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* ── 5. 전체 유사 인물과 겹창 ── */}
      {/* 전체 스펙트럼 유사 인물 — 좁은 화면에서는 위 단추로 대신한다 */}
      {matchesByCategory.overall.length > 0 ? (
        <div className="hidden border-t border-white/5 pt-7 md:block">
          <SpectrumMatchGroup
            category="overall"
            subjectName={spectrum.nickname}
            matches={matchesByCategory.overall}
            onOpen={(match) => setSelectedMatch({ category: "overall", match })}
          />
        </div>
      ) : null}

      {mobileMatchCategories ? (
        <SpectrumMatchGroupsModal
          categories={mobileMatchCategories}
          subjectName={spectrum.nickname}
          matchesByCategory={matchesByCategory}
          suspended={selectedMatch !== null || previewCeleb !== null}
          onClose={() => setMobileMatchCategories(null)}
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
