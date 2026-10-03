import { INFLUENCE_FIELDS, type InfluenceField } from "@feelandnote/influence-constants";

export const INFLUENCE_RANKING_FIELDS = ["total_score", ...INFLUENCE_FIELDS] as const;
export type InfluenceRankingField = "total_score" | InfluenceField;
export const INFLUENCE_RANKING_FIELD_ROWS = [
  ["total_score", "transhistoricity"],
  ["political", "strategic", "tech"],
  ["social", "economic", "cultural"],
] as const satisfies readonly (readonly InfluenceRankingField[])[];
export const INFLUENCE_RANKING_LIMIT = 10;
export const INFLUENCE_RANKING_ACCENT = "#d4af37";

export function resolveInfluenceRankingField(value?: string | string[]): InfluenceRankingField {
  const field = Array.isArray(value) ? value[0] : value;
  return INFLUENCE_RANKING_FIELDS.find((entry) => entry === field) ?? "total_score";
}

export function getInfluenceRankingHref(field: InfluenceRankingField): string {
  return field === "total_score" ? "/explore/influence" : `/explore/influence?field=${field}`;
}
