/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 종합 해설과 인물 지문 칩
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: spectrumJsonb(종합 해설)·highlights(지문)·population(모집단 수)
 * - 함께 보기: SpectrumPanels.tsx, SpectrumEvidence.tsx, SpectrumSectionMain.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useLocale, useTranslations } from "next-intl";

import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";
import { type StatKey, type TendencyKey } from "@/lib/spectrum/constants";
import { localizeSpectrumText } from "@/lib/spectrum/localizeText";
import type { SpectrumJsonb } from "@/lib/spectrum/types";
import { SectionHeader } from "./SpectrumPanels";
import {
  SpectrumEvidenceChip,
  TENDENCY_EVIDENCE_LABELS,
} from "./SpectrumEvidence";
import { getRationale } from "./spectrumUtils";

export function SpectrumHighlights({
  spectrumJsonb,
  highlights,
  population,
}: {
  spectrumJsonb: SpectrumJsonb | null;
  highlights: SimilarByCelebResult["highlights"];
  population: number;
}) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.spectrum.stat");
  const tl = useTranslations("shared.spectrum.tendency_label");
  const locale = useLocale();

  const rationale = localizeSpectrumText(
    getRationale(spectrumJsonb, locale),
    locale,
  );

  /* ── 1. 지문 항목 문구 — 능력·덕목은 상·하위, 성향은 치우친 쪽 라벨의 극단 백분위 ── */

  const formatHighlight = (
    highlight: SimilarByCelebResult["highlights"][number],
  ): string => {
    const tendencyLabelKeys =
      TENDENCY_EVIDENCE_LABELS[highlight.axis as TendencyKey];
    if (tendencyLabelKeys) {
      const [negativeKey, positiveKey] = tendencyLabelKeys;
      return t("spectrumHighlight_high", {
        axis: tl(highlight.direction === "high" ? positiveKey : negativeKey),
        percent: highlight.percentile,
      });
    }
    return t(
      highlight.direction === "high"
        ? "spectrumHighlight_high"
        : "spectrumHighlight_low",
      { axis: ts(highlight.axis as StatKey), percent: highlight.percentile },
    );
  };

  /* ── 2. 종합 해설과 인물 지문 ── */

  return (
    <>
      {/* 종합 해설 (rationale) */}
      {rationale && (
        <div className="space-y-3">
          <SectionHeader title={t("rationale")} />
          <p className="text-sm text-text-secondary leading-relaxed break-keep text-center px-4">
            {rationale}
          </p>
        </div>
      )}

      {/* 인물 지문 — 전체 인물 중 이 사람이 유별난 지점 */}
      {highlights.length > 0 && population > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-4">
          <span className="text-xs text-text-secondary">
            {t("spectrumHighlightAmong", { count: population })}
          </span>
          {highlights.map((highlight) => (
            <SpectrumEvidenceChip
              key={highlight.axis}
              axis={highlight.axis}
              value={highlight.value}
              label={formatHighlight(highlight)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
