/* ─────────────────────────────────────────────
 * [celeb 상세] influence — 인물 카드 안 상위 지표 2개 + 총점
 * - 목차 위치: influence(분석 구획, i18n 키 profilePage.influence)
 * - 데이터: person(InfluenceExplorerPerson)·preferredField props만 받음
 * - 함께 보기: RankingSection.tsx, LeadersSection.tsx, influence-helpers.ts
 * ───────────────────────────────────────────── */

"use client";

import { useTranslations } from "next-intl";
import type { InfluenceField } from "@feelandnote/influence-constants";

import type { InfluenceExplorerPerson } from "@/actions/home/getInfluenceExplorer";

import { getTopInfluenceFields } from "./influence-helpers";

interface PersonCardMetricsProps {
  person: InfluenceExplorerPerson;
  preferredField?: InfluenceField;
}

/* ── 1. 상위 지표 2개 + 총점 ── */

export default function PersonCardMetrics({
  person,
  preferredField,
}: PersonCardMetricsProps) {
  const t = useTranslations("profilePage.influence");

  const shortFieldLabel = (field: InfluenceField) =>
    t(`explorer.shortFields.${field}`);

  const [firstField, secondField] = getTopInfluenceFields(
    person,
    preferredField,
  );

  return (
    <>
      <span className="flex flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[10px] font-semibold leading-tight text-text-secondary md:text-[11px]">
        <span>
          {t("explorer.fieldMetric", {
            field: shortFieldLabel(firstField),
            score: person[firstField],
          })}
        </span>
        <span>
          {t("explorer.fieldMetric", {
            field: shortFieldLabel(secondField),
            score: person[secondField],
          })}
        </span>
      </span>
      <span className="block font-mono text-[10px] font-bold leading-tight tabular-nums text-accent/90 md:text-[11px]">
        {t("explorer.totalScore", { score: person.total_score })}
      </span>
    </>
  );
}
