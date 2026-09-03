/* ─────────────────────────────────────────────
 * [celeb 상세] influence — 순위·1위 계산용 순수 헬퍼와 선택 타입
 * - 목차 위치: influence(분석 구획, i18n 키 profilePage.influence)
 * - 데이터: InfluenceExplorerPerson·InfluenceField를 받아 계산만 수행, 서버 호출 없음
 * - 함께 보기: InfluenceExplorerView.tsx, RankingSection.tsx, LeadersSection.tsx, PersonCardMetrics.tsx
 * ───────────────────────────────────────────── */

import {
  INFLUENCE_CATEGORY_FIELDS,
  INFLUENCE_FIELDS,
  INFLUENCE_MAX_SCORES,
  type InfluenceField,
} from "@feelandnote/influence-constants";

import type { InfluenceExplorerPerson } from "@/actions/home/getInfluenceExplorer";

/* ── 1. 컴팩트 표시 개수 ── */

/** 좁은 화면에서 한 줄에 담는 칸 수 — 넓은 화면은 각각 7칸·5칸을 그대로 쓴다 */
export const COMPACT_RANK_COUNT = 3;
export const COMPACT_LEADER_COUNT = 2;

/* ── 2. 미리보기 선택 타입 (원본 InfluenceExplorer.tsx에서 이동, 발명 아님) ── */

export type SelectionKind = "ranking" | "field";

export interface ExplorerSelection {
  kind: SelectionKind;
  people: InfluenceExplorerPerson[];
  index: number;
  field?: InfluenceField;
}

/* ── 3. 최강 도메인 판별 ── */

export function getStrongestDomain(
  person: InfluenceExplorerPerson,
): InfluenceField {
  return INFLUENCE_CATEGORY_FIELDS.reduce((strongest, field) =>
    person[field] > person[strongest] ? field : strongest,
  );
}

/* ── 4. 카드에 노출할 상위 지표 2개 ── */

export function getTopInfluenceFields(
  person: InfluenceExplorerPerson,
  preferredField?: InfluenceField,
): InfluenceField[] {
  return [...INFLUENCE_FIELDS]
    .sort((first, second) => {
      const ratioDifference =
        person[second] / INFLUENCE_MAX_SCORES[second]
        - person[first] / INFLUENCE_MAX_SCORES[first];
      if (ratioDifference !== 0) return ratioDifference;

      if (preferredField) {
        if (first === preferredField) return -1;
        if (second === preferredField) return 1;
      }

      const scoreDifference = person[second] - person[first];
      if (scoreDifference !== 0) return scoreDifference;
      return INFLUENCE_FIELDS.indexOf(first) - INFLUENCE_FIELDS.indexOf(second);
    })
    .slice(0, 2);
}
