/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 능력·성향·덕목 수치 패널 조립 훅
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: spectrum(수치)·spectrumJsonb(근거)
 * - 함께 보기: SpectrumPanels.tsx, spectrumUtils.ts, SpectrumSectionMain.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { SimilarByCelebResult } from "@/actions/spectrum/getSimilarByCelebId";
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  TENDENCY_KEYS,
} from "@/lib/spectrum/constants";
import { localizeSpectrumText } from "@/lib/spectrum/localizeText";
import type { SpectrumJsonb } from "@/lib/spectrum/types";
import AbilityStatList from "../AbilityStatList";
import DispositionStatList from "../DispositionStatList";
import VirtueStatList from "../VirtueStatList";
import { MetricPanel } from "./SpectrumPanels";
import { getReasonFromJsonb } from "./spectrumUtils";

export function useSpectrumMetricPanels({
  spectrum,
  spectrumJsonb,
}: {
  spectrum: NonNullable<SimilarByCelebResult["targetSpectrum"]>;
  spectrumJsonb: SpectrumJsonb | null;
}) {
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.spectrum.stat");
  const tl = useTranslations("shared.spectrum.tendency_label");
  const locale = useLocale();

  /* ── 1. 성향 양극 라벨 — 매 렌더 재생성하지 않는다 ── */

  const tendencyLabels: Record<string, [string, string]> = useMemo(
    () => ({
      pessimism_optimism: [tl("pessimism"), tl("optimism")],
      conservative_progressive: [tl("conservative"), tl("progressive")],
      individual_social: [tl("individual"), tl("social")],
      cautious_bold: [tl("cautious"), tl("bold")],
    }),
    [tl],
  );

  const isEn = locale === "en";

  /* ── 2. 능력 패널 ── */

  const abilityPanel = useMemo(
    () => (
      <MetricPanel>
      <div className="flex flex-1 flex-col gap-2">
        <AbilityStatList
          isEn={isEn}
          items={ABILITY_KEYS.map((key) => ({
            key,
            label: ts(key),
            value: spectrum[key],
            reason: localizeSpectrumText(
              getReasonFromJsonb(spectrumJsonb, "abilities", key, locale),
              locale,
            ),
          }))}
        />
      </div>
      </MetricPanel>
    ),
    [ts, isEn, spectrum, spectrumJsonb, locale],
  );

  /* ── 3. 성향 패널 ── */

  const dispositionPanel = useMemo(
    () => (
      <MetricPanel>
      <div className="flex flex-1 flex-col gap-2">
        <DispositionStatList
          isEn={isEn}
          items={TENDENCY_KEYS.map((key) => ({
            key,
            neg: tendencyLabels[key][0],
            pos: tendencyLabels[key][1],
            value: spectrum[key],
            reason: localizeSpectrumText(
              getReasonFromJsonb(spectrumJsonb, "dispositions", key, locale),
              locale,
            ),
          }))}
        />
      </div>
      </MetricPanel>
    ),
    [isEn, spectrum, spectrumJsonb, locale, tendencyLabels],
  );

  /* ── 4. 덕목 패널 ── */

  const virtuePanel = useMemo(
    () => (
      <MetricPanel>
      <VirtueStatList
        innerItems={INNER_VIRTUE_KEYS.map((key) => ({
          key,
          label: ts(key),
          value: spectrum[key],
          reason: localizeSpectrumText(
            getReasonFromJsonb(spectrumJsonb, "inner_virtues", key, locale),
            locale,
          ),
        }))}
        outerItems={OUTER_VIRTUE_KEYS.map((key) => ({
          key,
          label: ts(key),
          value: spectrum[key],
          reason: localizeSpectrumText(
            getReasonFromJsonb(spectrumJsonb, "outer_virtues", key, locale),
            locale,
          ),
        }))}
      />
      </MetricPanel>
    ),
    [ts, spectrum, spectrumJsonb, locale],
  );

  /* ── 5. 함께 표시할 수치 패널 ── */

  const metricPanels = useMemo(
    () => [
      { key: "ability", label: t("ability"), node: abilityPanel },
      { key: "disposition", label: t("coreDisposition"), node: dispositionPanel },
      { key: "virtue", label: t("virtue"), node: virtuePanel },
    ] as const,
    [t, abilityPanel, dispositionPanel, virtuePanel],
  );

  const explanationGroups = [
    { mode: "ability" as const, title: t("ability"), keys: ABILITY_KEYS, group: "abilities" as const, emptyLabel: t("abilityReasonEmpty") },
    { mode: "disposition" as const, title: t("coreDisposition"), keys: TENDENCY_KEYS, group: "dispositions" as const, emptyLabel: t("dispositionReasonEmpty") },
    { mode: "virtue" as const, title: t("innerVirtue"), keys: INNER_VIRTUE_KEYS, group: "inner_virtues" as const, emptyLabel: t("virtueReasonEmpty") },
    { mode: "virtue" as const, title: t("outerVirtue"), keys: OUTER_VIRTUE_KEYS, group: "outer_virtues" as const, emptyLabel: t("virtueReasonEmpty") },
  ].map(({ mode, title, keys, group, emptyLabel }) => ({
    mode,
    title,
    emptyLabel,
    items: keys.map((key) => ({
      key,
      label: key in tendencyLabels ? tendencyLabels[key].join(" / ") : ts(key),
      value: spectrum[key],
      reason: localizeSpectrumText(getReasonFromJsonb(spectrumJsonb, group, key, locale), locale),
    })),
  }));

  return {
    abilityPanel,
    dispositionPanel,
    virtuePanel,
    metricPanels,
    explanationGroups,
  };
}
