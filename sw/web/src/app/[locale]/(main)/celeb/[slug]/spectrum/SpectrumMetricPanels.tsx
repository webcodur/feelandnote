/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 능력·성향·덕목 수치 패널 조립 훅
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: spectrum(수치)·spectrumJsonb(근거)·matchesByCategory(단추 노출 여부)·onOpenMatchGroups(비교 묶음 겹창 열기)
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
import type {
  SpectrumMatchCategory,
  SpectrumMatchGroups,
} from "@/lib/spectrum/utils";
import AbilityStatList from "../AbilityStatList";
import DispositionStatList from "../DispositionStatList";
import VirtueStatList from "../VirtueStatList";
import { MetricPanel, MatchGroupsButton } from "./SpectrumPanels";
import { getReasonFromJsonb } from "./spectrumUtils";

/* 분류 단추와 전체 유사 인물 단추를 한 줄에 나란히 둔다 */
function matchButtonRow(
  overallLabel: string,
  hasOverall: boolean,
  categories: SpectrumMatchCategory[],
  label: string,
  onOpenMatchGroups: (categories: SpectrumMatchCategory[]) => void,
) {
  const hasCategory = categories.length > 0;
  if (!hasCategory && !hasOverall) return null;
  return (
    <div className="mt-auto flex gap-2">
      {hasCategory ? (
        <MatchGroupsButton
          label={label}
          onClick={() => onOpenMatchGroups(categories)}
          className="min-w-0 flex-1"
        />
      ) : null}
      {hasOverall ? (
        <MatchGroupsButton
          label={overallLabel}
          onClick={() => onOpenMatchGroups(["overall"])}
          className="min-w-0 flex-1"
        />
      ) : null}
    </div>
  );
}

export function useSpectrumMetricPanels({
  spectrum,
  spectrumJsonb,
  matchesByCategory,
  onOpenMatchGroups,
}: {
  spectrum: NonNullable<SimilarByCelebResult["targetSpectrum"]>;
  spectrumJsonb: SpectrumJsonb | null;
  matchesByCategory: SpectrumMatchGroups;
  onOpenMatchGroups: (categories: SpectrumMatchCategory[]) => void;
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
  const dispositionCompareCategories = (
    ["disposition", "opposite"] as SpectrumMatchCategory[]
  ).filter((category) => matchesByCategory[category].length > 0);
  const hasOverall = matchesByCategory.overall.length > 0;
  const overallLabel = t("spectrumMatchButton_overall");

  /* ── 2. 능력 패널 ── */

  const abilityPanel = useMemo(
    () => (
      <MetricPanel
        tone="border-t-emerald-300/35"
      >
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
        {matchButtonRow(
          overallLabel,
          hasOverall,
          matchesByCategory.ability.length > 0 ? ["ability"] : [],
          t("spectrumMatchButton_ability"),
          onOpenMatchGroups,
        )}
      </div>
      </MetricPanel>
    ),
    [t, ts, isEn, spectrum, spectrumJsonb, locale, hasOverall, overallLabel, matchesByCategory.ability, onOpenMatchGroups],
  );

  /* ── 3. 성향 패널 ── */

  const dispositionPanel = useMemo(
    () => (
      <MetricPanel
        tone="border-t-blue-400/35"
      >
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
        {matchButtonRow(
          overallLabel,
          hasOverall,
          dispositionCompareCategories,
          t("spectrumMatchButton_disposition"),
          onOpenMatchGroups,
        )}
      </div>
      </MetricPanel>
    ),
    [t, isEn, spectrum, spectrumJsonb, locale, tendencyLabels, dispositionCompareCategories, hasOverall, overallLabel, onOpenMatchGroups],
  );

  /* ── 4. 덕목 패널 ── */

  const virtuePanel = useMemo(
    () => (
      <MetricPanel
        tone="border-t-amber-300/35"
      >
      <VirtueStatList
        innerTitle={t("innerVirtue")}
        outerTitle={t("outerVirtue")}
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
      {matchButtonRow(
        overallLabel,
        hasOverall,
        matchesByCategory.virtue.length > 0 ? ["virtue"] : [],
        t("spectrumMatchButton_virtue"),
        onOpenMatchGroups,
      )}
      </MetricPanel>
    ),
    [t, ts, spectrum, spectrumJsonb, locale, hasOverall, overallLabel, matchesByCategory.virtue, onOpenMatchGroups],
  );

  /* ── 5. 탭 넘김용 묶음 — 매 렌더 재생성하지 않는다 ── */

  const metricPanels = useMemo(
    () => [
      { key: "ability", label: t("ability"), node: abilityPanel },
      { key: "disposition", label: t("coreDisposition"), node: dispositionPanel },
      { key: "virtue", label: t("virtue"), node: virtuePanel },
    ],
    [t, abilityPanel, dispositionPanel, virtuePanel],
  );

  return {
    abilityPanel,
    dispositionPanel,
    virtuePanel,
    metricPanels,
  };
}
