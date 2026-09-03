/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 스펙트럼 jsonb 근거·해설 읽기 유틸
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: spectrumJsonb(SpectrumJsonb | null)와 locale 문자열을 받아 문구 반환
 * - 함께 보기: SpectrumMetricPanels.tsx, SpectrumHighlights.tsx, SpectrumMatchModal.tsx
 * ───────────────────────────────────────────── */

import type { SpectrumJsonb, SpectrumField } from "@/lib/spectrum/types";

/* ── 1. 항목별 근거 읽기 ── */

export function getReasonFromJsonb(
  jsonb: SpectrumJsonb | null,
  group: "abilities" | "inner_virtues" | "outer_virtues" | "dispositions",
  key: string,
  locale: string,
): string | undefined {
  if (!jsonb) return undefined;
  const field = (jsonb[group] as Record<string, SpectrumField>)?.[key];
  if (!field) return undefined;
  return locale === "en" && field.reason_en ? field.reason_en : field.reason_ko;
}

/* ── 2. 종합 해설 읽기 ── */

export function getRationale(
  jsonb: SpectrumJsonb | null,
  locale: string,
): string | undefined {
  if (!jsonb) return undefined;
  return locale === "en" && jsonb.rationale_en
    ? jsonb.rationale_en
    : jsonb.rationale_ko;
}
